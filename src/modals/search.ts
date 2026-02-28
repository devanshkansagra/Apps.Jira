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

export async function SearchJiraModal({
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
                text: `${project.key} - ${project.name}`,
            },
        }),
    );

    const statusOptions = [
        {
            value: "",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "All Statuses",
                emoji: true,
            },
        },
        {
            value: "To Do",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "To Do",
                emoji: true,
            },
        },
        {
            value: "In Progress",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "In Progress",
                emoji: true,
            },
        },
        {
            value: "In Review",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "In Review",
                emoji: true,
            },
        },
        {
            value: "Done",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Done",
                emoji: true,
            },
        },
        {
            value: "Closed",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Closed",
                emoji: true,
            },
        },
        {
            value: "Open",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Open",
                emoji: true,
            },
        },
        {
            value: "Reopened",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Reopened",
                emoji: true,
            },
        },
        {
            value: "Blocked",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Blocked",
                emoji: true,
            },
        },
    ];

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
            actionId: ElementEnum.JIRA_SEARCH_PROJECT_ACTION,
            blockId: ElementEnum.JIRA_SEARCH_PROJECT_BLOCK,
            options: projectOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_SEARCH_PROJECT_BLOCK,
    });

    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Status (Optional)",
        },
        element: {
            type: "static_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "All Statuses",
            },
            actionId: ElementEnum.JIRA_SEARCH_STATUS_ACTION,
            blockId: ElementEnum.JIRA_SEARCH_STATUS_BLOCK,
            options: statusOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_SEARCH_STATUS_BLOCK,
        optional: true,
    });

    const issueTypeOptions = [
        {
            value: "",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "All Issue Types",
                emoji: true,
            },
        },
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
        {
            value: "Improvement",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Improvement",
                emoji: true,
            },
        },
        {
            value: "New Feature",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "New Feature",
                emoji: true,
            },
        },
    ];

    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Issue Type (Optional)",
        },
        element: {
            type: "static_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "All Issue Types",
            },
            actionId: ElementEnum.JIRA_SEARCH_ISSUE_TYPE_ACTION,
            blockId: ElementEnum.JIRA_SEARCH_ISSUE_TYPE_BLOCK,
            options: issueTypeOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_SEARCH_ISSUE_TYPE_BLOCK,
        optional: true,
    });

    const priorityOptions = [
        {
            value: "",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "All Priorities",
                emoji: true,
            },
        },
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

    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Priority (Optional)",
        },
        element: {
            type: "static_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "All Priorities",
            },
            actionId: ElementEnum.JIRA_SEARCH_PRIORITY_ACTION,
            blockId: ElementEnum.JIRA_SEARCH_PRIORITY_BLOCK,
            options: priorityOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_SEARCH_PRIORITY_BLOCK,
        optional: true,
    });

    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Assignee (Optional)",
        },
        element: {
            type: "users_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Select a user or leave empty for all",
            },
            actionId: ElementEnum.JIRA_SEARCH_ASSIGNEE_ACTION,
            blockId: ElementEnum.JIRA_SEARCH_ASSIGNEE_BLOCK,
            appId: id,
        },
        blockId: ElementEnum.JIRA_SEARCH_ASSIGNEE_BLOCK,
        optional: true,
    });

    return {
        type: UIKitSurfaceType.MODAL,
        id: ModalEnum.JIRA_SEARCH_MODAL,
        title: {
            type: TextTypes.PLAIN_TEXT,
            text: "Search Jira Issues",
        },
        blocks: blocks,
        submit: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Search",
            },
            blockId: ModalEnum.JIRA_SEARCH_MODAL,
            actionId: ElementEnum.JIRA_SEARCH_ACTION,
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