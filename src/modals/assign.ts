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

export async function AssignIssueModal({
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

    const issues = await getUnassignedIssues(
        read,
        modify,
        sender,
        room as IRoom,
        http,
        token,
    );

    if (!issues || issues.length === 0) {
        await sendNotification(
            read,
            modify,
            sender,
            room as IRoom,
            "No unassigned issues found.",
        );
        return {} as IUIKitSurfaceViewParam;
    }

    const issueOptions: Array<{ value: string; text: { type: "plain_text" | "mrkdwn"; text: string } }> = [];
    
    for (const issue of issues) {
        if (issue && issue.key) {
            const summary = issue.fields?.summary || "No summary";
            const truncatedSummary = summary.length > 50 ? summary.substring(0, 50) + "..." : summary;
            issueOptions.push({
                value: issue.key,
                text: {
                    type: "plain_text" as const,
                    text: `${issue.key} - ${truncatedSummary}`,
                },
            });
        }
    }

    if (issueOptions.length === 0) {
        await sendNotification(
            read,
            modify,
            sender,
            room as IRoom,
            "No valid unassigned issues found.",
        );
        return {} as IUIKitSurfaceViewParam;
    }

    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Issue Key",
        },
        element: {
            type: "static_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Select an issue to assign",
            },
            actionId: ElementEnum.JIRA_ASSIGN_ISSUE_ACTION,
            blockId: ElementEnum.JIRA_ASSIGN_ISSUE_BLOCK,
            options: issueOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_ASSIGN_ISSUE_BLOCK,
    });

    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Assignee",
        },
        element: {
            type: "users_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Select a user to assign",
            },
            actionId: ElementEnum.JIRA_ASSIGN_USER_ACTION,
            blockId: ElementEnum.JIRA_ASSIGN_USER_BLOCK,
            appId: id,
        },
        blockId: ElementEnum.JIRA_ASSIGN_USER_BLOCK,
    });

    return {
        type: UIKitSurfaceType.MODAL,
        id: ModalEnum.JIRA_ASSIGN_MODAL,
        title: {
            type: TextTypes.PLAIN_TEXT,
            text: "Assign Jira Issue",
        },
        blocks: blocks,
        submit: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Assign",
            },
            blockId: ModalEnum.JIRA_ASSIGN_MODAL,
            actionId: ElementEnum.JIRA_ASSIGN_ACTION,
            appId: id,
        },
        clearOnClose: true,
        close: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Cancel",
            },
            blockId: "",
            actionId: "",
            appId: id,
        },
    };
}

async function getUnassignedIssues(
    read: IRead,
    modify: IModify,
    sender: IUser,
    room: IRoom,
    http: IHttp,
    token: any,
): Promise<any[]> {
    try {
        const cloudId = token.token?.cloudId;
        if (!cloudId) {
            console.log("No cloudId found in token");
            return [];
        }

        const jql = "assignee is EMPTY ORDER BY updated DESC";
        
        const response = await http.post(
            `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`,
            {
                headers: {
                    Authorization: `Bearer ${token?.token.token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                content: JSON.stringify({
                    jql: jql,
                    fields: ["key", "summary", "status", "priority", "issuetype", "project"],
                    maxResults: 100,
                }),
            },
        );

        const issues = response?.data?.issues;
        if (!issues || !Array.isArray(issues)) {
            console.log("No issues found or invalid response structure");
            return [];
        }

        return issues;
    } catch (error) {
        console.error("Error fetching unassigned issues:", error);
        sendNotification(
            read,
            modify,
            sender,
            room,
            "Failed to fetch unassigned issues. Please try again.",
        );
        return [];
    }
}
