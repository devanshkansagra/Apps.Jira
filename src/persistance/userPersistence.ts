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

    private getUserAssociation(user: IUser) {
        return new RocketChatAssociationRecord(
            RocketChatAssociationModel.USER,
            user.id,
        );
    }

    private normalizeStoredAuth(raw: any): { token?: any; user?: any } | null {
        if (!raw) {
            return null;
        }

        const token =
            raw.token && typeof raw.token === "object"
                ? raw.token
                : typeof raw.access_token === "string"
                  ? {
                        userId: raw.userId,
                        access_token: raw.access_token,
                        refresh_token: raw.refresh_token,
                        scope: raw.scope,
                        lastApiCallAt: raw.lastApiCallAt,
                    }
                  : undefined;

        const user =
            raw.user && typeof raw.user === "object"
                ? raw.user
                : raw.cloudId || raw.siteUrl || raw.accountId
                  ? {
                        userId: raw.userId,
                        accountId: raw.accountId,
                        email: raw.email,
                        name: raw.name,
                        avatar: raw.avatar,
                        cloudId: raw.cloudId,
                        siteUrl: raw.siteUrl,
                        siteName: raw.siteName,
                    }
                  : undefined;

        return { token, user };
    }

    private async mergeAndPersist(
        user: IUser,
        read: IRead,
        persis: IPersistence,
        updates: { token?: any; user?: any },
    ): Promise<void> {
        const association = this.getUserAssociation(user);
        const [existingRaw] = await read
            .getPersistenceReader()
            .readByAssociation(association);

        const existing = this.normalizeStoredAuth(existingRaw) || {};
        const merged = {
            token: updates.token ? { ...(existing as any).token, ...updates.token } : (existing as any).token,
            user: updates.user ? { ...(existing as any).user, ...updates.user } : (existing as any).user,
        };

        await persis.updateByAssociation(association, merged, true);
    }

    public async setAccessTokenForUser(
        token: object,
        user: IUser,
        read: IRead,
        persis: IPersistence,
    ) {
        try {
            await this.mergeAndPersist(user, read, persis, { token });
        } catch (error) {
            console.log(error);
        }
    }

    public async getAccessTokenForUser(user: IUser, read: IRead): Promise<any> {
        try {
            const association = this.getUserAssociation(user);
            const [tokenData] = await read
                .getPersistenceReader()
                .readByAssociation(association);
            return this.normalizeStoredAuth(tokenData);
        } catch (error) {
            console.log(error);
        }
    }

    public async deleteAccessTokenForUser(
        user: IUser,
        persis: IPersistence,
    ): Promise<any> {
        try {
            const association = this.getUserAssociation(user);
            await persis.removeByAssociation(association);
        } catch (error) {
            console.log(error);
        }
    }

    public async updateTokenForUser(
        user: IUser,
        read: IRead,
        persis: IPersistence,
        tokenUpdates: Record<string, any>,
    ): Promise<void> {
        try {
            await this.mergeAndPersist(user, read, persis, { token: tokenUpdates });
        } catch (error) {
            console.log(error);
        }
    }

    public async touchLastApiCallForUser(
        user: IUser,
        read: IRead,
        persis: IPersistence,
        at: number = Date.now(),
    ): Promise<void> {
        await this.updateTokenForUser(user, read, persis, { lastApiCallAt: at });
    }

    public async setUserInfo(
        userData: object,
        user: IUser,
        read: IRead,
        persis: IPersistence,
    ) {
        try {
            await this.mergeAndPersist(user, read, persis, { user: userData });
        } catch (error) {
            console.log(error);
        }
    }
}
