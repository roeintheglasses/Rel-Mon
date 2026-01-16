# Release Coordinator

A modern, collaborative release management platform designed to streamline software deployment coordination across teams and services. Built for engineering teams who need visibility, control, and coordination across complex multi-service releases.

## 📋 Overview

Release Coordinator helps teams plan, track, and deploy software releases with confidence. Whether you're managing microservices, coordinating sprint deployments, or orchestrating complex multi-service releases, this platform provides the visibility and coordination tools your team needs.

## ✨ Features

### Core Capabilities
- **Multi-Service Release Management** - Track and coordinate releases across multiple services and repositories
- **Sprint Planning & Tracking** - Organize releases by sprint with comprehensive status tracking
- **Deployment Groups** - Group related releases and control deployment order (parallel or sequential)
- **Release Dependencies** - Define and track dependencies between releases to prevent deployment issues
- **Kanban Board** - Visual release management with drag-and-drop status updates
- **Team Collaboration** - Comments, activity feeds, and real-time updates for team coordination

### Integrations
- **Clerk Authentication** - Secure, multi-tenant authentication with organization support
- **Jira Integration** - Link releases to Jira tickets and sync project information
- **GitHub Integration** - Connect repositories and track deployment status
- **Slack Notifications** - Automated alerts for status changes, blockers, and deployment readiness
- **OAuth Support** - Secure token management with automatic refresh

### Advanced Features
- **Role-Based Access Control** - Team admin, member, and viewer roles
- **Release Items & Dependencies** - Granular tracking of PRs, tickets, and blockers
- **Status Workflows** - Comprehensive release lifecycle (Planning → Development → Testing → Ready → Deployed)
- **Hotfix Management** - Fast-track critical fixes with priority flagging
- **Activity Tracking** - Complete audit trail of all release changes
- **Team Invitations** - Email-based team member invitations with role assignment

## 🛠 Tech Stack

### Frontend & Framework
- **Next.js 16.1.1** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library

### Backend & Database
- **Prisma 5.22.0** - Next-generation ORM
- **PostgreSQL** - Primary database (via Neon)
- **Next.js API Routes** - RESTful API endpoints

### State Management & Data Fetching
- **TanStack Query (React Query)** - Server state management
- **React Hooks** - Local state management

### UI Components & Libraries
- **shadcn/ui** - Re-usable component library
- **dnd-kit** - Drag-and-drop functionality
- **date-fns** - Date manipulation
- **sonner** - Toast notifications
- **cmdk** - Command palette
- **next-themes** - Dark mode support

### Authentication & Security
- **Clerk** - User authentication and organization management
- **Token Encryption** - Secure OAuth token storage

### Testing
- **Vitest** - Unit and integration testing
- **Testing Library** - React component testing
- **MSW (Mock Service Worker)** - API mocking

### Developer Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## 📦 Prerequisites

Before setting up the project, ensure you have:

- **Node.js** 20.x or higher
- **npm** 9.x or higher (comes with Node.js)
- **PostgreSQL** database (or a Neon account for hosted PostgreSQL)
- **Clerk Account** for authentication setup
- **Git** for version control

### Optional Integrations
- **Jira Account** - For Jira integration features
- **GitHub Account** - For GitHub integration features
- **Slack Workspace** - For notification features

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd release-coordinator
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages and automatically run `prisma generate` via the postinstall script.

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# Clerk Authentication (Required)
CLERK_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/board
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/select-org

# Token Encryption (Required)
# Generate with: openssl rand -base64 32
TOKEN_ENCRYPTION_KEY=your_generated_encryption_key

# Jira OAuth (Optional)
JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

