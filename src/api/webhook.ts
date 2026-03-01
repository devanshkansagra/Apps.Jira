import {
    ApiEndpoint,
    IApiEndpointInfo,
    IApiRequest,
    IApiResponse,
} from "@rocket.chat/apps-engine/definition/api";
import { JiraApp } from "../../JiraApp";
import {
    IRead,
    IModify,
    IHttp,
    IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";
import { EventHandler } from "../handlers/EventHandler";
import { IWebhookPayload } from "../interfaces/IWebhook";

export class WebhookEndpoint extends ApiEndpoint {
    path: string = "webhook";
    public app: JiraApp;
    constructor(app: JiraApp) {
        super(app);
    }

    async post(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {
        const payload = request.content as IWebhookPayload;

        const eventHandler = new EventHandler(
            this.app,
            read,
            http,
            persis,
            modify,
        );

        const event = payload.webhookEvent;
        try {

            if(event === "jira:issue_updated") {
                await eventHandler.handleIssueUpdateEvent(payload);
            }
        } catch (error) {
            console.error("Error processing webhook event:", error);
            return { status: 500 };
        }

        return { status: 200 };
    }
}
