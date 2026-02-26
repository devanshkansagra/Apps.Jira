import {
    ApiEndpoint,
    IApiEndpointInfo,
    IApiRequest,
    IApiResponse,
} from "@rocket.chat/apps-engine/definition/api";
import { JiraApp } from "../../JiraApp";
import {
    IRead,
    IModify,
    IHttp,
    IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";
import { SubscriptionPersistence } from "../persistance/subscriptionPersistence";
import { sendMessage } from "../helpers/message";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";

export class WebhookEndpoint extends ApiEndpoint {
    path: string = "webhook";
    public app: JiraApp;
    constructor(app: JiraApp) {
        super(app);
    }

    async post(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {
        const issue = request.content.issue;
        const projectId = issue.fields.project.key;

        const subscriptionPersistence = new SubscriptionPersistence(
            persis,
            read.getPersistenceReader(),
        );

        const subscribers = await subscriptionPersistence.getSubscribedChannels(projectId);
        
        const webhookEvent = request.content.webhookEvent;
        
        for (const subscriber of subscribers ?? []) {
            const roomId = subscriber.roomId;
            const room = await read.getRoomReader().getById(roomId);
            if (!room) {
                continue;
            }
            
            if (subscriber.events && subscriber.events.length > 0) {
                const eventType = this.getEventType(webhookEvent);

                if (!subscriber.events.includes(eventType)) {
                    continue;
                }
            }
            
            const message = this.formatMessage(request.content);
            await sendMessage(read, modify, room, undefined, message);
        }
        return { status: 200 };
    }

    private getEventType(webhookEvent: string): string {
        const eventMapping: Record<string, string> = {
            'jira:issue_created': 'issue_created',
            'jira:issue_updated': 'issue_updated',
            'jira:issue_deleted': 'issue_deleted',
            'comment_created': 'comment_created',
            'comment_updated': 'comment_updated',
            'comment_deleted': 'comment_deleted',
            'sprint_started': 'sprint_started',
            'sprint_closed': 'sprint_closed',
        };
        
        return eventMapping[webhookEvent] || webhookEvent;
    }
    
    private formatMessage(content: any): string {
        const { webhookEvent, issue, comment, user, changelog } = content;
        
        const issueKey = issue?.key || 'Unknown';
        const issueSummary = issue?.fields?.summary || 'No summary';
        const projectKey = issue?.fields?.project?.key || 'Unknown';
        const issueUrl = issue?.self ? issue.self.replace('/rest/api/2/issue/' + issueKey, '/browse/' + issueKey) : '';
        
        const status = issue?.fields?.status?.name || 'Unknown';
        const priority = issue?.fields?.priority?.name || 'None';
        const issueType = issue?.fields?.issuetype?.name || 'Unknown';
        const assignee = issue?.fields?.assignee?.displayName || 'Unassigned';
        const reporter = issue?.fields?.reporter?.displayName || 'Unknown';
        
        switch (webhookEvent) {
            
            case 'jira:issue_updated': {
                let changeDetails = '';
                if (changelog && changelog.items) {
                    const changes: string[] = [];
                    for (const item of changelog.items) {
                        if (item.field === 'status') {
                            changes.push(`*Status:* ${item.fromString || 'None'} → ${item.toString || 'None'}`);
                        } else if (item.field === 'priority') {
                            changes.push(`*Priority:* ${item.fromString || 'None'} → ${item.toString || 'None'}`);
                        } else if (item.field === 'assignee') {
                            changes.push(`*Assignee:* ${item.fromString || 'Unassigned'} → ${item.toString || 'Unassigned'}`);
                        } else if (item.field === 'summary') {
                            changes.push(`*Summary:* Updated`);
                        } else if (item.field === 'description') {
                            changes.push(`*Description:* Updated`);
                        } else {
                            changes.push(`*${item.field}:* ${item.fromString || 'None'} → ${item.toString || 'None'}`);
                        }
                    }
                    changeDetails = changes.join('\n');
                }
                
                return `📝 *Issue Updated*\n` +
                       `━━━━━━━━━━━━━━━━\n` +
                       `*Key:* ${issueKey}\n` +
                       `*Summary:* ${issueSummary}\n` +
                       `*Current Status:* ${status}\n` +
                       `*Current Priority:* ${priority}\n` +
                       `*Current Assignee:* ${assignee}\n` +
                       `${changeDetails ? `\n*Changes:*\n${changeDetails}` : ''}\n` +
                       `${issueUrl ? `*Link:* ${issueUrl}` : ''}`;
            }
            
            
            case 'comment_created': {
                const commentAuthor = comment?.author?.displayName || 'Unknown';
                const commentBody = this.stripHtml(comment?.body || '');
                return `💬 *New Comment Added*\n` +
                       `━━━━━━━━━━━━━━━━\n` +
                       `*Issue:* ${issueKey}\n` +
                       `*Summary:* ${issueSummary}\n` +
                       `*Author:* ${commentAuthor}\n` +
                       `*Comment:*\n${commentBody}\n` +
                       `${issueUrl ? `*Issue Link:* ${issueUrl}` : ''}`;
            }
            
            case 'comment_updated': {
                const commentAuthor = comment?.author?.displayName || 'Unknown';
                const commentBody = this.stripHtml(comment?.body || '');
                let commentChange = '';
                if (changelog && changelog.items) {
                    for (const item of changelog.items) {
                        if (item.field === 'comment') {
                            commentChange = `*Edited:* ${item.fromString ? this.stripHtml(item.fromString) + ' → ' : ''}${item.toString ? this.stripHtml(item.toString) : ''}`;
                        }
                    }
                }
                return `💬 *Comment Updated*\n` +
                       `━━━━━━━━━━━━━━━━\n` +
                       `*Issue:* ${issueKey}\n` +
                       `*Summary:* ${issueSummary}\n` +
                       `*Author:* ${commentAuthor}\n` +
                       `${commentChange ? `*Change:*\n${commentChange}\n` : `*New Content:*\n${commentBody}\n`}` +
                       `${issueUrl ? `*Issue Link:* ${issueUrl}` : ''}`;
            }
            
            case 'comment_deleted': {
                let deletedBy = 'Unknown';
                if (user) {
                    deletedBy = user.displayName || 'Unknown';
                }
                return `💬 *Comment Deleted*\n` +
                       `━━━━━━━━━━━━━━━━\n` +
                       `*Issue:* ${issueKey}\n` +
                       `*Summary:* ${issueSummary}\n` +
                       `*Deleted by:* ${deletedBy}\n` +
                       `${issueUrl ? `*Issue Link:* ${issueUrl}` : ''}`;
            }
            
            case 'sprint_started':
                return `🏃 *Sprint Started*\n` +
                       `━━━━━━━━━━━━━━━━\n` +
                       `*Sprint:* ${issue?.name || 'Unknown'}\n` +
                       `*Project:* ${projectKey}`;
            
            case 'sprint_closed':
                return `🏁 *Sprint Closed*\n` +
                       `━━━━━━━━━━━━━━━━\n` +
                       `*Sprint:* ${issue?.name || 'Unknown'}\n` +
                       `*Project:* ${projectKey}`;
            
            default:
                return `📋 *Jira Event:* ${webhookEvent}\n` +
                       `━━━━━━━━━━━━━━━━\n` +
                       `*Issue:* ${issueKey}\n` +
                       `*Summary:* ${issueSummary}\n` +
                       `*Status:* ${status}\n` +
                       `${issueUrl ? `*Link:* ${issueUrl}` : ''}`;
        }
    }

    private stripHtml(html: string): string {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').trim();
    }
}
