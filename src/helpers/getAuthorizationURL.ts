import { IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { getCredentials } from "./getSettings";
import { URLEnum } from "../enums/URLEnum";

export async function getAuthorizationURL(read: IRead, user: IUser) {
    const { clientId } = await getCredentials(read);

    const baseURL = URLEnum.baseURL;
    const audience = "api.atlassian.com";
    const redirectURL = URLEnum.callback; // keep this dynamic
    const responseType = "code";
    const prompt = "consent";

    const scope = [
        "read:jira-work",
        "write:jira-work",
        "read:jira-user",
        "read:me"
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

