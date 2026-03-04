# Jira Integration for Rocket.Chat

A comprehensive Jira integration app for Rocket.Chat that allows users to interact with Jira directly from their chat workspace.

## Features

### Authentication
- **OAuth2 Integration**: Secure login with Jira using OAuth2 flow

### Issue Management
- **Create Issues**: Create Jira issues with project, type, summary, description, priority, assignee, and deadline
- **View My Issues**: Browse all issues assigned to you with detailed information
- **Search Issues**: Advanced search with filters for project, status, issue type, priority, and assignee
- **Issue Details**: View comprehensive issue details including comments, status, and metadata

### Issue Operations
- **Assign Issues**: Assign issues to yourself or other users (by `@username` or `me`)
- **Share Issues**: Share issue details with users (`@username`) or channels (`#channel`)
- **Add Comments**: Add comments to Jira issues directly from Rocket.Chat
- **Set Deadline**: Update issue due dates using natural language (`today`, `tomorrow`) or specific dates
- **Update Status**: Transition issues to different statuses (e.g., "To Do", "In Progress", "Done")

### Subscriptions & Notifications
- **Webhook Integration**: Real-time notifications for Jira issue updates
- **Channel Subscriptions**: Subscribe channels to specific Jira projects and events
- **Event Types**: Support for issue created, updated, and deleted events
- **Smart Notifications**: Different notification types for channel changes vs. direct assignment/priority changes

## Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/jira login` | Authenticate with Jira | `/jira login` |
| `/jira create` | Create a new Jira issue (opens modal) | `/jira create` |
| `/jira create <type> <project> <summary>` | Quick create an issue | `/jira create Task PROJ "Fix login bug"` |
| `/jira my` | View all issues assigned to you | `/jira my` |
| `/jira search` | Search issues with filters (opens modal) | `/jira search` |
| `/jira assign <issue_key> <assignee>` | Assign an issue to a user | `/jira assign PROJ-123 @user` or `/jira assign PROJ-123 me` |
| `/jira assign` | Open assign modal | `/jira assign` |
| `/jira share <issue_key> <target>` | Share issue with user or channel | `/jira share PROJ-123 @user` or `/jira share PROJ-123 #channel` |
| `/jira set deadline <issue_key> <value>` | Set issue deadline | `/jira set deadline PROJ-123 today` |
| `/jira set status <issue_key> <status>` | Update issue status | `/jira set status PROJ-123 "In Progress"` |
| `/jira subscribe` | Subscribe channel to Jira project events | `/jira subscribe` |

## Installation

### Prerequisites
- Rocket.Chat Server (v8 or higher)
- Rocket.Chat Apps CLI (`@rocket.chat/apps-cli`)

### Setup

1. **Install the CLI** (if not already installed):
   ```sh
   npm install -g @rocket.chat/apps-cli
   ```

2. **Clone the repository**:
   ```sh
   git clone https://github.com/<yourusername>/Apps.Jira
   cd Apps.Jira
   ```

3. **Install dependencies**:
   ```sh
   npm install
   ```

4. **Deploy the app**:
   ```sh
   rc-apps deploy --url <rocketchat_url> --username <username> --password <password>
   ```

### Configuration

After deployment, configure the app settings in Rocket.Chat:

1. Go to **Marketplace > Installed | Private Apps > Jira**
2. Set the following required settings:
   - **Client ID**: Your Jira OAuth app client ID
   - **Client Secret**: Your Jira OAuth app client secret
   - **Cloud URL**: Your Jira cloud instance URL

## Setting up Jira OAuth

1. Go to [developer.atlassian.com](https://developer.atlassian.com/console/myapps/)
2. Create a new OAuth 2.0 integration
3. Add the callback URL: `https://<your-rocketchat-server>/api/apps/public/cef7aa7a-c96a-4bcf-8752-2e50bd34e22f/callback`
5. Copy the Client ID and Client Secret to the app settings

## Documentation

- [Rocket.Chat Apps TypeScript Definitions](https://rocketchat.github.io/Rocket.Chat.Apps-engine/)
- [Rocket.Chat Apps Engine Repository](https://github.com/RocketChat/Rocket.Chat.Apps-engine)
- [Example Rocket.Chat Apps](https://github.com/graywolf336/RocketChatApps)

## Community

- [App Requests Forum](https://forums.rocket.chat/c/rocket-chat-apps/requests)
- [App Guides Forum](https://forums.rocket.chat/c/rocket-chat-apps/guides)
- [#rocketchat-apps on Open.Rocket.Chat](https://open.rocket.chat/channel/rocketchat-apps)

## License

[MIT](LICENSE)
