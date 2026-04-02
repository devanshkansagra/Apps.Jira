import { IUser } from "@rocket.chat/apps-engine/definition/users";

export interface IJiraIssue {
    issueId: string;
    type: string;
    projectKey: string;
    status: string;
    assignee?: IUser;
    priority?: string;
    deadline?: Date;
}