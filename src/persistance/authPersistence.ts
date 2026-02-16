import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { JiraApp } from "../../JiraApp";
import {
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";
import { IAuthData } from "@rocket.chat/apps-engine/definition/oauth2/IOAuth2";

export class AuthPersistence {
    constructor(private readonly app: JiraApp) {}

    public async setAccessTokenForUser(
        token: IAuthData,
        user: IUser,
        persis: IPersistence,
    ) {
        try {
            const association = new RocketChatAssociationRecord(
                RocketChatAssociationModel.USER,
                user.id,
            );
            await persis.updateByAssociation(association, { token }, true);
        } catch (error) {
            console.log(error);
        }
    }

    public async getAccessTokenForUser(user: IUser, read: IRead): Promise<any> {
        try {
            const association = new RocketChatAssociationRecord(
                RocketChatAssociationModel.USER,
                user.id,
            );
            const [tokenData] = await read
                .getPersistenceReader()
                .readByAssociation(association);
            if (tokenData) {
                return tokenData;
            } else {
                return null;
            }
        } catch (error) {
            console.log(error);
        }
    }

    public async deleteAccessTokenForUser(user:IUser, persis: IPersistence): Promise<any> {
        try {
            const association = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
            await persis.removeByAssociation(association);
        }
        catch(error) {
            console.log(error);
        }
    }
}