See the [Environment Variables](#-environment-variables-guide) section below for detailed setup instructions.

### 4. Set Up the Database

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Push the schema to your database
npx prisma db push

# (Optional) Seed the database with sample data
npx prisma db seed
```

Alternatively, you can use Prisma migrations:

```bash
npx prisma migrate dev --name init
```

### 5. Configure Clerk

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Enable organizations in your Clerk dashboard
3. Set up the webhook endpoint: `https://your-domain/api/webhooks/clerk`
4. Configure the following webhook events:
   - `user.created`
   - `user.updated`
   - `organization.created`
   - `organization.updated`
   - `organizationMembership.created`

### 6. (Optional) Configure OAuth Integrations

#### Jira OAuth Setup
1. Create an OAuth 2.0 app in Atlassian Developer Console
2. Set redirect URI: `https://your-domain/api/oauth/jira/callback`
3. Add scopes: `read:jira-work`, `read:jira-user`
4. Copy Client ID and Secret to `.env`

#### GitHub OAuth Setup
1. Create an OAuth App in GitHub Settings → Developer settings
2. Set authorization callback URL: `https://your-domain/api/oauth/github/callback`
3. Copy Client ID and Secret to `.env`

### 7. Generate Encryption Key

Generate a secure encryption key for OAuth token storage:

```bash
openssl rand -base64 32
```

Add the generated key to your `.env` file as `TOKEN_ENCRYPTION_KEY`.

### 8. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 9. Create Your First Organization

1. Sign up for an account at `/sign-up`
2. Create your first organization at `/select-org`
3. Start managing releases!

### 10. (Optional) Configure Slack Notifications

In the team settings, add your Slack webhook URL to receive notifications for:
- Release status changes
- Blocked releases
- Releases ready to deploy

## 🔐 Environment Variables Guide

### Required Variables

#### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
  - **Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`
  - **Provider:** Neon (recommended) or any PostgreSQL provider
  - **Example:** Get a free database at [neon.tech](https://neon.tech)

#### Clerk Authentication
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Public key for client-side Clerk integration
- `CLERK_SECRET_KEY` - Secret key for server-side Clerk operations
- `CLERK_WEBHOOK_SECRET` - Secret for verifying webhook authenticity
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Sign-in page URL (default: `/sign-in`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` - Sign-up page URL (default: `/sign-up`)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` - Redirect after sign-in (default: `/board`)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` - Redirect after sign-up (default: `/select-org`)

#### Security
- `TOKEN_ENCRYPTION_KEY` - 32-byte base64 key for encrypting OAuth tokens
  - **Generate:** `openssl rand -base64 32`
  - **Important:** Keep this secure and never commit to version control

### Optional Variables

#### Jira Integration
- `JIRA_CLIENT_ID` - OAuth 2.0 client ID from Atlassian Developer Console
- `JIRA_CLIENT_SECRET` - OAuth 2.0 client secret

#### GitHub Integration
- `GITHUB_CLIENT_ID` - OAuth App client ID from GitHub
- `GITHUB_CLIENT_SECRET` - OAuth App client secret

## 🗄 Database Setup

### Using Neon (Recommended)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy the connection string (with pooling enabled)
4. Add to `.env` as `DATABASE_URL`
5. Run `npx prisma db push` to create tables

### Using Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database:
   ```bash
   createdb release_coordinator
   ```
3. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/release_coordinator"
   ```
4. Run `npx prisma db push` to create tables

### Database Schema

The application uses the following main entities:
- **Team** - Organizations/workspaces
- **User** - Application users (synced with Clerk)
- **Service** - Software services/repositories
- **Sprint** - Time-boxed planning periods
- **Release** - Individual release records
- **DeploymentGroup** - Grouped releases with deployment orchestration
- **ReleaseItem** - PRs, tickets, and tasks within releases
- **OAuthConnection** - Encrypted third-party integration tokens

## 💻 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Push schema changes to database
npx prisma db push

# Create and apply migrations
npx prisma migrate dev

# Run tests
npm test

# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests once (CI mode)
npm run test:run
```

## 🧪 Testing

The project uses Vitest for testing with React Testing Library:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests once (no watch mode)
npm run test:run
```

Test files are located in:
- `src/test/` - Test setup and utilities
- `**/*.test.ts` or `**/*.test.tsx` - Component and unit tests

## 📁 Project Structure

```
release-coordinator/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Main application pages
│   │   ├── api/               # API routes
│   │   └── select-org/        # Organization selection
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   └── ...               # Feature components
│   ├── lib/                   # Utilities and helpers
│   ├── test/                  # Test setup and utilities
│   └── middleware.ts          # Clerk authentication middleware
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
├── .env                       # Environment variables (not committed)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── vitest.config.ts           # Test configuration
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following our code standards
4. Write or update tests as needed
5. Commit your changes with clear messages
6. Push to your fork and submit a pull request

### Code Standards

- **TypeScript**: Use strict typing, avoid `any` when possible
- **Components**: Use functional components with hooks
- **Formatting**: Follow the existing code style (enforced by ESLint)
- **Naming**: Use clear, descriptive names for variables and functions
- **Comments**: Document complex logic and non-obvious decisions
- **Tests**: Write tests for new features and bug fixes

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add release dependency tracking`
- `fix: correct deployment group ordering`
- `docs: update setup instructions`
- `test: add coverage for sprint API`
- `refactor: simplify release status logic`

### Pull Request Process

1. Update documentation if you change functionality
2. Ensure all tests pass: `npm run test:run`
3. Ensure no linting errors: `npm run lint`
4. Update the README if needed
5. Request review from maintainers
6. Address any review feedback

### Reporting Issues

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment information
- Screenshots if applicable

## 📄 License

[Add your license information here]

## 🆘 Support

- **Documentation**: [Link to full documentation]
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)
- **Email**: [support@example.com]

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org) - The React Framework
- [Clerk](https://clerk.com) - Authentication and User Management
- [Prisma](https://prisma.io) - Next-generation ORM
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [shadcn/ui](https://ui.shadcn.com) - Component Library
- [Tailwind CSS](https://tailwindcss.com) - CSS Framework
- [Radix UI](https://radix-ui.com) - Accessible Components

---

**Release Coordinator** - Streamline your software deployments with confidence.
