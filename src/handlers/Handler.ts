import {
    IRead,
    IHttp,
    IPersistence,
    IModify,
    IUIKitSurfaceViewParam,
} from "@rocket.chat/apps-engine/definition/accessors";
import { JiraApp } from "../../JiraApp";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { authorize } from "../oauth/auth";
import { CreateJiraEntityModal } from "../modals/create";
import { MyIssuesModal } from "../modals/myIssues";
import { SearchJiraModal } from "../modals/search";
import { AssignIssueModal } from "../modals/assign";
import { AuthPersistence } from "../persistance/authPersistence";
import { sendNotification } from "../helpers/message";

export class Handler {
    constructor(
        protected readonly app: JiraApp,
        protected readonly read: IRead,
        protected readonly http: IHttp,
        protected readonly persistence: IPersistence,
        protected readonly modify: IModify,
        protected readonly sender: IUser,
        protected readonly room: IRoom,
        protected readonly triggerId: string,
    ) {}

    public async login() {
        await authorize(
            this.app,
            this.read,
            this.modify,
            this.sender,
            this.room,
            this.persistence,
        );
    }

    public async create(): Promise<void> {
        const authPersistence = new AuthPersistence(this.app);
        const token = await authPersistence.getAccessTokenForUser(
            this.sender,
            this.read,
        );

        if (!token) {
            await sendNotification(
                this.read,
                this.modify,
                this.sender,
                this.room,
                "You are not logged in. Please login to Jira first using /jira login",
            );
            return;
        }

        const modal = await CreateJiraEntityModal({
            app: this.app,
            read: this.read,
            modify: this.modify,
            http: this.http,
            sender: this.sender,
            room: this.room,
            persis: this.persistence,
            triggerId: this.triggerId,
            id: this.app.getID(),
        });

        await this.modify.getUiController().openSurfaceView(
            modal as IUIKitSurfaceViewParam,
            {
                triggerId: this.triggerId,
            },
            this.sender,
        );
    }

    public async myIssues(): Promise<void> {
        const authPersistence = new AuthPersistence(this.app);
        const token = await authPersistence.getAccessTokenForUser(
            this.sender,
            this.read,
        );

        if (!token) {
            await sendNotification(
                this.read,
                this.modify,
                this.sender,
                this.room,
                "You are not logged in. Please login to Jira first using /jira login",
            );
            return;
        }

        const modal = await MyIssuesModal({
            app: this.app,
            read: this.read,
            modify: this.modify,
            http: this.http,
            sender: this.sender,
            room: this.room,
            persis: this.persistence,
            triggerId: this.triggerId,
            id: this.app.getID(),
        });

        await this.modify.getUiController().openSurfaceView(
            modal as IUIKitSurfaceViewParam,
            {
                triggerId: this.triggerId,
            },
            this.sender,
        );
    }

    public async search(args: string[]): Promise<void> {
        const authPersistence = new AuthPersistence(this.app);
        const token = await authPersistence.getAccessTokenForUser(
            this.sender,
            this.read,
        );

        if (!token) {
            await sendNotification(
                this.read,
                this.modify,
                this.sender,
                this.room,
                "You are not logged in. Please login to Jira first using /jira login",
            );
            return;
        }

        const modal = await SearchJiraModal({
            app: this.app,
            read: this.read,
            modify: this.modify,
            http: this.http,
            sender: this.sender,
            room: this.room,
            persis: this.persistence,
            triggerId: this.triggerId,
            id: this.app.getID(),
        });

        await this.modify.getUiController().openSurfaceView(
            modal as IUIKitSurfaceViewParam,
            {
                triggerId: this.triggerId,
            },
            this.sender,
        );
    }

    public async assign(args: string[]): Promise<void> {
        const authPersistence = new AuthPersistence(this.app);
        const token = await authPersistence.getAccessTokenForUser(
            this.sender,
            this.read,
        );
        if (args.length > 1) {
            const issueKey = args[0];
            const assignee = args[1];

            const isAssigned = await this.app.sdk.isIssueAssigned({
                http: this.http,
                token: token.token,
                issueKey: issueKey,
            });
            if (isAssigned.success === true && isAssigned.assignee !== null) {
                return await sendNotification(
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    `This issue is already assigned to ${isAssigned.assignee?.displayName}`,
                );
            } else if (isAssigned.success === false) {
                return await sendNotification(
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    `Issue Not found`,
                );
            }

            let accountId;
            let username;
            if (assignee === "me") {
                accountId = token.token.accountId;
            } else {
                // Remove @ prefix if present
                username = assignee.startsWith("@") ? assignee.substring(1) : assignee;
                
                // Try to find the RocketChat user
                const rcUser = await this.read.getUserReader().getByUsername(username);
                if (!rcUser) {
                    return await sendNotification(
                        this.read,
                        this.modify,
                        this.sender,
                        this.room,
                        `User "${username}" not found in Rocket.Chat`,
                    );
                }
                
                // Get user's email to search in Jira
                const userEmail = rcUser.emails?.[0]?.address;
                if (!userEmail) {
                    return await sendNotification(
                        this.read,
                        this.modify,
                        this.sender,
                        this.room,
                        `No email found for user "${username}" in Rocket.Chat`,
                    );
                }
                
                // Search for the user in Jira by email
                const userSearchResult = await this.app.sdk.searchJiraUser({
                    http: this.http,
                    token: token.token,
                    query: userEmail,
                });
                
                if (!userSearchResult.success || !userSearchResult.accountId) {
                    return await sendNotification(
                        this.read,
                        this.modify,
                        this.sender,
                        this.room,
                        `User "${username}" not found in Jira. Please check the email address.`,
                    );
                }
                
                accountId = userSearchResult.accountId;
            }

            const assignIssue = await this.app.sdk.assignIssueToUser({
                http: this.http,
                token: token.token,
                issueKey: issueKey,
                accountId: accountId,
            });
            if (assignIssue&& !username) {
                return await sendNotification(
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    `Issue is assigned to you`,
                );
            }
            else {
                return await sendNotification(
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    `Issue is assigned to ${username}`,
                );
            }
        } else {
            if (!token) {
                await sendNotification(
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    "You are not logged in. Please login to Jira first using /jira login",
                );
                return;
            }

            const modal = await AssignIssueModal({
                app: this.app,
                read: this.read,
                modify: this.modify,
                http: this.http,
                sender: this.sender,
                room: this.room,
                persis: this.persistence,
                triggerId: this.triggerId,
                id: this.app.getID(),
            });

            // Only open the modal if it has valid blocks
            if (modal && modal.blocks && modal.blocks.length > 0) {
                await this.modify.getUiController().openSurfaceView(
                    modal as IUIKitSurfaceViewParam,
                    {
                        triggerId: this.triggerId,
                    },
                    this.sender,
                );
            }
        }
    }
}
