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

/**
 * Creates a modal for creating Jira entities (Task, Bug, Story, etc.)
 * similar to the CreateFormModal pattern
 */
export async function CreateJiraEntityModal({
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

    // Get Jira projects for the user
    const projects = await getJiraProjects(
        read,
        modify,
        sender,
        room as IRoom,
        http,
        token,
    );
    const projectOptions = projects.map(
        (project: { key: string; name: string }) => ({
            value: project.key,
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: project.name,
            },
        }),
    );

    // Common Jira issue types
    const issueTypeOptions = [
        {
            value: "Task",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Task",
                emoji: true,
            },
        },
        {
            value: "Bug",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Bug",
                emoji: true,
            },
        },
        {
            value: "Story",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Story",
                emoji: true,
            },
        },
        {
            value: "Epic",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Epic",
                emoji: true,
            },
        },
        {
            value: "Subtask",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Subtask",
                emoji: true,
            },
        },
    ];

    // Priority options
    const priorityOptions = [
        {
            value: "Highest",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Highest",
                emoji: true,
            },
        },
        {
            value: "High",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "High",
                emoji: true,
            },
        },
        {
            value: "Medium",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Medium",
                emoji: true,
            },
        },
        {
            value: "Low",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Low",
                emoji: true,
            },
        },
        {
            value: "Lowest",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Lowest",
                emoji: true,
            },
        },
    ];

    // Project Selection
    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Project",
        },
        element: {
            type: "static_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Select a project",
            },
            actionId: ElementEnum.JIRA_PROJECT_ACTION,
            blockId: ElementEnum.JIRA_PROJECT_BLOCK,
            options: projectOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_PROJECT_BLOCK,
    });

    // Issue Type Selection
    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Issue Type",
        },
        element: {
            type: "static_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Select issue type",
            },
            actionId: ElementEnum.JIRA_ISSUE_TYPE_ACTION,
            blockId: ElementEnum.JIRA_ISSUE_TYPE_BLOCK,
            options: issueTypeOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_ISSUE_TYPE_BLOCK,
    });

    // Summary (Title)
    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Summary",
        },
        element: {
            type: "plain_text_input",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Enter issue summary",
            },
            appId: id,
            blockId: ElementEnum.JIRA_SUMMARY_BLOCK,
            actionId: ElementEnum.JIRA_SUMMARY_ACTION,
        },
    });

    // Description
    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Description",
        },
        element: {
            type: "plain_text_input",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Enter issue description",
            },
            appId: id,
            blockId: ElementEnum.JIRA_DESCRIPTION_BLOCK,
            actionId: ElementEnum.JIRA_DESCRIPTION_ACTION,
            multiline: true,
        },
    });

    // Priority Selection
    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Priority",
        },
        element: {
            type: "static_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Select priority",
            },
            actionId: ElementEnum.JIRA_PRIORITY_ACTION,
            blockId: ElementEnum.JIRA_PRIORITY_BLOCK,
            options: priorityOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_PRIORITY_BLOCK,
    });

    // Assignee (optional)
    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Assignee (optional)",
        },
        element: {
            type: "users_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Enter assignee email or leave blank",
            },
            appId: id,
            blockId: ElementEnum.JIRA_ASSIGNEE_BLOCK,
            actionId: ElementEnum.JIRA_ASSIGNEE_ACTION,
        },
    });

    return {
        type: UIKitSurfaceType.MODAL,
        id: ElementEnum.JIRA_CREATE_MODAL,
        title: {
            type: TextTypes.PLAIN_TEXT,
            text: "Create Jira Issue",
        },
        blocks: blocks,
        submit: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Create",
            },
            blockId: ElementEnum.JIRA_CREATE_MODAL,
            actionId: ElementEnum.JIRA_CREATE_ACTION,
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

/**
 * Helper function to fetch Jira projects from the API
 */
async function getJiraProjects(
    read: IRead,
    modify: IModify,
    sender: IUser,
    room: IRoom,
    http: IHttp,
    token: any,
): Promise<Array<{ key: string; name: string }>> {
    try {
        const cloudId = token.token?.cloudId;
        if (!cloudId) {
            console.log("No cloudId found in token");
            return [];
        }

        const response = await http.get(
            `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`,
            {
                headers: {
                    Authorization: `Bearer ${token?.token.token}`,
                    Accept: "application/json",
                },
            },
        );

        return response.data.map((project: { key: string; name: string }) => ({
            key: project.key,
            name: project.name,
        }));

        return [];
    } catch (error) {
        sendNotification(
            read,
            modify,
            sender,
            room,
            "Please Login to Continue",
        );
        return [];
    }
}
