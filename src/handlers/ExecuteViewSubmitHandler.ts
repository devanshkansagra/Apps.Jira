import {
    IRead,
    IHttp,
    IPersistence,
    IModify,
    IUIKitSurfaceViewParam,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    IUIKitModalResponse,
    IUIKitResponse,
    UIKitViewSubmitInteractionContext,
    UIKitInteractionType,
} from "@rocket.chat/apps-engine/definition/uikit";
import { JiraApp } from "../../JiraApp";
import { ElementEnum } from "../enums/ElementEnum";
import { ModalEnum } from "../enums/ModalEnum";
import { AuthPersistence } from "../persistance/authPersistence";
import { sendMessage, sendNotification } from "../helpers/message";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { SearchResultsModal } from "../modals/searchResults";

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

    public async execute(): Promise<IUIKitResponse | IUIKitModalResponse> {
        const { view, user, room } = this.context.getInteractionData();

        const authPersistence = new AuthPersistence(this.app);
        const token = await authPersistence.getAccessTokenForUser(
            user,
            this.read,
        );
        const sdk = this.app.sdk;
        // Extract form variables from the modal

        switch (view.id) {
            case ModalEnum.JIRA_CREATE_MODAL: {
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
                const deadline =
                    view.state?.[ElementEnum.JIRA_DEADLINE_BLOCK]?.[
                        ElementEnum.JIRA_DEADLINE_ACTION
                    ];

                // If assignee is provided, search for their Jira accountId
                let jiraAccountId: string = "";
                if (assignee) {
                    const assignedUser = (
                        await this.read.getUserReader().getByUsername(assignee)
                    ).emails[0];
                    const userSearchResult = await sdk.searchJiraUser({
                        http: this.http,
                        token: token.token,
                        query: assignedUser.address,
                    });
                    if (
                        userSearchResult.success &&
                        userSearchResult.accountId
                    ) {
                        jiraAccountId = userSearchResult.accountId;
                    } else {
                        // User not found in Jira, send notification and return
                        const room = (await this.read
                            .getRoomReader()
                            .getById("GENERAL")) as IRoom;
                        await sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room as IRoom,
                            `❌ Could not find user "${assignee}" in Jira. Please check the username or email.`,
                        );
                        return { success: false };
                    }
                }
                const res = await sdk.createJiraIssue({
                    http: this.http,
                    token: token.token,
                    projectKey: project,
                    issueType,
                    summary,
                    description,
                    priority,
                    assignee: jiraAccountId,
                    deadline,
                });

                // Get the room from interaction data
                const room = (await this.read
                    .getRoomReader()
                    .getById("GENERAL")) as IRoom;

                // Send notification after issue creation
                if (res.success && res.issueKey) {
                    let message = `✅ Jira issue *${res.issueKey}* created successfully!\n\n📋 Summary: ${summary}\n🏷️ Type: ${issueType}\n📁 Project: ${project}`;
                    if (deadline) {
                        message += `\n⏰ Deadline: ${deadline}`;
                    }
                    await sendMessage(
                        this.read,
                        this.modify,
                        room as IRoom,
                        user,
                        message,
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
                break;
            }
            case ModalEnum.JIRA_SEARCH_MODAL: {
                const projectKey =
                    view.state?.[ElementEnum.JIRA_SEARCH_PROJECT_BLOCK]?.[
                        ElementEnum.JIRA_SEARCH_PROJECT_ACTION
                    ];
                const status =
                    view.state?.[ElementEnum.JIRA_SEARCH_STATUS_BLOCK]?.[
                        ElementEnum.JIRA_SEARCH_STATUS_ACTION
                    ];
                const issueType =
                    view.state?.[ElementEnum.JIRA_SEARCH_ISSUE_TYPE_BLOCK]?.[
                        ElementEnum.JIRA_SEARCH_ISSUE_TYPE_ACTION
                    ];
                const priority =
                    view.state?.[ElementEnum.JIRA_SEARCH_PRIORITY_BLOCK]?.[
                        ElementEnum.JIRA_SEARCH_PRIORITY_ACTION
                    ];
                const assignee =
                    view.state?.[ElementEnum.JIRA_SEARCH_ASSIGNEE_BLOCK]?.[
                        ElementEnum.JIRA_SEARCH_ASSIGNEE_ACTION
                    ];

                // Open the search results modal
                const searchResultsModal = await SearchResultsModal({
                    app: this.app,
                    read: this.read,
                    modify: this.modify,
                    http: this.http,
                    sender: user,
                    room: room,
                    persis: this.persistence,
                    triggerId: this.context.getInteractionData().triggerId,
                    id: this.app.getID(),
                    projectKey,
                    status: status || undefined,
                    issueType: issueType || undefined,
                    priority: priority || undefined,
                    assignee: assignee || undefined,
                });

                const triggerId = this.context.getInteractionData().triggerId;
                await this.modify.getUiController().openSurfaceView(
                    searchResultsModal as IUIKitSurfaceViewParam,
                    {
                        triggerId,
                    },
                    user,
                );

                return {
                    success: true,
                    type: UIKitInteractionType.MODAL_UPDATE,
                    triggerId: triggerId || "",
                    appId: this.app.getID(),
                    view: searchResultsModal as IUIKitSurfaceViewParam,
                } as IUIKitModalResponse;
            }
            case ModalEnum.JIRA_ASSIGN_MODAL: {
                const issueKey =
                    view.state?.[ElementEnum.JIRA_ASSIGN_ISSUE_BLOCK]?.[
                        ElementEnum.JIRA_ASSIGN_ISSUE_ACTION
                    ];
                const assignee =
                    view.state?.[ElementEnum.JIRA_ASSIGN_USER_BLOCK]?.[
                        ElementEnum.JIRA_ASSIGN_USER_ACTION
                    ];

                if (!issueKey || !assignee) {
                    const room = (await this.read
                        .getRoomReader()
                        .getById("GENERAL")) as IRoom;
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        "❌ Please select both an issue and an assignee.",
                    );
                    return { success: false };
                }

                // Get the RocketChat user to search in Jira
                const rcUser = await this.read
                    .getUserReader()
                    .getByUsername(assignee);
                if (!rcUser) {
                    const room = (await this.read
                        .getRoomReader()
                        .getById("GENERAL")) as IRoom;
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        `User "${assignee}" not found in Rocket.Chat`,
                    );
                    return { success: false };
                }

                // Get user's email to search in Jira
                const userEmail = rcUser.emails?.[0]?.address;
                if (!userEmail) {
                    const room = (await this.read
                        .getRoomReader()
                        .getById("GENERAL")) as IRoom;
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        `No email found for user "${assignee}" in Rocket.Chat`,
                    );
                    return { success: false };
                }

                // Search for the Jira accountId
                const userSearchResult = await sdk.searchJiraUser({
                    http: this.http,
                    token: token.token,
                    query: userEmail,
                });

                if (!userSearchResult.success || !userSearchResult.accountId) {
                    const room = (await this.read
                        .getRoomReader()
                        .getById("GENERAL")) as IRoom;
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        `❌ Could not find user "${assignee}" in Jira. Please check the username or email.`,
                    );
                    return { success: false };
                }

                // Assign the issue to the user
                const assignResult = await sdk.assignIssueToUser({
                    http: this.http,
                    token: token.token,
                    issueKey,
                    accountId: userSearchResult.accountId,
                });

                const room = (await this.read
                    .getRoomReader()
                    .getById("GENERAL")) as IRoom;

                if (assignResult.success) {
                    await sendMessage(
                        this.read,
                        this.modify,
                        room as IRoom,
                        user,
                        `✅ Issue *${issueKey}* has been assigned to *${assignee}* successfully!`,
                    );
                } else {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        `❌ Failed to assign issue: ${assignResult.error}`,
                    );
                }
                break;
            }

            case ModalEnum.JIRA_ADD_COMMENT_MODAL: {
                const comment =
                    view.state?.[ElementEnum.JIRA_ADD_COMMENT_BLOCK]?.[
                        ElementEnum.JIRA_ADD_COMMENT_ACTION
                    ];

                const room = (await this.read
                    .getRoomReader()
                    .getById("GENERAL")) as IRoom;
                if (!comment) {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        "Please enter a comment.",
                    );
                    break;
                }

                // Get the issue key from the hidden input field
                const issueKey =
                    view.state?.["jira-add-comment-issue-key-block"]?.[
                        "jira-add-comment-issue-key"
                    ];

                if (!issueKey) {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        "Invalid issue key. Please try again.",
                    );
                    break;
                }

                // Add the comment to the Jira issue
                const commentResult = await sdk.addComment({
                    http: this.http,
                    token: token.token,
                    issueKey,
                    comment,
                });

                if (commentResult.success) {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        `✅ Comment added successfully to issue *${issueKey}*!`,
                    );
                } else {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        `❌ Failed to add comment: ${commentResult.error}`,
                    );
                }
                break;
            }
        }
        return { success: true };
    }
}
