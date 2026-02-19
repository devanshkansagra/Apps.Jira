import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { JiraApp } from "../../JiraApp";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { getCredentials } from "../helpers/getCredentials";
import { sendNotification } from "../helpers/message";
import { AuthPersistence } from "../persistance/authPersistence";
import { read } from "fs";

export class SDK {
    private readonly http: IHttp;
    private readonly app: JiraApp;
    public authPersistence: AuthPersistence;
    constructor(http: IHttp, app: JiraApp) {
        this.http = http;
        this.app = app;
        this.authPersistence = new AuthPersistence(app);
    }

    public async getAccessToken(
        read: IRead,
        code: string,
        user: IUser,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ) {
        const { clientId, clientSecret } = await getCredentials(read);

        const redirectURL =
            "http://localhost:3000/api/apps/public/cef7aa7a-c96a-4bcf-8752-2e50bd34e22f/callback";

        try {
            // 1️⃣ Exchange authorization code for access token
            const tokenResponse = await http.post(
                "https://auth.atlassian.com/oauth/token",
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    content: `grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectURL}`,
                },
            );

            if (!tokenResponse?.data?.access_token) {
                throw new Error("Failed to retrieve access token");
            }

            const { access_token, refresh_token, expires_in, scope } =
                tokenResponse.data;

            // // 2️⃣ Get Atlassian user info
            const userResponse = await http.get(
                "https://api.atlassian.com/me",
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        Accept: "application/json",
                    },
                },
            );

            // 3️⃣ Get accessible Jira sites (cloudId)
            const resourcesResponse = await http.get(
                "https://api.atlassian.com/oauth/token/accessible-resources",
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        Accept: "application/json",
                    },
                },
            );

            const resource = resourcesResponse.data?.[0];
            console.log(resource);

            // if (!resource) {
            //     throw new Error("No Jira cloud resource found for this user");
            // }

            // // 4️⃣ Structure final auth object
            const authData = {
                token: access_token,
                refreshToken: refresh_token,
                expiresAt: Date.now() + expires_in * 1000, // store real expiry timestamp
                scope,
                accountId: userResponse.data?.account_id,
                email: userResponse.data?.email,
                name: userResponse.data?.name,
                avatar: userResponse.data?.picture,
                cloudId: resource.id,
                siteUrl: resource.url,
                siteName: resource.name,
            };

            // 5️⃣ Persist everything
            await this.authPersistence.setAccessTokenForUser(
                authData,
                user,
                persis,
            );

            // 6️⃣ Send success notification
            const room = await read.getRoomReader().getById("GENERAL");

            if (room) {
                await sendNotification(
                    read,
                    modify,
                    user,
                    room,
                    "Jira login successful 🚀",
                );
            }

            return authData;
        } catch (error) {
            console.error("OAuth flow failed:", error);
            throw error;
        }
    }
    public async createJiraIssue({
        http,
        token,
        projectKey,
        issueType,
        summary,
        description,
        priority,
        assignee,
    }: {
        http: IHttp;
        token: any;
        projectKey: string;
        issueType: string;
        summary: string;
        description: string;
        priority: string;
        assignee?: string;
    }): Promise<{ success: boolean; issueKey?: string; error?: string }> {
        try {
            const cloudId = token?.cloudId;
            if (!cloudId) {
                return { success: false, error: "No cloudId found" };
            }

            const issueData: any = {
                fields: {
                    project: {
                        key: projectKey,
                    },
                    summary: summary,
                    description: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: description,
                                    },
                                ],
                            },
                        ],
                    },
                    issuetype: {
                        name: issueType,
                    },
                    assignee: {
                        name: token.account_id,
                    }
                },
            };
            

            const response = await http.post(
                `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
                {
                    headers: {
                        Authorization: `Bearer ${token?.token}`,
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    content: JSON.stringify(issueData),
                },
            );

            if (response?.data?.key) {
                return { success: true, issueKey: response.data.key };
            }

            return { success: false, error: "Failed to create issue" };
        } catch (error: any) {
            console.error("Error creating Jira issue:", error);
            return {
                success: false,
                error:
                    error?.data?.errorMessages?.[0] ||
                    error?.message ||
                    "Unknown error",
            };
        }
    }
}
