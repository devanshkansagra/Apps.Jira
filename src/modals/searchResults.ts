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
import { AuthPersistence } from "../persistance/authPersistence";
import { SDK } from "../core/sdk";

/**
 * Creates a modal for displaying search results
 */
export async function SearchResultsModal({
    app,
    read,
    modify,
    http,
    sender,
    room,
    persis,
    triggerId,
    id,
    projectKey,
    status,
    issueType,
    priority,
    assignee,
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
    projectKey: string;
    status?: string;
    issueType?: string;
    priority?: string;
    assignee?: string;
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

    // Search for issues using SDK
    const sdk = new SDK(http, app);
    const result = await sdk.searchIssues({
        http,
        token: token.token,
        projectKey,
        status,
        issueType,
        priority,
        assignee,
    });

    // Build the filter description
    const filters: string[] = [`Project: *${projectKey}*`];
    if (status) filters.push(`Status: *${status}*`);
    if (issueType) filters.push(`Type: *${issueType}*`);
    if (priority) filters.push(`Priority: *${priority}*`);
    if (assignee) filters.push(`Assignee: *${assignee}*`);
    const filterDescription = filters.join(" | ");

    if (!result.success || !result.issues || result.issues.length === 0) {
        // No issues found or error occurred
        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `🔍 ${filterDescription}`,
            },
        });
        blocks.push({
            type: "divider",
        });
        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: result.success && (!result.issues || result.issues.length === 0)
                    ? "🎉 *No issues found matching your criteria!*"
                    : `❌ *Error: ${result.error || "Failed to search issues"}*`,
            },
        });
    } else {
        // Display issues in the modal
        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `🔍 ${filterDescription}`,
            },
        });

        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*📋 ${result.issues.length} issue(s) found*`,
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
            const issueStatus = fields?.status?.name || "Unknown";
            const priority = fields?.priority?.name || "None";
            const issueType = fields?.issuetype?.name || "Task";
            const assignee = fields?.assignee?.displayName || "Unassigned";
            
            // Status emoji mapping
            let statusEmoji = "🔵";
            if (issueStatus.toLowerCase() === "done" || issueStatus.toLowerCase() === "closed") {
                statusEmoji = "✅";
            } else if (issueStatus.toLowerCase() === "in progress") {
                statusEmoji = "🔄";
            } else if (issueStatus.toLowerCase() === "to do" || issueStatus.toLowerCase() === "open") {
                statusEmoji = "📋";
            } else if (issueStatus.toLowerCase() === "in review") {
                statusEmoji = "👀";
            } else if (issueStatus.toLowerCase() === "blocked") {
                statusEmoji = "🚫";
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
                    text: `*${issueKey}* - ${summary}\n${statusEmoji} ${issueStatus} | ${priorityEmoji} ${priority} | 📁 ${issueType} | 👤 ${assignee}`,
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
        id: ModalEnum.JIRA_SEARCH_RESULTS_MODAL,
        title: {
            type: TextTypes.PLAIN_TEXT,
            text: "Search Results",
        },
        blocks: blocks,
        clearOnClose: true,
        close: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Close",
            },
            blockId: ElementEnum.JIRA_SEARCH_RESULTS_BLOCK,
            actionId: ElementEnum.JIRA_SEARCH_RESULTS_ACTION,
            appId: id,
        },
    };
}