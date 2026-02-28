import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    IChannelSubscription,
    IUserSubscription,
} from "../interfaces/ISubscription";
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

            data = (await this.persistenceRead.readByAssociations(
                association,
            )) as IChannelSubscription[];
        } catch (error) {
            console.log(error);
        }

        return data;
    }

    async createUserSubscription(subscription: IUserSubscription) {
        const association: RocketChatAssociationRecord[] = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                `user-subscription`,
            ),

            new RocketChatAssociationRecord(
                RocketChatAssociationModel.USER,
                subscription.userId,
            ),

            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                `issue:${subscription.issueId}`,
            ),
        ];

        await this.persis.updateByAssociations(association, subscription, true);
    }
    async getUserSubscribedToIssue(issueId: string) {
        let data: IUserSubscription[] | null = null;
        try {
            const association: RocketChatAssociationRecord[] = [
                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `user-subscription`,
                ),

                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `issue:${issueId}`,
                ),
            ];

            data = (
                await this.persistenceRead.readByAssociations(association)
            ) as IUserSubscription[];
        } catch (error) {
            console.log(error);
        }

        return data;
    }
}
