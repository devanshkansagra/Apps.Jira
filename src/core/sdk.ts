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

        const room = (await read.getRoomReader().getById("GENERAL")) as IRoom;

        const response = await http.post(
            "https://auth.atlassian.com/oauth/token",
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                content: `code=${code}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectURL}&grant_type=authorization_code`,
            },
        );

        let accessToken: any = {};
        if (response) {
            accessToken = {
                expiresAt: response.data?.expires_in,
                token: response.data?.access_token,
                refreshToken: response.data?.refresh_token,
                scope: response.data?.scope,
            };

            await sendNotification(
                read,
                modify,
                user,
                room,
                "Login successful 🚀",
            );

            await this.authPersistence.setAccessTokenForUser(
                accessToken,
                user,
                persis,
            );
        }

        return accessToken;
    }
}
