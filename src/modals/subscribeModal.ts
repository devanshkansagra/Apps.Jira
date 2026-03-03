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

export async function SubscribeModal({
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

    if (!projects || projects.length === 0) {
        await sendNotification(
            read,
            modify,
            sender,
            room as IRoom,
            "No projects found. Please check your Jira permissions.",
        );
        return {} as IUIKitSurfaceViewParam;
    }

    const projectOptions = projects.map(
        (project: { key: string; name: string }) => ({
            value: project.key,
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: `${project.key} - ${project.name}`,
            },
        }),
    );

    // Jira webhook events
    const eventOptions = [
        {
            value: "jira:issue_created",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Issue Created",
                emoji: true,
            },
        },
        {
            value: "jira:issue_updated",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Issue Updated",
                emoji: true,
            },
        },
        {
            value: "jira:issue_deleted",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Issue Deleted",
                emoji: true,
            },
        },
        {
            value: "comment_created",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Comment Created",
                emoji: true,
            },
        },
        {
            value: "comment_updated",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Comment Updated",
                emoji: true,
            },
        },
        {
            value: "comment_deleted",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Comment Deleted",
                emoji: true,
            },
        },
        {
            value: "issue_worklog_created",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Worklog Created",
                emoji: true,
            },
        },
        {
            value: "issue_worklog_updated",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Worklog Updated",
                emoji: true,
            },
        },
        {
            value: "issue_worklog_deleted",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Worklog Deleted",
                emoji: true,
            },
        },
        {
            value: "jira:issue_transited",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Issue Status Changed",
                emoji: true,
            },
        },
        {
            value: "jira:issue_assigned",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Issue Assigned",
                emoji: true,
            },
        },
    ];

    // Project dropdown
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
            actionId: ElementEnum.JIRA_SUBSCRIBE_PROJECT_ACTION,
            blockId: ElementEnum.JIRA_SUBSCRIBE_PROJECT_BLOCK,
            options: projectOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_SUBSCRIBE_PROJECT_BLOCK,
    });

    // Events multi-select
    blocks.push({
        type: "input",
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Events to Subscribe",
        },
        element: {
            type: "multi_static_select",
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Select events to subscribe",
            },
            actionId: ElementEnum.JIRA_SUBSCRIBE_EVENTS_ACTION,
            blockId: ElementEnum.JIRA_SUBSCRIBE_EVENTS_BLOCK,
            options: eventOptions,
            appId: id,
        },
        blockId: ElementEnum.JIRA_SUBSCRIBE_EVENTS_BLOCK,
    });

    return {
        id: ModalEnum.JIRA_SUBSCRIBE_MODAL,
        type: UIKitSurfaceType.MODAL,
        title: {
            type: TextTypes.PLAIN_TEXT,
            text: "Subscribe to Jira Events",
        },
        submit: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Subscribe",
            },
            blockId: ModalEnum.JIRA_SUBSCRIBE_MODAL,
            actionId: "jira-subscribe-submit",
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
        blocks,
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
