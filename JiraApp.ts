import {
    IAppAccessors,
    IConfigurationExtend,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import { JiraCommand } from "./src/commands/JiraCommand";
import { settings } from "./src/settings/settings";
import { WebhookEndPoint } from "./src/api/webhook";
import { ApiVisibility, ApiSecurity } from "@rocket.chat/apps-engine/definition/api";
import { UIKitBlockInteractionContext, IUIKitResponse } from "@rocket.chat/apps-engine/definition/uikit";
import { ExecuteBlockActionHandler } from "./src/handlers/ExecuteBlockActionHandler";
import { SDK } from "./src/core/sdk";

export class JiraApp extends App {
    public sdk: SDK;
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async initialize(
        configurationExtend: IConfigurationExtend,
        environmentRead: IEnvironmentRead,
    ): Promise<void> {
        await configurationExtend.slashCommands.provideSlashCommand(
            new JiraCommand(this),
        );

        await Promise.all(
            settings.map((setting) => {
                configurationExtend.settings.provideSetting(setting);
            }),
        );

        await configurationExtend.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [new WebhookEndPoint(this)],
        });

        this.sdk = new SDK(this.getAccessors().http, this);
    }

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<IUIKitResponse | void> {
        const handler = new ExecuteBlockActionHandler(
            this,
            context,
            read,
            http,
            persistence,
            modify,
        );

        return await handler.execute();
    }
}
