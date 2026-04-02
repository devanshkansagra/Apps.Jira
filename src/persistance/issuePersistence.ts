import {
    IPersistence,
    IPersistenceRead,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IJiraIssue } from "../interfaces/IJiraIssue";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";

export class IssuePersistence {
    private persis: IPersistence;
    private persistenceRead: IPersistenceRead;
    constructor(persis: IPersistence, persistenceRead: IPersistenceRead) {
        this.persis = persis;
        this.persistenceRead = persistenceRead;
    }

    public async upsertIssueData(issueData: IJiraIssue) {
        try {
            const associations: Array<RocketChatAssociationRecord> = [
                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `issue-data`,
                ),
                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `${issueData.issueId}#issue-data`,
                ),
            ];

            await this.persis.updateByAssociations(
                associations,
                issueData,
                true,
            );
        } catch (error) {
            console.log(error);
        }
    }

    public async fetchIssueData(query?: object) {
        let data: IJiraIssue[] | null = null;
        try {
            const associations: Array<RocketChatAssociationRecord> = [
                new RocketChatAssociationRecord(
                    RocketChatAssociationModel.MISC,
                    `issue-data`,
                ),
            ];

            data = await this.persistenceRead.readByAssociations(associations) as IJiraIssue[];

        } catch (error) {
            console.log(error);
        }

        return data;
    }
}
