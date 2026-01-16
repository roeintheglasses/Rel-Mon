# User Guide

Welcome to Release Coordinator, your comprehensive release management solution. This guide will walk you through all features and workflows to help you effectively manage releases across your services.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Team Setup](#team-setup)
3. [Service Creation](#service-creation)
4. [Release Management](#release-management)
5. [Release Dependencies](#release-dependencies)
6. [Sprint Planning](#sprint-planning)
7. [Deployment Groups](#deployment-groups)
8. [Integrations Setup](#integrations-setup)
9. [Notifications Configuration](#notifications-configuration)

---

## Getting Started

### Signing Up

1. Navigate to the Release Coordinator application
2. Click **Sign In** or **Sign Up**
3. Create an account using your email address or OAuth provider
4. Complete your profile with your name and avatar


### Creating Your First Organization

After signing in, you'll need to create or join an organization:

1. Click **Create Organization** from the dashboard
2. Enter your organization name and slug
3. Click **Create**
4. You'll automatically be assigned as the organization owner


### Understanding User Roles

Release Coordinator supports four team roles with different permissions:

- **OWNER**: Full access to all features, can manage billing and delete the organization
- **ADMIN**: Can manage team members, services, and all releases
- **MEMBER**: Can create and manage releases, view all team data
- **VIEWER**: Read-only access to all team data

---

## Team Setup

### Inviting Team Members

**Step-by-step:**

1. Navigate to **Settings** → **Members**
2. Click **Invite Member**
3. Enter the team member's email address
4. Select their role (OWNER, ADMIN, MEMBER, or VIEWER)
5. Click **Send Invitation**


**What happens next:**
- The invitee receives an email with an invitation link
- The invitation is valid for 7 days
- Once accepted, they'll appear in your team members list

### Managing Team Members

**Viewing members:**
- Navigate to **Settings** → **Members**
- See all active members with their roles and join dates

**Changing roles:**
1. Find the member in the list
2. Click the dropdown menu next to their name
3. Select **Change Role**
4. Choose the new role and confirm

**Removing members:**
1. Click the dropdown menu next to the member's name
2. Select **Remove from Team**
3. Confirm the action


### Managing Pending Invitations

View and manage pending invitations from the Members page:

1. Navigate to **Settings** → **Members**
2. Scroll to the **Pending Invitations** section
3. You can:
   - **Resend** an invitation
   - **Revoke** an invitation before it's accepted

---

## Service Creation

Services represent your applications, microservices, or systems that require release management.

### Creating a Service

**Step-by-step:**

1. Navigate to **Services** from the main menu
2. Click **New Service**
3. Fill in the service details:
   - **Name**: The service name (e.g., "User API")
   - **Description**: Optional description of what the service does
   - **Repository Owner**: GitHub organization or user (optional)
   - **Repository Name**: GitHub repository name (optional)
   - **Jira Project Key**: Jira project identifier (optional, e.g., "PROJ")
   - **Color**: Choose a color to identify this service visually
4. Click **Create Service**


### Service Fields Explained

- **Repository Owner & Name**: Links to your GitHub repository
  - Used to search and link pull requests to releases
  - Requires GitHub integration (see [Integrations Setup](#integrations-setup))

- **Jira Project Key**: Links to your Jira project
  - Used to search and link Jira tickets to releases
  - Requires Jira integration (see [Integrations Setup](#integrations-setup))

- **Color**: Visual identifier
  - Used throughout the UI to quickly identify releases from this service
  - Appears as colored dots in tables and lists

### Editing Services

1. Navigate to **Services**
2. Find the service you want to edit
3. Click the **⋮** menu icon
4. Select **Edit**
5. Update the fields and click **Save Changes**


### Archiving Services

To archive a service (marks it as inactive without deleting):

1. Navigate to **Services**
2. Click the **⋮** menu icon next to the service
3. Select **Archive**
4. Confirm the action

Archived services:
- Won't appear in the default services list
- Cannot have new releases created
- Existing releases remain accessible

---

## Release Management

Releases represent a deployable unit of work, typically containing multiple features, bug fixes, or changes.

### Creating a Release

**Step-by-step:**

1. Navigate to **Releases** from the main menu
2. Click **New Release**
3. Fill in the release details:
   - **Title** (required): Descriptive name (e.g., "User Authentication v2")
   - **Service** (required): Select which service this release belongs to
   - **Sprint** (optional): Associate with a sprint
   - **Version** (optional): Version number (e.g., "2.1.0")
   - **Target Date** (optional): Expected deployment date
   - **Description** (optional): Details about what's included
4. Click **Create Release**


### Release Lifecycle

Releases progress through a comprehensive workflow with 10 possible statuses:

#### 1. **PLANNING** (Initial Status)
- Release is being planned
- Requirements are being gathered
- No development has started yet

**Common actions:**
- Adding Jira tickets
- Adding GitHub PRs
- Defining release scope
- Setting target dates

#### 2. **IN_DEVELOPMENT**
- Active development is underway
- Code is being written
- PRs are being created

**Moving to this status:**
1. Open the release detail page
2. Click the **Status** dropdown
3. Select **In Development**

#### 3. **IN_REVIEW**
- Code is complete and under review
- PRs are being reviewed
- QA testing may begin

**Best practices:**
- Ensure all PRs are linked
- Review checklist is complete
- No outstanding blockers

#### 4. **READY_STAGING**
- Ready to be deployed to staging environment
- All reviews are complete
- All tests are passing

**Automatic notifications:**
- If "Ready to Deploy" notifications are enabled, team will be notified via Slack

#### 5. **IN_STAGING**
- Currently deployed to staging
- Undergoing validation and testing

**To record deployment:**
1. Change status to **In Staging**
2. The system automatically records `stagingDeployedAt` timestamp

#### 6. **STAGING_VERIFIED**
- Testing in staging is complete
- Release is verified and working as expected
- Ready for production deployment

#### 7. **READY_PRODUCTION**
- Approved for production deployment
- Waiting for deployment window
- All stakeholders have signed off

**Automatic notifications:**
- Team will be notified that release is ready for production

#### 8. **DEPLOYED**
- Successfully deployed to production
- Release is live
- End of the standard release lifecycle

**To record deployment:**
1. Change status to **Deployed**
2. The system automatically records `prodDeployedAt` timestamp

#### 9. **CANCELLED**
- Release was cancelled and will not be deployed
- Work may have been deprioritized or obsolete

**When to use:**
- Requirements changed
- Feature no longer needed
- Merged into another release

#### 10. **ROLLED_BACK**
- Release was deployed but had to be reverted
- Issues were found in production

**When to use:**
- Critical bugs discovered post-deployment
- Performance issues
- Rollback was necessary


### Release Status Workflow

Here's a typical release progression:

```
PLANNING
   ↓
IN_DEVELOPMENT
   ↓
IN_REVIEW
   ↓
READY_STAGING
   ↓
IN_STAGING
   ↓
STAGING_VERIFIED
   ↓
READY_PRODUCTION
   ↓
DEPLOYED
   ↓ (if issues found)
ROLLED_BACK
```

Alternative path:
```
PLANNING → CANCELLED (if deprioritized)
```

### Release Details Page

Click on any release to see its detailed view, which includes:

**Overview Section:**
- Release title and version
- Service information
- Current status
- Target and deployment dates
- Owner information
- Description

**Items Tab:**
- Linked Jira tickets
- Linked GitHub pull requests
- Add new items

**Dependencies Tab:**
- Other releases this release depends on
- Other releases that depend on this release
- Add new dependencies

**Activity Tab:**
- Complete audit trail of all changes
- Status changes
- Items added/removed
- Comments

**Comments Section:**
- Team discussions
- Notes and updates
- @mention team members


### Adding Items to a Release

#### Linking Jira Tickets

**Prerequisites:**
- Personal Jira integration must be configured (see [Integrations Setup](#integrations-setup))
- Service must have a Jira Project Key configured

**Steps:**
1. Open the release detail page
2. Go to the **Items** tab
3. Click **Add Jira Ticket**
4. Search for tickets by ID or summary
5. Select the ticket from search results
6. Click **Add**

**What gets synced:**
- Ticket ID and title
- Current status
- Assignee
- Link to Jira


#### Linking GitHub Pull Requests

**Prerequisites:**
- Personal GitHub integration must be configured (see [Integrations Setup](#integrations-setup))
- Service must have Repository Owner and Name configured

**Steps:**
1. Open the release detail page
2. Go to the **Items** tab
3. Click **Add Pull Request**
4. Search for PRs by number or title
5. Select the PR from search results
6. Click **Add**

**What gets synced:**
- PR number and title
- Current state (open, merged, closed)
- Author
- Link to GitHub


### Release Priority Levels

Set priority to help your team focus on what matters most:

- **LOW**: Nice to have, not time-sensitive
- **MEDIUM**: Standard priority (default)
- **HIGH**: Important, should be delivered soon
- **CRITICAL**: Urgent, highest priority

**To set priority:**
1. Open the release detail page
2. Click **Priority** dropdown
3. Select the appropriate level

### Marking a Release as Hotfix

Hotfixes are urgent releases that bypass normal processes:

1. Open the release detail page
2. Toggle the **Hotfix** switch
3. Hotfix releases are highlighted in lists

**Hotfix indicators:**
- Special badge in release lists
- Can be filtered separately
- Often skip standard approval gates

### Blocking a Release

When a release encounters an impediment:

1. Open the release detail page
2. Toggle the **Blocked** switch
3. Enter the **Blocked Reason** (required)
4. Team will be notified if blocked notifications are enabled

**When to block:**
- Waiting on another team
- Technical blocker discovered
- Missing requirements
- External dependency issue

**To unblock:**
1. Toggle the **Blocked** switch off
2. Team will be notified the release is unblocked


### Assigning an Owner

Release owners are responsible for coordinating the release:

1. Open the release detail page
2. Click the **Owner** field
3. Select a team member
4. The owner is notified of the assignment

**Owner responsibilities:**
- Track release progress
- Coordinate with stakeholders
- Manage blockers
- Communicate status

### Adding Comments

Collaborate with your team using comments:

1. Open the release detail page
2. Scroll to the **Comments** section
3. Type your comment in the text field
4. Click **Post Comment**

**Comment features:**
- Markdown support
- Edit your own comments
- Delete your own comments
- All comments are timestamped


---

## Release Dependencies

Dependencies help you manage releases that must be deployed in a specific order or have relationships with each other.

### Understanding Dependency Types

**BLOCKS**: Release A must be deployed before Release B
- Strict dependency
- Prevents deployment of blocked release
- Use when order is critical

**SOFT_DEPENDENCY**: Release B works better with Release A
- Suggested but not required
- Can still deploy without the dependency
- Use for optional enhancements

**REQUIRES_SYNC**: Releases should be deployed together
- Coordinated deployment needed
- Consider using Deployment Groups instead
- Use when releases must go out simultaneously

### Adding a Dependency

**Step-by-step:**

1. Open the release detail page
2. Go to the **Dependencies** tab
3. Click **Add Dependency**
4. Select the **dependency type** (BLOCKS, SOFT_DEPENDENCY, REQUIRES_SYNC)
5. Search and select the **blocking release**
6. Optionally add a **description** explaining why
7. Click **Add Dependency**


### Example Scenarios

**Example 1: Database Migration**
- Release A: "Database Schema Update v2"
- Release B: "API Update to use new schema"
- **Dependency**: B depends on A (BLOCKS)
- **Reason**: API will fail without updated schema

**Example 2: Optional Enhancement**
- Release A: "User Profile Cache Layer"
- Release B: "User Profile Page Performance"
- **Dependency**: B depends on A (SOFT_DEPENDENCY)
- **Reason**: Performance improvements work better with cache

**Example 3: Coordinated Release**
- Release A: "Frontend: New Checkout Flow"
- Release B: "Backend: New Payment API"
- **Dependency**: Requires sync
- **Better solution**: Create a Deployment Group (see below)

### Resolving Dependencies

When the blocking release is deployed:

1. Open the dependent release
2. Go to **Dependencies** tab
3. Click **Mark Resolved** next to the dependency
4. The dependency is marked complete with a timestamp


---

## Sprint Planning

Sprints help you organize releases into time-boxed iterations.

### Creating a Sprint

**Step-by-step:**

1. Navigate to **Sprints** from the main menu
2. Click **New Sprint**
3. Fill in sprint details:
   - **Name** (required): Sprint identifier (e.g., "Sprint 24", "Q1 2024")
   - **Start Date** (required): When the sprint begins
   - **End Date** (required): When the sprint ends
   - **Goal** (optional): Sprint objective or theme
4. Click **Create Sprint**


### Sprint Statuses

Sprints progress through four statuses:

**PLANNING**
- Sprint is being planned
- Releases are being assigned
- Not yet started

**ACTIVE**
- Sprint is currently in progress
- Team is working on assigned releases
- Most recent active sprint is highlighted

**COMPLETED**
- Sprint has ended
- All releases are deployed or moved to next sprint
- Historical record maintained

**CANCELLED**
- Sprint was cancelled
- Releases are reassigned to other sprints

### Adding Releases to a Sprint

**Method 1: During Release Creation**
1. When creating a new release
2. Select the sprint from the **Sprint** dropdown
3. Create the release

**Method 2: From Release Detail**
1. Open an existing release
2. Click **Edit**
3. Select the sprint from the dropdown
4. Save changes

**Method 3: Bulk Assignment**
1. Navigate to the sprint detail page
2. Click **Assign Releases**
3. Select multiple releases
4. Click **Assign to Sprint**


### Sprint Velocity and Metrics

The sprint detail page shows:
- Total releases in sprint
- Releases by status
- Completion percentage
- Deployed vs pending releases

Use these metrics to:
- Track sprint progress
- Identify bottlenecks
- Improve estimation over time

### Managing Sprint Timeline

**Starting a Sprint:**
1. Open the sprint
2. Change status to **ACTIVE**
3. Team is notified

**Completing a Sprint:**
1. Ensure all releases are deployed or reassigned
2. Change status to **COMPLETED**
3. Sprint is archived but remains accessible

**Cancelling a Sprint:**
1. Open the sprint
2. Change status to **CANCELLED**
3. Reassign releases to other sprints

---

## Deployment Groups

Deployment Groups coordinate multiple releases that need to be deployed together or in a specific sequence.

### When to Use Deployment Groups

Use deployment groups when:
- Multiple services must deploy simultaneously (e.g., frontend + backend)
- Services must deploy in a specific order (e.g., database → API → UI)
- You want to coordinate releases across teams
- You need to track a multi-service release as one unit

### Creating a Deployment Group

**Step-by-step:**

1. Navigate to **Deployment Groups** from the main menu
2. Click **Create Group**
3. Fill in the details:
   - **Name** (required): Descriptive name (e.g., "Q1 Platform Release")
   - **Description** (optional): What this group includes
   - **Sprint** (optional): Associate with a sprint
   - **Deploy Order** (required): Choose deployment strategy
     - **Sequential**: Releases deploy one after another in order
     - **Simultaneous**: All releases deploy at the same time
   - **Target Date** (optional): When you plan to deploy
   - **Notify when ready**: Toggle to enable notifications
4. Click **Create Group**


### Understanding Deploy Order

**Sequential Deployment:**
- Releases must deploy in the order specified
- Wait for one release to complete before starting the next
- Use for: database migrations, API updates, then UI updates

**Example sequence:**
1. Database Migration
2. Backend API Update
3. Frontend Update

**Simultaneous Deployment:**
- All releases deploy at the same time
- No dependencies between releases
- Use for: independent services, parallel rollouts

**Example:**
- Deploy multiple microservices together
- All are ready and can go live simultaneously


### Assigning Releases to a Group

**Step-by-step:**

1. Navigate to **Deployment Groups**
2. Find your group and click the **⋮** menu
3. Select **Manage Releases**
4. Check the releases you want to include
5. Click **Save Changes**

**For Sequential groups:**
- Drag and drop to reorder releases
- The order determines deployment sequence
- Top to bottom is the deployment order


### Deployment Group Status Flow

Groups progress through five statuses:

**PENDING**
- Initial status
- Releases are being prepared
- Not all releases are ready to deploy

**READY**
- All releases in the group are ready
- Can proceed with deployment
- Team is notified (if enabled)

**DEPLOYING**
- Deployment is in progress
- Track progress on the group detail page

**DEPLOYED**
- All releases successfully deployed
- Group is complete
- Deployment timestamp recorded

**CANCELLED**
- Deployment was cancelled
- Releases remain assigned but group is inactive

### Managing a Deployment

**To start deployment:**
1. Ensure all releases are in a deployable state
2. Open the deployment group
3. Click the **⋮** menu
4. Select **Start Deployment**
5. Status changes to **DEPLOYING**

**During deployment:**
- Update individual release statuses as they deploy
- For sequential: deploy in the specified order
- For simultaneous: deploy all at once

**To mark as deployed:**
1. Once all releases are deployed
2. Click the **⋮** menu
3. Select **Mark Deployed**
4. System records `deployedAt` timestamp


### Notifications

When "Notify when ready" is enabled:
- Team receives Slack notification when group status becomes READY
- Notification includes:
  - Group name
  - Number of releases
  - Target date
  - Link to the group

---

## Integrations Setup

Release Coordinator integrates with Jira and GitHub to link tickets and pull requests to your releases.

### Important: Personal Integrations

**Key concept:** Integrations in Release Coordinator are **personal**, not team-wide.

- Each team member connects their own Jira and GitHub accounts
- Your personal OAuth tokens are used for searches and linking
- Tokens are encrypted at rest
- Only you can see items from your searches
- Once linked to a release, items are visible to the whole team

### Jira Integration

#### Setting Up Jira

**Prerequisites:**
- You need a Jira account with access to the projects you want to link
- Admin permissions not required

**Step-by-step:**

1. Navigate to **Settings** → **Integrations**
2. Find the **Jira** card
3. Click **Connect Jira**
4. You'll be redirected to Atlassian
5. Select your Jira site
6. Review and approve the permissions requested:
   - Read Jira project and issue data
   - Read user profile information
7. Click **Accept**
8. You'll be redirected back to Release Coordinator

**Connection confirmed:**
- Green badge showing "Connected"
- Your Jira account email displayed
- Jira site URL shown
- Last used timestamp


#### What You Can Do With Jira Integration

Once connected, you can:
- Search for Jira tickets when adding items to releases
- See ticket status and updates
- Link directly to Jira from release details
- Sync ticket metadata automatically

#### Testing Your Jira Connection

To verify it's working:
1. Go to any release detail page
2. Click **Add Jira Ticket**
3. Try searching for a known ticket ID
4. If results appear, integration is working

#### Troubleshooting Jira Integration

**If you see "Integration Error":**
1. Click **Reconnect** on the Integrations page
2. Go through the OAuth flow again
3. Check that your Jira account hasn't been deactivated

**If searches return no results:**
- Verify the service has a Jira Project Key set
- Check that you have access to that Jira project
- Try searching with a different ticket ID

#### Disconnecting Jira

To disconnect:
1. Navigate to **Settings** → **Integrations**
2. Find the Jira card
3. Click **Disconnect**
4. Confirm the action

**What happens:**
- Your OAuth token is deleted
- You can no longer search or link new Jira tickets
- Existing linked tickets remain visible to the team
- You can reconnect at any time


### GitHub Integration

#### Setting Up GitHub

**Prerequisites:**
- You need a GitHub account
- Access to the repositories you want to link

**Step-by-step:**

1. Navigate to **Settings** → **Integrations**
2. Find the **GitHub** card
3. Click **Connect GitHub**
4. You'll be redirected to GitHub
5. Review and approve the permissions requested:
   - Read access to repositories
   - Read access to pull requests
   - Read user profile information
6. Click **Authorize**
7. You'll be redirected back to Release Coordinator

**Connection confirmed:**
- Green badge showing "Connected"
- Your GitHub account email displayed
- Last used timestamp


#### What You Can Do With GitHub Integration

Once connected, you can:
- Search for pull requests when adding items to releases
- See PR status (open, merged, closed)
- Link directly to GitHub from release details
- Track which PRs are in which releases

#### Testing Your GitHub Connection

To verify it's working:
1. Go to any release detail page
2. Click **Add Pull Request**
3. Try searching for a known PR number
4. If results appear, integration is working

#### Troubleshooting GitHub Integration

**If you see "Integration Error":**
1. Click **Reconnect** on the Integrations page
2. Go through the OAuth flow again
3. Check that your GitHub token hasn't been revoked

**If searches return no results:**
- Verify the service has Repository Owner and Name set correctly
- Check that you have access to that repository
- Ensure the repository is not private (unless your token has access)

#### Disconnecting GitHub

To disconnect:
1. Navigate to **Settings** → **Integrations**
2. Find the GitHub card
3. Click **Disconnect**
4. Confirm the action

**What happens:**
- Your OAuth token is deleted
- You can no longer search or link new pull requests
- Existing linked PRs remain visible to the team
- You can reconnect at any time

### Security and Privacy

**Token storage:**
- All OAuth tokens are encrypted at rest using AES-256
- Tokens are only decrypted when making API calls
- Tokens are never exposed in the UI or logs

**Token refresh:**
- Tokens are automatically refreshed when they expire
- If refresh fails, you'll be prompted to reconnect

**Permissions:**
- We only request the minimum permissions needed
- We never write data to Jira or GitHub
- All operations are read-only

**Revoking access:**
- Disconnecting removes tokens from our database
- For complete revocation, also remove the OAuth app from:
  - Jira: Account Settings → Connected apps
  - GitHub: Settings → Applications → Authorized OAuth Apps

---

## Notifications Configuration

Stay informed about release progress with Slack notifications.

### Understanding Notifications

**Team-level notifications:**
- Configured once at the team level
- All team members receive notifications in the configured Slack channel
- Owner/Admin role required to configure

**What gets notified:**
- Release status changes (when enabled)
- Releases becoming blocked/unblocked (when enabled)
- Releases ready to deploy (when enabled)
- Deployment groups becoming ready (when enabled)

### Setting Up Slack Notifications

#### Step 1: Create a Slack Webhook

**In Slack:**

1. Go to [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
2. Click **Create your Slack app**
3. Choose **From scratch**
4. Enter an app name (e.g., "Release Coordinator Notifications")
5. Select your Slack workspace
6. Click **Create App**
7. Click **Incoming Webhooks**
8. Toggle **Activate Incoming Webhooks** to **On**
9. Click **Add New Webhook to Workspace**
10. Select the channel for notifications (e.g., #releases)
11. Click **Allow**
12. **Copy** the webhook URL (starts with `https://hooks.slack.com/services/...`)


#### Step 2: Configure in Release Coordinator

**In Release Coordinator:**

1. Navigate to **Settings** → **Notifications**
2. Find the **Slack Integration** section
3. Click **Add Webhook** (or **Update Webhook** if already configured)
4. Paste your webhook URL
5. Optionally, enter a **Channel Override** (e.g., `#releases`)
   - Leave blank to use the webhook's default channel
6. Click **Save Webhook**

**Connection confirmed:**
- Green "Connected" badge appears
- Channel name displayed (if override used)


#### Step 3: Test the Connection

1. Click **Send Test Message**
2. Check your Slack channel
3. You should see a test notification from Release Coordinator

If the test fails:
- Verify the webhook URL is correct
- Check that the webhook hasn't been revoked in Slack
- Ensure the channel still exists

### Configuring Notification Preferences

Choose which events trigger notifications:

#### Status Changes

**When to enable:**
- You want to track release progress through the pipeline
- Team needs visibility into status transitions

**What triggers notifications:**
- Any status change (PLANNING → IN_DEVELOPMENT, etc.)
- Status change initiated by any team member

**Notification includes:**
- Release title and version
- Old status → New status
- Who made the change
- Link to the release

**To toggle:**
1. Navigate to **Settings** → **Notifications**
2. Find **Status Changes** preference
3. Toggle the switch on/off


#### Ready to Deploy

**When to enable:**
- You want to be notified when releases are ready for staging or production
- Deployment requires coordination or approval

**What triggers notifications:**
- Release status changes to READY_STAGING
- Release status changes to READY_PRODUCTION
- Deployment group status changes to READY

**Notification includes:**
- Release or group name
- Environment (staging or production)
- Target date (if set)
- Link to the release/group

**To toggle:**
1. Navigate to **Settings** → **Notifications**
2. Find **Ready to Deploy** preference
3. Toggle the switch on/off

#### Blocked Releases

**When to enable:**
- You want immediate visibility into blockers
- Team needs to mobilize quickly to unblock releases

**What triggers notifications:**
- Release is marked as blocked
- Release is unblocked
- Blocked reason is updated

**Notification includes:**
- Release title
- Blocked/unblocked status
- Blocked reason (if provided)
- Who made the change
- Link to the release

**To toggle:**
1. Navigate to **Settings** → **Notifications**
2. Find **Blocked Releases** preference
3. Toggle the switch on/off

### Example Notification Flows

**Scenario 1: Standard Release Flow**
1. Developer creates release (status: PLANNING) - no notification
2. Moves to IN_DEVELOPMENT - notification sent (if status changes enabled)
3. Moves to IN_REVIEW - notification sent
4. Moves to READY_STAGING - notification sent (status + ready to deploy)
5. Moves to IN_STAGING - notification sent
6. Becomes blocked due to bug - notification sent (blocked releases)
7. Unblocked after fix - notification sent
8. Moves to READY_PRODUCTION - notification sent (ready to deploy)
9. Deployed - notification sent

**Scenario 2: Deployment Group**
1. Group created with 3 releases - no notification
2. Releases added to group - no notification
3. All releases reach deployable state
4. Group automatically becomes READY - notification sent
5. Team proceeds with deployment - no notification
6. Group marked DEPLOYED - no notification

### Managing Notification Volume

If you're receiving too many notifications:

**Option 1: Disable specific preferences**
- Turn off "Status Changes" to reduce noise
- Keep "Ready to Deploy" and "Blocked" for critical alerts

**Option 2: Use channel override**
- Create a dedicated #releases-detailed channel
- Send all notifications there
- Team members opt-in to that channel

**Option 3: Create multiple webhooks**
- Critical alerts go to #releases
- All changes go to #releases-verbose
- Configure different webhooks (requires app customization)

### Removing Slack Integration

To stop receiving notifications:

1. Navigate to **Settings** → **Notifications**
2. Click **Remove** next to the webhook
3. Confirm the action

**What happens:**
- Webhook URL is deleted from the system
- All notification preferences are disabled
- You can reconnect at any time

---

## Best Practices

### Release Management

1. **Always set a release owner** - Ensures accountability
2. **Link tickets and PRs early** - Builds complete picture of the release
3. **Use descriptions effectively** - Help future team members understand the release
4. **Update status promptly** - Keeps team informed in real-time
5. **Document blockers clearly** - Helps team resolve issues faster

### Sprint Planning

1. **Don't overcommit** - Be realistic about capacity
2. **Review velocity** - Learn from past sprints
3. **Close sprints on time** - Move incomplete work to next sprint
4. **Set clear sprint goals** - Helps with prioritization

### Deployment Groups

1. **Group related releases only** - Don't create groups "just because"
2. **Choose the right deploy order** - Sequential vs simultaneous
3. **Set target dates** - Helps with planning and coordination
4. **Test the sequence** - Verify sequential dependencies are correct

### Dependencies

1. **Use BLOCKS sparingly** - Only for true hard dependencies
2. **Document why** - Future you will thank you
3. **Resolve promptly** - Update dependency status when blocking release deploys
4. **Consider deployment groups** - Often better than multiple dependencies

### Integrations

1. **Connect early** - Set up Jira and GitHub from day one
2. **Keep services configured** - Ensure repo and project keys are set
3. **Test regularly** - Verify integrations are working
4. **Reconnect when needed** - Don't ignore integration errors

### Notifications

1. **Start with all enabled** - You can always turn off noisy ones
2. **Use a dedicated channel** - Don't spam general channels
3. **Test your webhook** - Verify it works before relying on it
4. **Review periodically** - Adjust as team's needs change

---

## Troubleshooting

### Common Issues

#### Can't Create a Release
**Symptom:** "New Release" button is disabled

**Solution:**
- You must create at least one service first
- Navigate to Services → New Service
- Create a service, then try again

#### Can't Find a Jira Ticket
**Symptom:** Search returns no results

**Possible causes:**
1. Personal Jira integration not connected → Go to Settings → Integrations
2. Service doesn't have Jira Project Key set → Edit the service
3. You don't have access to that Jira project → Check with Jira admin
4. Ticket is in a different project → Verify project key

#### Can't Find a GitHub PR
**Symptom:** Search returns no results

**Possible causes:**
1. Personal GitHub integration not connected → Go to Settings → Integrations
2. Service doesn't have Repository Owner/Name set → Edit the service
3. Repository is private and your token doesn't have access
4. PR is in a fork or different repo

#### Slack Notifications Not Working
**Symptom:** Test message fails or no notifications received

**Solutions:**
1. Verify webhook URL is correct
2. Check webhook hasn't been revoked in Slack
3. Ensure Slack channel still exists
4. Verify notification preferences are enabled
5. Check if the specific event triggers your enabled preferences

#### Integration Shows "Error"
**Symptom:** Red error badge on integration card

**Solutions:**
1. Click "Reconnect" to refresh your token
2. Check if your account has been deactivated
3. Verify the OAuth app hasn't been revoked
4. Try disconnecting and connecting again

### Getting Help

If you continue to experience issues:

1. **Check the Activity Log**
   - Releases page → Release detail → Activity tab
   - See what happened and when

2. **Review Team Settings**
   - Settings page → verify configuration
   - Check that services are set up correctly

3. **Test in Isolation**
   - Try with a new test release
   - Narrow down the issue

4. **Contact Support**
   - Include specific error messages
   - Describe steps to reproduce
   - Share screenshots if helpful

---

## Keyboard Shortcuts

Coming soon! We're working on adding keyboard shortcuts to make navigation even faster.

---

## FAQ

### General

**Q: Can I use Release Coordinator for multiple teams?**
A: Yes, you can be a member of multiple organizations. Switch between them using the organization selector.

**Q: Is there a mobile app?**
A: Not yet, but the web interface is mobile-responsive.

**Q: Can I export my data?**
A: Data export feature is planned for a future release.

### Releases

**Q: Can a release belong to multiple sprints?**
A: No, a release can only be assigned to one sprint at a time.

**Q: Can I delete a deployed release?**
A: Yes, but be careful. Deleting a release removes all associated data including items, dependencies, and comments.

**Q: How do I move a release between services?**
A: Currently, you can't move a release. You'll need to create a new release for the other service.

### Dependencies

**Q: Can I create circular dependencies?**
A: No, the system validates dependencies and rejects circular references. If you attempt to create a dependency that would cause a circular chain (A → B → A), you'll receive a validation error.

**Q: What happens if I delete a release that others depend on?**
A: The dependencies are also deleted. Dependent releases are updated to show the dependency is removed.

### Integrations

**Q: Does everyone on my team need to connect Jira/GitHub?**
A: No, only people who want to search and link items need to connect. Once linked, everyone can see the items.

**Q: Can I use GitHub Enterprise?**
A: Support for GitHub Enterprise is planned but not yet available.

**Q: Can I connect multiple Jira sites?**
A: Not currently. You can only connect to one Jira site at a time.

### Notifications

**Q: Can I get email notifications instead of Slack?**
A: Email notifications are not currently available but are on the roadmap.

**Q: Can different team members receive different notifications?**
A: No, notifications are team-wide. Everyone in the Slack channel receives the same notifications.

**Q: Can I notify specific people for specific releases?**
A: Not through the system. Use release comments and @mentions for targeted communication.

---

## Glossary

**Release**: A deployable unit of work, typically containing features, bug fixes, or changes to a service.

**Service**: An application, microservice, or system that requires release management.

**Sprint**: A time-boxed iteration for organizing and tracking releases.

**Deployment Group**: A collection of releases that need to be deployed together or in sequence.

**Dependency**: A relationship between releases indicating that one must be deployed before another.

**Release Item**: A Jira ticket or GitHub pull request linked to a release.

**Owner**: The team member responsible for coordinating a release or deployment group.

**Hotfix**: An urgent release that typically bypasses normal processes.

**Blocker**: An impediment that prevents a release from progressing.

**Integration**: OAuth connection to external services (Jira, GitHub).

**Webhook**: A Slack incoming webhook URL for sending notifications.

---

## Appendix

### Release Status Reference

| Status | Description | Typical Duration |
|--------|-------------|------------------|
| PLANNING | Initial planning and scoping | 1-3 days |
| IN_DEVELOPMENT | Active development | 1-2 weeks |
| IN_REVIEW | Code review and QA | 2-5 days |
| READY_STAGING | Ready for staging deployment | Minutes-hours |
| IN_STAGING | Deployed to staging, being validated | 1-3 days |
| STAGING_VERIFIED | Verified in staging | Hours-1 day |
| READY_PRODUCTION | Approved for production | Hours-days |
| DEPLOYED | Live in production | N/A |
| CANCELLED | Release cancelled | N/A |
| ROLLED_BACK | Reverted from production | N/A |

### Deployment Group Status Reference

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| PENDING | Being prepared | Edit, Assign releases |
| READY | All releases ready | Start Deployment |
| DEPLOYING | Deployment in progress | Mark Deployed |
| DEPLOYED | Completed successfully | View only |
| CANCELLED | Deployment cancelled | View only |

### Team Role Permissions

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
|------------|-------|-------|--------|--------|
| View releases | ✅ | ✅ | ✅ | ✅ |
| Create releases | ✅ | ✅ | ✅ | ❌ |
| Edit any release | ✅ | ✅ | ✅ | ❌ |
| Delete releases | ✅ | ✅ | ❌ | ❌ |
| Manage services | ✅ | ✅ | ❌ | ❌ |
| Manage sprints | ✅ | ✅ | ❌ | ❌ |
| Manage deployment groups | ✅ | ✅ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Configure integrations | ✅ | ✅ | ✅ | ✅ |
| Configure notifications | ✅ | ✅ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ | ❌ |

---

## What's Next?

Now that you understand all the features, start by:

1. ✅ Setting up your team and inviting members
2. ✅ Creating your first service
3. ✅ Connecting Jira and GitHub integrations
4. ✅ Creating your first release
5. ✅ Setting up Slack notifications
6. ✅ Creating a sprint to organize releases
7. ✅ Exploring deployment groups for coordinated releases

Happy releasing! 🚀
