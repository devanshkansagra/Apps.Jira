export interface IChannelSubscription {
    projectId: string,
    roomId: string;
    events?: string[]
}

export interface IUserSubscription {
    events?: string[],
    issueId: string,
    accountId: string,
    userId: string
}