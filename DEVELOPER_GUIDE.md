# Cypress Real-World App - Developer Guide

## Table of Contents

1. [Overview and Architecture](#overview-and-architecture)
2. [Technology Stack Deep Dive](#technology-stack-deep-dive)
3. [State Management with XState](#state-management-with-xstate)
4. [Database Schema and Data Flow](#database-schema-and-data-flow)
5. [Authentication System](#authentication-system)
6. [Testing Infrastructure and Patterns](#testing-infrastructure-and-patterns)
7. [Development Workflows](#development-workflows)
8. [API Documentation](#api-documentation)
9. [Deployment and CI/CD](#deployment-and-cicd)
10. [Troubleshooting and Best Practices](#troubleshooting-and-best-practices)

---

## Overview and Architecture

The Cypress Real-World App (RWA) is a **full-stack financial application** designed primarily as a **comprehensive demonstration of Cypress testing methodologies**. It simulates a peer-to-peer payment system similar to Venmo or PayPal, where users can send payments, request money, manage bank accounts, and interact socially through likes and comments on transactions.

### Core Architecture

The application follows a **three-tier architecture** with sophisticated testing infrastructure:

```
Frontend (React + XState) ←→ Backend (Express.js) ←→ Data Layer (lowdb JSON)
                    ↑
            Comprehensive Cypress Testing Suite
```

### Key Design Principles

- **State-driven UI**: Uses XState for predictable state management
- **Test-first approach**: Every feature is designed with testing in mind
- **Real-world patterns**: Demonstrates production-ready code patterns
- **Educational focus**: Serves as a learning resource for Cypress testing

### Directory Structure

```
cypress-realworld-app/
├── src/                    # React frontend application
│   ├── components/         # Reusable UI components
│   ├── containers/         # Application-level containers
│   ├── machines/          # XState state machines
│   ├── models/            # TypeScript interfaces and types
│   └── utils/             # Utility functions
├── backend/               # Express.js API server
│   ├── app.ts            # Main server configuration
│   ├── database.ts       # Database operations and utilities
│   ├── *-routes.ts       # RESTful API route handlers
│   └── graphql/          # GraphQL schema and resolvers
├── cypress/              # Cypress testing infrastructure
│   ├── tests/            # Test suites (ui, api, auth-providers)
│   └── support/          # Custom commands and utilities
├── data/                 # JSON database files
└── scripts/              # Build and utility scripts
```

---

## Technology Stack Deep Dive

### Frontend Technologies

- **React 18.2.0**: Modern React with hooks and concurrent features
- **XState 4.38.3**: State machines for complex state management
- **Material-UI 5.15.12**: Component library for consistent UI
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast build tool and development server
- **React Router 5.3.4**: Client-side routing

### Backend Technologies

- **Express.js 4.20.0**: Web application framework
- **lowdb 1.0.0**: Lightweight JSON database
- **GraphQL**: Query language with express-graphql
- **bcryptjs**: Password hashing
- **JWT**: Token-based authentication
- **Morgan**: HTTP request logging

### Testing Technologies

- **Cypress 14.3.2**: End-to-end testing framework
- **@cypress/code-coverage**: Code coverage reporting
- **Percy**: Visual regression testing
- **Vitest**: Unit testing framework
- **@testing-library/react**: React component testing utilities

### Development Tools

- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality gates
- **Concurrently**: Running multiple processes
- **Nodemon**: Development server auto-restart

---

## State Management with XState

The application uses XState for sophisticated state management, providing predictable state transitions and excellent testing capabilities.

### Authentication State Machine

The core authentication machine handles all user authentication flows:

```typescript
// src/machines/authMachine.ts
export const authMachine = Machine<AuthMachineContext, AuthMachineSchema, AuthMachineEvents>(
  {
    id: "authentication",
    initial: "unauthorized",
    context: {
      user: undefined,
      message: undefined,
    },
    states: {
      unauthorized: {
        entry: "resetUser",
        on: {
          LOGIN: "loading",
          SIGNUP: "signup",
          GOOGLE: "google",
          AUTH0: "auth0",
          OKTA: "okta",
          COGNITO: "cognito",
        },
      },
      loading: {
        invoke: {
          src: "performLogin",
          onDone: { target: "authorized", actions: "onSuccess" },
          onError: { target: "unauthorized", actions: "onError" },
        },
      },
      authorized: {
        entry: "redirectHomeAfterLogin",
        on: {
          UPDATE: "updating",
          REFRESH: "refreshing",
          LOGOUT: "logout",
        },
      },
      // ... additional states for each auth provider
    },
  }
);
```

### Key State Machines

1. **authMachine**: Handles authentication flows and user sessions
2. **createTransactionMachine**: Manages transaction creation workflow
3. **notificationsMachine**: Controls notification display and management
4. **bankAccountsMachine**: Manages bank account operations
5. **transactionDetailMachine**: Handles individual transaction views
6. **snackbarMachine**: Controls global alert/toast messages

### State Machine Benefits

- **Predictable state transitions**: Clear flow between states
- **Excellent testability**: Easy to test state changes
- **Visual debugging**: XState visualizer for understanding flows
- **Type safety**: Full TypeScript integration
- **Side effect management**: Controlled async operations

---

## Database Schema and Data Flow

The application uses lowdb, a lightweight JSON database perfect for development and testing.

### Database Schema

```typescript
// src/models/db-schema.ts
export interface DbSchema {
  users: User[];
  contacts: Contact[];
  bankaccounts: BankAccount[];
  transactions: Transaction[];
  likes: Like[];
  comments: Comment[];
  notifications: NotificationType[];
  banktransfers: BankTransfer[];
}
```

### Core Data Models

#### User Model
```typescript
// src/models/user.ts
export interface User {
  id: string;
  uuid: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  balance: number;
  avatar: string;
  defaultPrivacyLevel: DefaultPrivacyLevel;
  createdAt: Date;
  modifiedAt: Date;
}
```

#### Transaction Model
```typescript
// src/models/transaction.ts
export interface Transaction {
  id: string;
  uuid: string;
  source: string; // Empty if Payment or Request; Populated with BankAccount ID
  amount: number;
  description: string;
  privacyLevel: DefaultPrivacyLevel;
  receiverId: string;
  senderId: string;
  balanceAtCompletion?: number;
  status: TransactionStatus;
  requestStatus?: TransactionRequestStatus | string;
  requestResolvedAt?: Date | string;
  createdAt: Date;
  modifiedAt: Date;
}
```

### Data Flow Patterns

1. **Database Seeding**: Fresh data on each application start
2. **Transaction Processing**: Multi-step workflow with balance updates
3. **Real-time Updates**: State machines trigger UI updates
4. **Data Validation**: Express validators ensure data integrity

### Database Operations

```typescript
// backend/database.ts - Key operations
export const seedDatabase = () => {
  const testSeed = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "database-seed.json"), "utf-8")
  );
  db.setState(testSeed).write();
};

export const createTransaction = (userId: string, transactionPayload: TransactionPayload) => {
  const transaction: Transaction = {
    id: shortid(),
    uuid: v4(),
    source: transactionPayload.source || "",
    amount: transactionPayload.amount,
    description: transactionPayload.description,
    privacyLevel: transactionPayload.privacyLevel,
    receiverId: transactionPayload.receiverId,
    senderId: transactionPayload.senderId,
    balanceAtCompletion: transactionPayload.balanceAtCompletion,
    status: transactionPayload.status,
    requestStatus: transactionPayload.requestStatus,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  saveTransaction(transaction);
  return transaction;
};
```

---

## Authentication System

The RWA supports multiple authentication providers, demonstrating various integration patterns.

### Local Authentication

Default authentication using username/password with session management:

```typescript
// Backend session-based auth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cypress-realworld-app",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  })
);
```

### Third-Party Providers

#### Auth0 Integration
- File: `src/index.auth0.tsx`
- Uses Auth0 React SDK
- JWT token management
- User profile mapping

#### Okta Integration
- File: `src/index.okta.tsx`
- Okta Auth JS SDK
- SPA application configuration
- Programmatic login support

#### Amazon Cognito
- File: `src/index.cognito.tsx`
- AWS Amplify integration
- User pool configuration
- Hosted UI support

#### Google OAuth
- File: `src/index.google.tsx`
- Google OAuth 2.0
- Refresh token management
- Profile information access

### Authentication Flow

1. **Provider Selection**: Different entry points for each provider
2. **Token Exchange**: Convert provider tokens to app sessions
3. **User Mapping**: Map provider user data to app user model
4. **Session Management**: Maintain authentication state
5. **Logout Handling**: Clean up sessions and tokens

---

## Testing Infrastructure and Patterns

The RWA demonstrates comprehensive testing strategies across multiple levels.

### Testing Pyramid

```
    /\     Unit Tests (Vitest)
   /  \    
  /____\   Component Tests (Cypress)
 /      \  
/________\  API Tests (Cypress)
/__________\ E2E Tests (Cypress)
```

### Cypress Configuration

```typescript
// cypress.config.ts
module.exports = defineConfig({
  projectId: "7s5okt",
  retries: { runMode: 2 },
  env: {
    apiUrl: "http://localhost:3001",
    defaultPassword: process.env.SEED_DEFAULT_USER_PASSWORD,
    // Auth provider configurations
    auth0_username: process.env.AUTH0_USERNAME,
    okta_username: process.env.OKTA_USERNAME,
    cognito_username: process.env.AWS_COGNITO_USERNAME,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/tests/**/*.spec.{js,jsx,ts,tsx}",
    viewportHeight: 1000,
    viewportWidth: 1280,
    experimentalRunAllSpecs: true,
    experimentalStudio: true,
  },
});
```

### Custom Cypress Commands

The application includes powerful custom commands for testing:

```typescript
// cypress/support/commands.ts

// XState-based login (bypasses UI)
Cypress.Commands.add("loginByXstate", (username, password = Cypress.env("defaultPassword")) => {
  cy.window({ log: false }).then((win) => 
    win.authService.send("LOGIN", { username, password })
  );
});

// Database operations
Cypress.Commands.add("database", (operation, entity, query, logTask = false) => {
  return cy.task(`${operation}:database`, { entity, query }, { log: logTask });
});

// Transaction creation
Cypress.Commands.add("createTransaction", (payload) => {
  return cy.window({ log: false }).then((win) => {
    win.createTransactionService.send("SET_USERS", payload);
    return win.createTransactionService.send("CREATE", {
      ...payload,
      senderId: payload.sender.id,
      receiverId: payload.receiver.id,
    });
  });
});

// Element selection with data-test attributes
Cypress.Commands.add("getBySel", (selector, ...args) => {
  return cy.get(`[data-test=${selector}]`, ...args);
});
```

### Test Organization

#### E2E Tests (`cypress/tests/ui/`)
- **auth.spec.ts**: User authentication flows
- **new-transaction.spec.ts**: Transaction creation workflows
- **transaction-feeds.spec.ts**: Transaction list and filtering
- **bankaccounts.spec.ts**: Bank account management
- **notifications.spec.ts**: Notification system

#### API Tests (`cypress/tests/api/`)
- **api-users.spec.ts**: User management endpoints
- **api-transactions.spec.ts**: Transaction API testing
- **api-bankaccounts.spec.ts**: Bank account operations
- **api-contacts.spec.ts**: Contact management

#### Auth Provider Tests (`cypress/tests/ui-auth-providers/`)
- **auth0.spec.ts**: Auth0 integration testing
- **okta.spec.ts**: Okta authentication flows
- **cognito.spec.ts**: AWS Cognito integration
- **google.spec.ts**: Google OAuth testing

### Testing Patterns

#### Page Object Pattern
```typescript
// Example test structure
describe("Transaction View", function () {
  beforeEach(function () {
    cy.task("db:seed");
    cy.intercept("GET", "/transactions*").as("personalTransactions");
    
    cy.database("find", "users").then((user: User) => {
      cy.loginByXstate(user.username);
    });
  });

  it("should display transaction details", function () {
    cy.getBySel("transaction-item").first().click();
    cy.getBySel("transaction-detail").should("be.visible");
    cy.visualSnapshot("Transaction Detail View");
  });
});
```

#### Database Testing
```typescript
// Direct database manipulation for testing
cy.database("find", "users").then((user: User) => {
  cy.database("filter", "transactions", { senderId: user.id })
    .then((transactions: Transaction[]) => {
      expect(transactions).to.have.length.greaterThan(0);
    });
});
```

---

## Development Workflows

### Getting Started

1. **Prerequisites**
   ```bash
   # Node.js version specified in .node-version
   node --version  # Should match .node-version
   
   # Yarn Classic (version 1)
   npm install yarn@latest -g
   ```

2. **Installation**
   ```bash
   git clone https://github.com/cypress-io/cypress-realworld-app
   cd cypress-realworld-app
   yarn install
   ```

3. **Development Server**
   ```bash
   # Start both frontend and backend
   yarn dev
   
   # With code coverage
   yarn dev:coverage
   
   # With specific auth provider
   yarn dev:auth0
   yarn dev:okta
   yarn dev:cognito
   yarn dev:google
   ```

### Key NPM Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development servers (frontend + backend) |
| `dev:coverage` | Start with code coverage instrumentation |
| `dev:auth0` | Start with Auth0 authentication |
| `dev:okta` | Start with Okta authentication |
| `dev:cognito` | Start with AWS Cognito authentication |
| `dev:google` | Start with Google authentication |
| `cypress:open` | Open Cypress Test Runner |
| `cypress:run` | Run Cypress tests headlessly |
| `test:api` | Run API tests only |
| `test:unit` | Run unit tests with Vitest |
| `db:seed` | Generate fresh database seed |
| `start:empty` | Start with empty database |
| `list:dev:users` | List development users |

### Database Management

```bash
# Seed database with test data
yarn db:seed

# Start with empty database
yarn start:empty

# List available users
yarn list:dev:users
```

### Code Quality

```bash
# Linting
yarn lint

# Type checking
yarn types

# Code formatting
yarn prettier
```

### Environment Configuration

Create `.env` file for local development:

```env
# Database
SEED_DEFAULT_USER_PASSWORD=s3cret

# Auth0 (optional)
VITE_AUTH0_DOMAIN=your-auth0-domain
AUTH0_USERNAME=test-user
AUTH0_PASSWORD=test-password

# Okta (optional)
VITE_OKTA_DOMAIN=your-okta-domain
VITE_OKTA_CLIENTID=your-client-id
OKTA_USERNAME=test-user
OKTA_PASSWORD=test-password

# AWS Cognito (optional)
AWS_COGNITO_USERNAME=test-user
AWS_COGNITO_PASSWORD=test-password
AWS_COGNITO_DOMAIN=your-cognito-domain

# Google (optional)
VITE_GOOGLE_CLIENTID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

---

## API Documentation

### REST API Endpoints

#### Authentication
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /checkAuth` - Check authentication status

#### Users
- `GET /users` - List users (with search)
- `POST /users` - Create new user
- `GET /users/:userId` - Get user by ID
- `PATCH /users/:userId` - Update user

#### Transactions
- `GET /transactions` - Get user transactions
- `POST /transactions` - Create transaction
- `GET /transactions/:transactionId` - Get transaction details
- `PATCH /transactions/:transactionId` - Update transaction

#### Bank Accounts
- `GET /bankAccounts` - Get user bank accounts
- `POST /bankAccounts` - Create bank account
- `DELETE /bankAccounts/:bankAccountId` - Delete bank account

#### Contacts
- `GET /contacts/:username` - Get user contacts
- `POST /contacts` - Add contact
- `DELETE /contacts/:contactId` - Remove contact

### GraphQL API

The application includes a GraphQL endpoint at `/graphql` with the following schema:

```graphql
type User {
  id: ID!
  firstName: String!
  lastName: String!
  username: String!
  email: String!
  phoneNumber: String
  balance: Float!
  avatar: String
}

type Transaction {
  id: ID!
  amount: Float!
  description: String!
  privacyLevel: String!
  receiverId: String!
  senderId: String!
  status: String!
  createdAt: String!
}

type Query {
  user(id: ID!): User
  transaction(id: ID!): Transaction
}

type Mutation {
  createBankAccount(input: CreateBankAccountInput!): BankAccount
}
```

### API Testing Examples

```typescript
// API test example
describe("Transactions API", function () {
  it("creates a new transaction", function () {
    cy.request("POST", `${Cypress.env("apiUrl")}/transactions`, {
      transactionType: "payment",
      amount: 100,
      description: "Test payment",
      receiverId: "user-id",
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.transaction).to.have.property("id");
    });
  });
});
```

---

## Deployment and CI/CD

### CircleCI Configuration

The application uses CircleCI for continuous integration:

```yaml
# .circleci/config.yml
version: 2.1

workflows:
  build_and_test:
    jobs:
      - build
      - cypress-run:
          requires: [build]
          matrix:
            parameters:
              containers: [1, 2, 3, 4, 5]
```

### GitHub Actions

Additional workflows for specific scenarios:

- **Percy Visual Testing**: Automated visual regression testing
- **Code Coverage**: Coverage reporting with Codecov
- **Dependency Updates**: Automated dependency management

### Environment Variables

Required environment variables for CI/CD:

```bash
# Database
SEED_DEFAULT_USER_PASSWORD

# Auth providers (optional)
AUTH0_USERNAME
AUTH0_PASSWORD
VITE_AUTH0_DOMAIN

OKTA_USERNAME
OKTA_PASSWORD
VITE_OKTA_DOMAIN
VITE_OKTA_CLIENTID

AWS_COGNITO_USERNAME
AWS_COGNITO_PASSWORD
AWS_COGNITO_DOMAIN

GOOGLE_REFRESH_TOKEN
VITE_GOOGLE_CLIENTID
VITE_GOOGLE_CLIENT_SECRET

# Testing
CYPRESS_RECORD_KEY
PERCY_TOKEN
```

### Deployment Strategies

1. **Development**: Local development with hot reloading
2. **Staging**: Automated deployment for testing
3. **Production**: Manual deployment with approval gates

---

## Troubleshooting and Best Practices

### Common Issues

#### Port Conflicts
```bash
# Check if ports are in use
lsof -i :3000  # Frontend
lsof -i :3001  # Backend

# Kill processes if needed
kill -9 <PID>
```

#### Database Issues
```bash
# Reset database
yarn db:seed

# Start with clean slate
rm data/database.json
yarn db:seed
```

#### Authentication Provider Setup
1. **Auth0**: Ensure SPA application type and correct callback URLs
2. **Okta**: Configure CORS and trusted origins
3. **Cognito**: Set up user pool with correct OAuth flows
4. **Google**: Enable OAuth 2.0 and set redirect URIs

### Best Practices

#### Testing
- Use `data-test` attributes for reliable element selection
- Leverage XState for predictable state testing
- Seed database before each test for consistency
- Use custom commands for common operations

#### Development
- Follow TypeScript strict mode guidelines
- Use XState for complex state management
- Implement proper error boundaries
- Maintain consistent code formatting

#### Performance
- Optimize bundle size with proper imports
- Use React.memo for expensive components
- Implement proper loading states
- Cache API responses where appropriate

### Debugging

#### Frontend Debugging
```typescript
// Access XState services in browser console
window.authService.state
window.createTransactionService.state

// Debug state machines
console.log(authService.state.value);
console.log(authService.state.context);
```

#### Backend Debugging
```bash
# Enable debug logging
DEBUG=express:* yarn start:api

# Database inspection
cat data/database.json | jq '.users'
```

#### Cypress Debugging
```typescript
// Debug custom commands
cy.debug()
cy.pause()

// Inspect application state
cy.window().then((win) => {
  console.log(win.authService.state);
});
```

---

## Contributing

### Code Style

- Follow existing TypeScript patterns
- Use meaningful variable and function names
- Implement proper error handling
- Add tests for new features

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Run full test suite locally
4. Submit PR with clear description
5. Address review feedback

### Testing Requirements

- All new features must include tests
- Maintain or improve code coverage
- Follow existing testing patterns
- Update documentation as needed

---

## Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [XState Documentation](https://xstate.js.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [Material-UI Documentation](https://mui.com/)
- [Express.js Documentation](https://expressjs.com/)

---

*This guide provides comprehensive technical documentation for the Cypress Real-World App. For basic setup instructions, see the [README.md](./README.md) file.*
