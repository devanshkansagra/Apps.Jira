import { v4 as uuidv4 } from "uuid";
import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { JiraApp } from "../../JiraApp";
import {
    IHttp,
    IHttpResponse,
    IModify,
    IPersistence,
    IRead,
    IUIKitSurfaceViewParam,
} from "@rocket.chat/apps-engine/definition/accessors";
import { ElementEnum } from "../enums/ElementEnum";
import { LayoutBlock } from "@rocket.chat/ui-kit";
import { sendMessage, sendNotification } from "../helpers/message";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IssueDetailsModal } from "../modals/issueDetails";
import { AddCommentModal } from "../modals/addComment";

export class ExecuteBlockActionHandler {
    private context: UIKitBlockInteractionContext;

    constructor(
        protected readonly app: JiraApp,
        context: UIKitBlockInteractionContext,
        protected readonly read: IRead,
        protected readonly http: IHttp,
        protected readonly persistence: IPersistence,
        protected readonly modify: IModify
    ) {
        this.context = context;
    }

    public async execute(): Promise<IUIKitResponse | void> {
        const {
            actionId,
            triggerId,
            user,
            value,
            threadId,
            blockId,
            room,
            container,
        } = this.context.getInteractionData();

        try {
            if (actionId && actionId.startsWith("view-issue-")) {
                const issueKey = actionId.replace("view-issue-", "");
                
                const modal = await IssueDetailsModal({
                    app: this.app,
                    read: this.read,
                    modify: this.modify,
                    http: this.http,
                    sender: user,
                    room: room as IRoom,
                    persis: this.persistence,
                    triggerId,
                    id: this.app.getID(),
                    issueKey,
                });

                await this.modify.getUiController().openSurfaceView(
                    modal as IUIKitSurfaceViewParam,
                    {
                        triggerId,
                    },
                    user,
                );
                
                return {
                    success: true,
                };
            }

            if (actionId === ElementEnum.JIRA_ISSUE_DETAILS_ADD_COMMENT_ACTION) {
                const issueKey = value || "";
                
                if (!issueKey) {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room as IRoom,
                        "Invalid issue key. Please try again.",
                    );
                    return {
                        success: true,
                    };
                }
                
                const modal = await AddCommentModal({
                    app: this.app,
                    read: this.read,
                    modify: this.modify,
                    http: this.http,
                    sender: user,
                    room: room as IRoom,
                    persis: this.persistence,
                    triggerId,
                    id: this.app.getID(),
                    issueKey,
                });

                await this.modify.getUiController().openSurfaceView(
                    modal as IUIKitSurfaceViewParam,
                    {
                        triggerId,
                    },
                    user,
                );
                
                return {
                    success: true,
                };
            }

            if (actionId === ElementEnum.JIRA_ISSUE_DETAILS_SHARE_ACTION) {
                const issueKey = value;
                await sendNotification(
                    this.read,
                    this.modify,
                    user,
                    room as IRoom,
                    `Share issue feature for issue ${issueKey} is not yet implemented.`,
                );
                return {
                    success: true,
                };
            }

            switch (actionId) {

                case ElementEnum.LOGIN_BUTTON_ACTION: {
                    
                    break;
                }
            }
        } catch (error) {
            console.warn("ExecuteBlockActionHandler Error:", error);
        }
        return {
            success: true,
        };
    }
}