import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IChannelSubscription } from "../interfaces/ISubscription";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";

export class SubscriptionPersistence {
    private persis: IPersistence;
    private persistenceRead: IPersistenceRead;
    constructor(persis: IPersistence, persistenceRead: IPersistenceRead) {
        this.persis = persis;
        this.persistenceRead = persistenceRead;
    }

    async createChannelSubscription(subscription: IChannelSubscription) {
        try {
            const association: RocketChatAssociationRecord[] = [
                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `channel-subscription`,
                ),

                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.ROOM,
                    subscription.roomId,
                ),
                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `project:${subscription.projectId}`,
                ),
            ];

            await this.persis.updateByAssociations(
                association,
                subscription,
                true,
            );
        } catch (error) {
            console.log(error);
        }
    }

    async getSubscribedChannels(projectId: string) {
        let data: IChannelSubscription[] | null = null;
        try {
            const association: RocketChatAssociationRecord[] = [
                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `channel-subscription`,
                ),
    
                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `project:${projectId}`,
                ),
            ];

            data = await this.persistenceRead.readByAssociations(association) as IChannelSubscription[];
        } catch (error) {
            console.log(error);
        }

        return data;
    }
}
