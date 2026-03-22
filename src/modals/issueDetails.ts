import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
    IUIKitSurfaceViewParam,
} from "@rocket.chat/apps-engine/definition/accessors";
import { UIKitSurfaceType } from "@rocket.chat/apps-engine/definition/uikit";
import { LayoutBlock } from "@rocket.chat/ui-kit";
import { TextTypes } from "../enums/TextTypes";
import { ElementEnum } from "../enums/ElementEnum";
import { ModalEnum } from "../enums/ModalEnum";
import { JiraApp } from "../../JiraApp";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { sendNotification } from "../helpers/message";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { AuthPersistence } from "../persistance/userPersistence";
import { SDK } from "../core/sdk";

export async function IssueDetailsModal({
    app,
    read,
    modify,
    http,
    sender,
    room,
    persis,
    triggerId,
    id,
    issueKey,
}: {
    app: JiraApp;
    read: IRead;
    modify: IModify;
    http: IHttp;
    sender: IUser;
    room: IRoom | undefined;
    persis: IPersistence;
    triggerId: string | undefined;
    id: string;
    issueKey: string;
}): Promise<IUIKitSurfaceViewParam> {
    let blocks: LayoutBlock[] = [];
    const authPersistence = new AuthPersistence(app);
    const token = await authPersistence.getAccessTokenForUser(sender, read);
    
    if (!token) {
        await sendNotification(
            read,
            modify,
            sender,
            room as IRoom,
            "You are not logged in. Please login to Jira first.",
        );
        return {} as IUIKitSurfaceViewParam;
    }

    const sdk = new SDK(http, app);
    const result = await sdk.getIssue({
        http,
        token: token.token,
        issueKey,
    });

    const commentsResult = await sdk.getComments({
        http,
        token: token.token,
        issueKey,
    });

    if (!result.success || !result.issue) {
        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `❌ *Error: ${result.error || "Failed to fetch issue details"}*`,
            },
        });
    } else {
        const issue = result.issue;
        const fields = issue.fields;
        
        const projectKey = fields?.project?.key || "";
        const projectName = fields?.project?.name || "";
        const summary = fields?.summary || "No summary";
        const description = fields?.description?.content?.[0]?.content?.[0]?.text || 
                          fields?.description || "No description";
        const assignee = fields?.assignee?.displayName || "Unassigned";
        const assigneeAvatar = fields?.assignee?.avatarUrls?.["48x48"] || "";
        const priority = fields?.priority?.name || "None";
        const status = fields?.status?.name || "Unknown";
        const issueType = fields?.issuetype?.name || "Task";
        const issueTypeIcon = fields?.issuetype?.iconUrl || "";
        const created = fields?.created || "";
        const updated = fields?.updated || "";

        let statusEmoji = "🔵";
        if (status.toLowerCase() === "done" || status.toLowerCase() === "closed") {
            statusEmoji = "✅";
        } else if (status.toLowerCase() === "in progress") {
            statusEmoji = "🔄";
        } else if (status.toLowerCase() === "to do" || status.toLowerCase() === "open") {
            statusEmoji = "📋";
        }

        let priorityEmoji = "⚪";
        if (priority.toLowerCase() === "highest" || priority.toLowerCase() === "high") {
            priorityEmoji = "🔴";
        } else if (priority.toLowerCase() === "medium") {
            priorityEmoji = "🟡";
        } else if (priority.toLowerCase() === "low" || priority.toLowerCase() === "lowest") {
            priorityEmoji = "🟢";
        }

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*${issueKey}* - ${summary}`,
            },
        });

        blocks.push({
            type: "divider",
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*📁 Project*: ${projectName} (${projectKey})`,
            },
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*🔑 Issue Key*: ${issueKey}`,
            },
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*${statusEmoji} Status*: ${status}`,
            },
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*📝 Type*: ${issueType}`,
            },
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*${priorityEmoji} Priority*: ${priority}`,
            },
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*👤 Assignee*: ${assignee}`,
            },
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*📄 Description*: ${description}`,
            },
        });

        if (created) {
            const createdDate = new Date(created).toLocaleDateString();
            blocks.push({
                type: "section",
                text: {
                    type: TextTypes.MARKDOWN,
                    text: `*📅 Created*: ${createdDate}`,
                },
            });
        }

        if (updated) {
            const updatedDate = new Date(updated).toLocaleDateString();
            blocks.push({
                type: "section",
                text: {
                    type: TextTypes.MARKDOWN,
                    text: `*🔄 Last Updated*: ${updatedDate}`,
                },
            });
        }

        blocks.push({
            type: "divider",
        });

        blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: TextTypes.PLAIN_TEXT,
                        text: "💬 Add Comment",
                    },
                    actionId: ElementEnum.JIRA_ISSUE_DETAILS_ADD_COMMENT_ACTION,
                    blockId: ElementEnum.JIRA_ISSUE_DETAILS_ADD_COMMENT_BLOCK,
                    appId: id,
                    value: issueKey,
                },
                {
                    type: "button",
                    text: {
                        type: TextTypes.PLAIN_TEXT,
                        text: "📤 Share Issue",
                    },
                    actionId: ElementEnum.JIRA_ISSUE_DETAILS_SHARE_ACTION,
                    blockId: ElementEnum.JIRA_ISSUE_DETAILS_SHARE_BLOCK,
                    appId: id,
                    value: issueKey,
                },
            ],
        });

        blocks.push({
            type: "divider",
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: "*💬 Comments*",
            },
        });

        if (commentsResult.success && commentsResult.comments && commentsResult.comments.length > 0) {
            const recentComments = commentsResult.comments.slice(0, 5);
            
            for (const comment of recentComments) {
                const commentBody = comment.body?.content?.[0]?.content?.[0]?.text || 
                                  comment.body || "No comment text";
                const authorName = comment.author?.displayName || "Unknown";
                const createdDate = comment.created ? new Date(comment.created).toLocaleDateString() : "";
                
                blocks.push({
                    type: "section",
                    text: {
                        type: TextTypes.MARKDOWN,
                        text: `👤 *${authorName}* - ${createdDate}\n${commentBody}`,
                    },
                });
            }

            if (commentsResult.comments.length > 5) {
                blocks.push({
                    type: "section",
                    text: {
                        type: TextTypes.MARKDOWN,
                        text: `_Showing 5 of ${commentsResult.comments.length} comments_`,
                    },
                });
            }
        } else {
            blocks.push({
                type: "section",
                text: {
                    type: TextTypes.MARKDOWN,
                    text: "_No comments yet. Be the first to add a comment!_",
                },
            });
        }
    }

    return {
        type: UIKitSurfaceType.MODAL,
        id: ModalEnum.JIRA_ISSUE_DETAILS_MODAL,
        title: {
            type: TextTypes.PLAIN_TEXT,
            text: "Issue Details",
        },
        blocks: blocks,
        clearOnClose: true,
        close: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Close",
            },
            blockId: ElementEnum.JIRA_ISSUE_DETAILS_VIEW_BLOCK,
            actionId: ElementEnum.JIRA_ISSUE_DETAILS_VIEW_ACTION,
            appId: id,
        },
    };
}
