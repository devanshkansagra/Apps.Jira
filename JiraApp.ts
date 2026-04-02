import {
    IAppAccessors,
    IAppInstallationContext,
    IAppUpdateContext,
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
import { CallbackEndpoint } from "./src/api/callback";
import {
    ApiVisibility,
    ApiSecurity,
} from "@rocket.chat/apps-engine/definition/api";
import {
    UIKitBlockInteractionContext,
    IUIKitResponse,
    UIKitViewSubmitInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { ExecuteBlockActionHandler } from "./src/handlers/ExecuteBlockActionHandler";
import { SDK } from "./src/core/sdk";
import { ExecuteViewSubmitHandler } from "./src/handlers/ExecuteViewSubmitHandler";
import { WebhookEndpoint } from "./src/api/webhook";
import { IJobContext } from "@rocket.chat/apps-engine/definition/scheduler";
import { sendDM } from "./src/helpers/message";
import { IssuePersistence } from "./src/persistance/issuePersistence";
import { IJiraIssue } from "./src/interfaces/IJiraIssue";
import { getCloudURL } from "./src/helpers/getSettings";

export class JiraApp extends App {
    public sdk: SDK;
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async onInstall(
        context: IAppInstallationContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<void> {
        await modify.getScheduler().scheduleRecurring({
            id: "fetch-overdue-issues",
            interval: "0 9 * * *",
        });
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
            endpoints: [new CallbackEndpoint(this)],
        });
        await configurationExtend.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [new WebhookEndpoint(this)],
        });

        this.sdk = new SDK(this.getAccessors().http, this);

        configurationExtend.scheduler.registerProcessors([
            {
                id: "jira-issue-reminder",
                processor: async function (
                    jobContext: IJobContext,
                    read: IRead,
                    modify: IModify,
                    http: IHttp,
                    persis: IPersistence,
                ) {
                    const { username, issueKey } = jobContext;

                    const user = await read
                        .getUserReader()
                        .getByUsername(username);
                    const message = `⏰ *Deadline Reminder*\n\nHey @${username}, the deadline for issue *${issueKey}* is tomorrow. Please make sure to complete it on time!`;
                    await sendDM(read, modify, user, message);
                },
            },
            {
                id: "jira-refresh-access-token",
                processor: async (
                    jobContext: IJobContext,
                    read: IRead,
                    modify: IModify,
                    http: IHttp,
                    persis: IPersistence,
                ) => {
                    const { userId, refresh_token } = jobContext;

                    const data = {
                        userId,
                        refresh_token,
                    };
                    await this.sdk.refreshAccessToken(
                        read,
                        modify,
                        data,
                        persis,
                    );
                },
            },
            {
                id: "fetch-overdue-issues",
                processor: async (
                    jobContext: IJobContext,
                    read: IRead,
                    modify: IModify,
                    http: IHttp,
                    persis: IPersistence,
                ) => {
                    const issuePersistence = new IssuePersistence(
                        persis,
                        read.getPersistenceReader(),
                    );
                    const issues =
                        (await issuePersistence.fetchIssueData()) as IJiraIssue[];

                    const now = new Date();
                    const overDuedIssues = issues.filter(
                        (issue) =>
                            now > new Date(issue.deadline as Date) &&
                            issue.status !== "Done",
                    );

                    const groupedByUser = overDuedIssues.reduce(
                        (acc, issue) => {
                            const userId = issue.assignee?.id;

                            if (!userId) return acc;

                            if (!acc[userId]) {
                                acc[userId] = [];
                            }

                            acc[userId].push(issue);

                            return acc;
                        },
                        {} as Record<string, IJiraIssue[]>,
                    );

                    const cloudUrl = await getCloudURL(read);
                    for (const userId in groupedByUser) {
                        const issues = groupedByUser[userId];
                        const user = await read.getUserReader().getById(userId);
                        const issueList = issues
                            .map(
                                (issue) =>
                                    `• ${issue.issueId} (${issue.priority})
                                    🔗 ${cloudUrl}/browse/${issue.issueId}`,
                            )
                            .join("\n");

                        const message = `
                        ⚠️ Overdue Issues Reminder

                        Hi ${user.name},
                        You have ${issues.length} overdue issue(s):

                        ${issueList}
                        `;

                        await sendDM(read, modify, user, message);
                    }
                },
            },
        ]);
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

    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<void | IUIKitResponse> {
        const handler = new ExecuteViewSubmitHandler(
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
