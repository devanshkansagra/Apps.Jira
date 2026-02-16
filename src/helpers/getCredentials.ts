import { IRead } from "@rocket.chat/apps-engine/definition/accessors";

export async function getCredentials(read: IRead) {
    const clientId = await read
        .getEnvironmentReader()
        .getSettings()
        .getValueById("client-id");

    const clientSecret = await read
        .getEnvironmentReader()
        .getSettings()
        .getValueById("client-secret");

    return { clientId, clientSecret };
}
