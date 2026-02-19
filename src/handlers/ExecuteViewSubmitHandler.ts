import {
    IRead,
    IHttp,
    IPersistence,
    IModify,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    IUIKitResponse,
    UIKitViewSubmitInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { JiraApp } from "../../JiraApp";
import { ElementEnum } from "../enums/ElementEnum";
import { AuthPersistence } from "../persistance/authPersistence";
import { sendMessage, sendNotification } from "../helpers/message";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";

export class ExecuteViewSubmitHandler {
    private context: UIKitViewSubmitInteractionContext;

    constructor(
        protected readonly app: JiraApp,
        context: UIKitViewSubmitInteractionContext,
        protected readonly read: IRead,
        protected readonly http: IHttp,
        protected readonly persistence: IPersistence,
        protected readonly modify: IModify,
    ) {
        this.context = context;
    }

    public async execute(): Promise<IUIKitResponse> {
        const { view, user, room } = this.context.getInteractionData();

        // Extract form variables from the modal
        const project =
            view.state?.[ElementEnum.JIRA_PROJECT_BLOCK]?.[
                ElementEnum.JIRA_PROJECT_ACTION
            ];
        const issueType =
            view.state?.[ElementEnum.JIRA_ISSUE_TYPE_BLOCK]?.[
                ElementEnum.JIRA_ISSUE_TYPE_ACTION
            ];
        const summary =
            view.state?.[ElementEnum.JIRA_SUMMARY_BLOCK]?.[
                ElementEnum.JIRA_SUMMARY_ACTION
            ];
        const description =
            view.state?.[ElementEnum.JIRA_DESCRIPTION_BLOCK]?.[
                ElementEnum.JIRA_DESCRIPTION_ACTION
            ];
        const priority =
            view.state?.[ElementEnum.JIRA_PRIORITY_BLOCK]?.[
                ElementEnum.JIRA_PRIORITY_ACTION
            ];
        const assignee =
            view.state?.[ElementEnum.JIRA_ASSIGNEE_BLOCK]?.[
                ElementEnum.JIRA_ASSIGNEE_ACTION
            ];

        const authPersistence = new AuthPersistence(this.app);
        const token = await authPersistence.getAccessTokenForUser(
            user,
            this.read,
        );
        const sdk = this.app.sdk;

        switch (view.id) {
            case ElementEnum.JIRA_CREATE_MODAL: {
                const res = await sdk.createJiraIssue({
                    http: this.http,
                    token: token.token,
                    projectKey: project,
                    issueType,
                    summary,
                    description,
                    priority,
                    assignee,
                });

                // Get the room from interaction data
                const room = (await this.read
                    .getRoomReader()
                    .getById("GENERAL")) as IRoom;

                // Send notification after issue creation
                if (res.success && res.issueKey) {
                    await sendMessage(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        `✅ Jira issue *${res.issueKey}* created successfully!\n\n📋 Summary: ${summary}\n🏷️ Type: ${issueType}\n📁 Project: ${project}`,
                    );
                } else {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        `❌ Failed to create Jira issue: ${res.error}`,
                    );
                }
            }
        }
        return { success: true };
    }
}
