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
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";

/**
 * Creates a modal for adding a comment to a Jira issue
 */
export async function AddCommentModal({
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
    const blocks: LayoutBlock[] = [];

    // Header section with issue key
    blocks.push({
        type: "section",
        text: {
            type: TextTypes.MARKDOWN,
            text: `*💬 Add Comment to ${issueKey}*`,
        },
    });

    blocks.push({
        type: "divider",
    });

    // Hidden input to store issue key
    blocks.push({
        type: "input",
        element: {
            type: "plain_text_input",
            initialValue: issueKey,
            appId: id,
            blockId: ElementEnum.JIRA_ADD_COMMENT_BLOCK,
            actionId: "jira-add-comment-issue-key",
        },
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Issue Key",
        },
        blockId: "jira-add-comment-issue-key-block",
    });

    // Multi-line input for comment
    blocks.push({
        type: "input",
        element: {
            type: "plain_text_input",
            multiline: true,
            placeholder: {
                type: TextTypes.PLAIN_TEXT,
                text: "Write your comment here...",
            },
            appId: id,
            blockId: ElementEnum.JIRA_ADD_COMMENT_BLOCK,
            actionId: ElementEnum.JIRA_ADD_COMMENT_ACTION,
        },
        label: {
            type: TextTypes.PLAIN_TEXT,
            text: "Comment",
        },
        blockId: ElementEnum.JIRA_ADD_COMMENT_BLOCK,
    });

    return {
        type: UIKitSurfaceType.MODAL,
        id: ModalEnum.JIRA_ADD_COMMENT_MODAL,
        title: {
            type: TextTypes.PLAIN_TEXT,
            text: "Add Comment",
        },
        blocks: blocks,
        clearOnClose: false,
        close: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Cancel",
            },
            blockId: ElementEnum.JIRA_ADD_COMMENT_BLOCK,
            actionId: ElementEnum.JIRA_ADD_COMMENT_ACTION,
            appId: id,
        },
        submit: {
            type: "button",
            text: {
                type: TextTypes.PLAIN_TEXT,
                text: "Add Comment",
            },
            blockId: ElementEnum.JIRA_ADD_COMMENT_BLOCK,
            actionId: ElementEnum.JIRA_ADD_COMMENT_ACTION,
            appId: id,
        },
    };
}
