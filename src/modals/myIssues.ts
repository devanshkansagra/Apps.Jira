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
    const auth = await authPersistence.getAccessTokenForUser(sender, read);
    
    if (!auth?.token?.access_token || !auth?.user?.cloudId) {
        await sendNotification(
            read,
            modify,
            sender,
            room as IRoom,
            "You are not logged in. Please login to Jira first.",
        );
        return {} as IUIKitSurfaceViewParam;
    }

    await authPersistence.touchLastApiCallForUser(sender, read, persis);
    const token = {
        token: auth.token.access_token,
        cloudId: auth.user.cloudId,
        accountId: auth.user.accountId,
        siteUrl: auth.user.siteUrl,
        siteName: auth.user.siteName,
    };

    const sdk = new SDK(http, app);
    const result = await sdk.getMyIssues({
        http,
        token,
    });

    if (!result.success || !result.issues || result.issues.length === 0) {
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
        blocks.push({
            type: "section",
            text: {
                type: TextTypes.MARKDOWN,
                text: `*📋 ${result.issues.length} issue(s) assigned to you*`,
            },
        });

        blocks.push({
            type: "divider",
        });

        for (const issue of result.issues) {
            const issueKey = issue.key;
            const fields = issue.fields;
            const summary = fields?.summary || "No summary";
            const status = fields?.status?.name || "Unknown";
            const priority = fields?.priority?.name || "None";
            const issueType = fields?.issuetype?.name || "Task";
            const projectName = fields?.project?.name || "";
            
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
                    text: `*${issueKey}* - ${summary}\n${statusEmoji} ${status} | ${priorityEmoji} ${priority} | 📁 ${issueType} | 🏗️ ${projectName}`,
                },
                accessory: {
                    type: "button",
                    text: {
                        type: TextTypes.PLAIN_TEXT,
                        text: "View",
                        emoji: true,
                    },
                    actionId: `view-issue-${issueKey}`,
                    blockId: `view-issue-block-${issueKey}`,
                    appId: id,
                },
            });

            if (result.issues.indexOf(issue) < result.issues.length - 1) {
                blocks.push({
                    type: "divider",
                });
            }
        }
    }

    return {
        type: UIKitSurfaceType.MODAL,
        id: ModalEnum.JIRA_MY_ISSUES_MODAL,
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
