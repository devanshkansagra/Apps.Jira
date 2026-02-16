import { IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { getCredentials } from "./getCredentials";

export async function getAuthorizationURL(read: IRead, user: IUser) {
    const { clientId } = await getCredentials(read);

    const baseURL = "https://auth.atlassian.com/authorize";
    const audience = "api.atlassian.com";
    const redirectURL = 'http://localhost:3000/api/apps/public/cef7aa7a-c96a-4bcf-8752-2e50bd34e22f/callback'; // keep this dynamic
    const responseType = "code";
    const prompt = "consent";

    const scope = [
        "read:jira-work",
        "write:jira-work",
        "read:jira-user",
        // add "offline_access" if you want refresh token
    ].join(" ");

    const encodedScope = encodeURIComponent(scope);
    const encodedRedirect = encodeURIComponent(redirectURL);

    const state = user.id; // dynamic user-bound value

    const url =
        `${baseURL}?` +
        `audience=${audience}&` +
        `client_id=${clientId}&` +
        `scope=${encodedScope}&` +
        `redirect_uri=${encodedRedirect}&` +
        `state=${state}&` +
        `response_type=${responseType}&` +
        `prompt=${prompt}`;

    return url;
}

