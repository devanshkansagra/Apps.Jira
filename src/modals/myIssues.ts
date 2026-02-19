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
import { JiraApp } from "../../JiraApp";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { sendNotification } from "../helpers/message";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { AuthPersistence } from "../persistance/authPersistence";
import { SDK } from "../core/sdk";

/**
 * Creates a modal for displaying issues assigned to the logged-in user
 */
export async function MyIssuesModal({
    app,
    read,
    modify,
    http,
    sender,
    room,
    persis,
    triggerId,
    id,
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

    // Get issues assigned to the user
    const sdk = new SDK(http, app);
    const result = await sdk.getMyIssues({
        http,
        token: token.token,
    });

    if (!result.success || !result.issues || result.issues.length === 0) {
        // No issues found or error occurred
        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: result.success && (!result.issues || result.issues.length === 0)
                    ? "🎉 *No issues assigned to you!*"
                    : `❌ *Error: ${result.error || "Failed to fetch issues"}*`,
            },
        });
    } else {
        // Display issues in the modal
        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*📋 ${result.issues.length} issue(s) assigned to you*`,
            },
        });

        // Add a divider
        blocks.push({
            type: "divider",
        });

        // Add each issue as a section block
        for (const issue of result.issues) {
            const issueKey = issue.key;
            const fields = issue.fields;
            const summary = fields?.summary || "No summary";
            const status = fields?.status?.name || "Unknown";
            const priority = fields?.priority?.name || "None";
            const issueType = fields?.issuetype?.name || "Task";
            const projectName = fields?.project?.name || "";
            
            // Status emoji mapping
            let statusEmoji = "🔵";
            if (status.toLowerCase() === "done" || status.toLowerCase() === "closed") {
                statusEmoji = "✅";
            } else if (status.toLowerCase() === "in progress") {
                statusEmoji = "🔄";
            } else if (status.toLowerCase() === "to do" || status.toLowerCase() === "open") {
                statusEmoji = "📋";
            }

            // Priority emoji mapping
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
                    text: `*${issueKey}* - ${summary}\n${statusEmoji} ${status} | ${priorityEmoji} ${priority} | 📁 ${issueType} | 🏗️ ${projectName}`,
                },
                accessory: {
                    type: "button",
                    text: {
                        type: TextTypes.PLAIN_TEXT,
                        text: "View",
                        emoji: true,
                    },
                    url: `${token.siteUrl}/browse/${issueKey}`,
                    actionId: `view-issue-${issueKey}`,
                    blockId: `view-issue-block-${issueKey}`,
                    appId: id,
                },
            });

            // Add a divider between issues (except after the last one)
            if (result.issues.indexOf(issue) < result.issues.length - 1) {
                blocks.push({
                    type: "divider",
                });
            }
        }
    }

    return {
        type: UIKitSurfaceType.MODAL,
        id: ElementEnum.JIRA_MY_ISSUES_MODAL,
        title: {
            type: TextTypes.PLAIN_TEXT,
            text: "My Jira Issues",
        },
        blocks: blocks,
        clearOnClose: true,
        close: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Close",
            },
            blockId: ElementEnum.JIRA_MY_ISSUES_BLOCK,
            actionId: ElementEnum.JIRA_MY_ISSUES_ACTION,
            appId: id,
        },
    };
}
