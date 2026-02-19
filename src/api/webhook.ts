import {
    IRead,
    IModify,
    IHttp,
    IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    ApiEndpoint,
    IApiEndpoint,
    IApiEndpointInfo,
    IApiExample,
    IApiRequest,
    IApiResponse,
} from "@rocket.chat/apps-engine/definition/api";
import { JiraApp } from "../../JiraApp";

export class WebhookEndPoint extends ApiEndpoint {
    path: string = "callback";
    constructor(public app: JiraApp) {
        super(app);
    }
    async get(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {
        const { state, code } = request.query;

        const user = await read.getUserReader().getById(state);

        const sdk = this.app.sdk;

        let token = await sdk.getAccessToken(
            read,
            code,
            user,
            modify,
            http,
            persis,
        );
        
        return {
            status: 200,
            content: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <title>Authorization Successful</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                    }
                    .card {
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                        text-align: center;
                        width: 400px;
                    }
                    h1 {
                        margin: 0;
                        color: #172B4D;
                    }
                    p {
                        margin-top: 10px;
                        color: #5E6C84;
                        font-size: 15px;
                    }
                    .icon {
                        margin-bottom: 20px;
                    }
                    .icon img {
                        width: 64px;
                        height: 64px;
                        object-fit: contain;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon"><img src="https://res.cloudinary.com/dvj3i9gog/image/upload/v1771524965/jira_mit3tt.png"></div>
                    <h1>Authorized Successfully</h1>
                    <p>You can now close this window and return to Rocket.Chat.</p>
                </div>
            </body>
            </html>
        `,
        };
    }
}
