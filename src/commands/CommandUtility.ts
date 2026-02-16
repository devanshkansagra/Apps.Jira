import {
    IRead,
    IModify,
    IHttp,
    IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { JiraApp } from "../../JiraApp";
import {
    ICommandUtility,
    ICommandUtilityParams,
} from "../interfaces/ICommandUtility";
import { authorize } from "../oauth/auth";

export class CommandUtility implements ICommandUtility {
    app: JiraApp;
    params: string[];
    sender: IUser;
    room: IRoom;
    read: IRead;
    modify: IModify;
    http: IHttp;
    persis: IPersistence;
    triggerId?: string | undefined;
    threadId?: string | undefined;

    constructor(props: ICommandUtilityParams) {
        this.app = props.app;
        this.params = props.params;
        this.sender = props.sender;
        this.room = props.room;
        this.read = props.read;
        this.persis = props.persis;
        this.modify = props.modify;
        this.http = props.http;
        this.triggerId = props.triggerId;
        this.threadId = props.threadId;
    }

    public async resolveCommand(): Promise<void> {
        const command = this.params[0];

        switch (command) {
            case "login": {
                await authorize(
                    this.app,
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    this.persis,
                );
            }
        }
    }
}
