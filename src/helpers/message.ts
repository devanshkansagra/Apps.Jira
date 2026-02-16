import { IModify, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { LayoutBlock } from "@rocket.chat/ui-kit";

export async function sendNotification(
    read: IRead,
    modify: IModify,
    sender: IUser,
    room: IRoom,
    message: any,
    blocks?: LayoutBlock[],
) {
    const appUser = (await read.getUserReader().getAppUser()) as IUser;

    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(appUser)
        .setRoom(room)
        .setText(message);

    if (blocks) {
        msg.setBlocks(blocks);
    }

    return read.getNotifier().notifyUser(sender, msg.getMessage());
}

export async function sendMessage(
    read: IRead,
    modify: IModify,
    sender: IUser,
    room: IRoom,
    message?: any,
    blocks?: LayoutBlock[],
): Promise<void> {
    const appUser = (await read.getUserReader().getAppUser()) as IUser;

    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(appUser)
        .setRoom(room)
        .setText(message);

    if (blocks) {
        msg.setBlocks(blocks);
    }

    await modify.getCreator().finish(msg);
}