import {
    IRead,
    IHttp,
    IPersistence,
    IModify,
    IUIKitSurfaceViewParam,
} from "@rocket.chat/apps-engine/definition/accessors";
import { JiraApp } from "../../JiraApp";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { authorize } from "../oauth/auth";
import { CreateJiraEntityModal } from "../modals/create";
import { AuthPersistence } from "../persistance/authPersistence";
import { sendNotification } from "../helpers/message";

export class Handler {
    constructor(
        protected readonly app: JiraApp,
        protected readonly read: IRead,
        protected readonly http: IHttp,
        protected readonly persistence: IPersistence,
        protected readonly modify: IModify,
        protected readonly sender: IUser,
        protected readonly room: IRoom,
        protected readonly triggerId: string,
    ) {}

    public async login() {
        await authorize(
            this.app,
            this.read,
            this.modify,
            this.sender,
            this.room,
            this.persistence,
        );
    }

    public async create(): Promise<void> {
        const authPersistence = new AuthPersistence(this.app);
        const token = await authPersistence.getAccessTokenForUser(this.sender, this.read);

        if (!token) {
            await sendNotification(
                this.read,
                this.modify,
                this.sender,
                this.room,
                "You are not logged in. Please login to Jira first using /jira login"
            );
            return;
        }

        const modal = await CreateJiraEntityModal({
            app: this.app,
            read: this.read,
            modify: this.modify,
            http: this.http,
            sender: this.sender,
            room: this.room,
            persis: this.persistence,
            triggerId: this.triggerId,
            id: this.app.getID(),
        });

        await this.modify.getUiController().openSurfaceView(
            modal as IUIKitSurfaceViewParam,
            {
                triggerId: this.triggerId,
            },
            this.sender,
        );
    }
}
