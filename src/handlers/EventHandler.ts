import {
    IRead,
    IHttp,
    IPersistence,
    IModify,
} from "@rocket.chat/apps-engine/definition/accessors";
import { JiraApp } from "../../JiraApp";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { SubscriptionPersistence } from "../persistance/subscriptionPersistence";
import { sendDM, sendMessage } from "../helpers/message";
import { IWebhookPayload } from "../interfaces/IWebhook";
import {
    IChannelSubscription,
    IUserSubscription,
} from "../interfaces/ISubscription";

export class EventHandler {
    private subscription: SubscriptionPersistence;
    constructor(
        protected readonly app: JiraApp,
        protected readonly read: IRead,
        protected readonly http: IHttp,
        protected readonly persistence: IPersistence,
        protected readonly modify: IModify,
    ) {
        this.subscription = new SubscriptionPersistence(
            this.persistence,
            this.read.getPersistenceReader(),
        );
    }

    public async handleIssueUpdateEvent(payload: IWebhookPayload) {
        const projectKey = payload.issue?.fields?.project.key;
        const issueKey = payload.issue?.key;
        const changelog = payload.changelog;
        const issueSummary = payload.issue?.fields?.summary;
        const issueUrl = payload.issue?.self
            ? payload.issue.self.replace(
                  "/rest/api/2/issue/" + issueKey,
                  "/browse/" + issueKey,
              )
            : "";

        const status = payload.issue?.fields?.status?.name;
        const assignee =
            payload.issue?.fields?.assignee?.displayName || "Unassigned";

        const channelChanges: string[] = [];
        const dmChanges: string[] = [];

        if (changelog && changelog.items) {
            changelog.items.forEach((item) => {
                if (item.field === "status") {
                    channelChanges.push(
                        `*Status:* ${item.fromString || "None"} → ${item.toString || "None"}`,
                    );
                } else if (item.field === "summary") {
                    channelChanges.push(`*Summary:* Updated`);
                } else if (item.field === "description") {
                    channelChanges.push(`*Description:* Updated`);
                } else if (item.field === "labels") {
                    channelChanges.push(
                        `*Labels:* ${item.fromString || "None"} → ${item.toString || "None"}`,
                    );
                } else if (item.field === "assignee") {
                    dmChanges.push(
                        `*Assignee:* ${item.fromString || "None"} → ${item.toString || "None"}`,
                    );
                } else if (
                    item.field === "duedate" ||
                    item.field === "due date"
                ) {
                    dmChanges.push(
                        `*Deadline:* ${item.fromString || "None"} → ${item.toString || "None"}`,
                    );
                } else if (
                    item.field === "timetracking" ||
                    item.field === "time tracking"
                ) {
                    dmChanges.push(
                        `*Time Tracking:* ${item.fromString || "None"} → ${item.toString || "None"}`,
                    );
                } else if (item.field === "priority") {
                    dmChanges.push(
                        `*Priority:* ${item.fromString || "None"} → ${item.toString || "None"}`,
                    );
                }
            });
        }

        const channelChangeDetails = channelChanges.join("\n");
        const dmChangeDetails = dmChanges.join("\n");

        if (channelChangeDetails) {
            const channelMessage =
                `📝 *Issue Updated*\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `*Key:* ${issueKey}\n` +
                `*Summary:* ${issueSummary}\n` +
                `*Current Status:* ${status}\n` +
                `*Current Assignee:* ${assignee}\n` +
                `\n*Changes:*\n${channelChangeDetails}\n` +
                `${issueUrl ? `\n*Link:* ${issueUrl}` : ""}`;

            const channels = (await this.subscription.getSubscribedChannels(
                projectKey as string,
            )) as IChannelSubscription[];
            for (const channel of channels) {
                const room = await this.read
                    .getRoomReader()
                    .getById(channel.roomId);
                await sendMessage(
                    this.read,
                    this.modify,
                    room as IRoom,
                    undefined,
                    channelMessage,
                );
            }
        }

        if (dmChangeDetails && issueKey) {
            const dmMessage =
                `📝 *Issue Updated*\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `*Key:* ${issueKey}\n` +
                `*Summary:* ${issueSummary}\n` +
                `*Current Status:* ${status}\n` +
                `*Current Assignee:* ${assignee}\n` +
                `\n*Changes:*\n${dmChangeDetails}\n` +
                `${issueUrl ? `\n*Link:* ${issueUrl}` : ""}`;

            const userSubscriptions =
                await this.subscription.getUserSubscribedToIssue(issueKey);
            for (let userSubscription of userSubscriptions as IUserSubscription[]) {
                try {
                    const user = await this.read
                        .getUserReader()
                        .getById(userSubscription.userId);
                    await sendDM(this.read, this.modify, user, dmMessage);
                } catch (error) {
                    console.log("Error sending DM to user:", error);
                }
            }
        }
    }
}
