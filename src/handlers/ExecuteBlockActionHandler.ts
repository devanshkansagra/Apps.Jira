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

        // const authPersistence = new AuthPersistence(this.app);
        try {
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