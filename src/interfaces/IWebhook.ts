export interface IWebhookPayload {
    webhookEvent: string;
    issue?: {
        key: string;
        name?: string;
        fields?: {
            summary: string;
            project: {
                key: string;
            };
            status: {
                name: string;
            };
            priority: {
                name: string;
            };
            issuetype: {
                name: string;
            };
            assignee: {
                displayName: string;
            };
            reporter: {
                displayName: string;
            };
            description?: any;
            created: string;
            updated: string;
        };
        self?: string;
    };
    comment?: {
        author: {
            displayName: string;
        };
        body: string;
    };
    user?: {
        displayName: string;
    };
    changelog?: {
        items: Array<{
            field: string;
            fromString: string;
            toString: string;
        }>;
    };
    name?: string;
}