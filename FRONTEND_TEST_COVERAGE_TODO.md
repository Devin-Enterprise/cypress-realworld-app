# Frontend Test Coverage TODO List

## Baseline Coverage Report Results
- **Current frontend unit test coverage**: 0% (only vite.config.ts has coverage)
- **Existing unit tests**: Only `src/utils/__tests__/transactionUtils.test.ts`
- **Total frontend files**: 107 TypeScript/TSX files
- **Files needing tests**: 106 files

## Priority 1: Core Utilities (High Impact, Low Complexity)
These are pure functions with business logic that are easy to test and provide high value.

### src/utils/ (3 untested files)
- [ ] `src/utils/asyncUtils.ts` - HTTP client with auth interceptors
- [ ] `src/utils/historyUtils.ts` - Browser history management
- [ ] `src/utils/portUtils.ts` - Port detection and backend configuration

## Priority 2: XState Machines (High Impact, Medium Complexity)
These contain core business logic and state management.

### src/machines/ (11 untested files)
- [ ] `src/machines/authMachine.ts` - Authentication state management (CRITICAL)
- [ ] `src/machines/bankAccountsMachine.ts` - Bank account operations
- [ ] `src/machines/createTransactionMachine.ts` - Transaction creation flow
- [ ] `src/machines/dataMachine.ts` - Data fetching and caching
- [ ] `src/machines/notificationsMachine.ts` - Notification management
- [ ] `src/machines/snackbarMachine.ts` - UI feedback messages
- [ ] `src/machines/drawerMachine.ts` - Navigation drawer state
- [ ] `src/machines/transactionDetailMachine.ts` - Transaction detail view
- [ ] `src/machines/transactionFiltersMachine.ts` - Transaction filtering
- [ ] `src/machines/userOnboardingMachine.ts` - User onboarding flow
- [ ] `src/machines/usersMachine.ts` - User management
- [ ] `src/machines/personalTransactionsMachine.ts` - Personal transactions
- [ ] `src/machines/contactsTransactionsMachine.ts` - Contact transactions
- [ ] `src/machines/publicTransactionsMachine.ts` - Public transaction feed

## Priority 3: Core Components (Medium Impact, Medium Complexity)
Key UI components that handle user interactions and display critical data.

### src/components/ (Core Business Components)
- [ ] `src/components/MainLayout.tsx` - Main application layout
- [ ] `src/components/TransactionItem.tsx` - Transaction list item display
- [ ] `src/components/TransactionDetail.tsx` - Transaction detail view
- [ ] `src/components/TransactionAmount.tsx` - Amount formatting and display
- [ ] `src/components/TransactionTitle.tsx` - Transaction title display
- [ ] `src/components/SignInForm.tsx` - User authentication form
- [ ] `src/components/SignUpForm.tsx` - User registration form
- [ ] `src/components/BankAccountForm.tsx` - Bank account creation/editing
- [ ] `src/components/UserSettingsForm.tsx` - User profile settings
- [ ] `src/components/CommentForm.tsx` - Transaction comment creation

### src/components/ (List and Navigation Components)
- [ ] `src/components/TransactionList.tsx` - Transaction list container
- [ ] `src/components/TransactionPublicList.tsx` - Public transaction feed
- [ ] `src/components/TransactionPersonalList.tsx` - Personal transaction list
- [ ] `src/components/BankAccountList.tsx` - Bank account list
- [ ] `src/components/UsersList.tsx` - User search and selection
- [ ] `src/components/NotificationList.tsx` - Notification display
- [ ] `src/components/CommentList.tsx` - Transaction comments
- [ ] `src/components/NavBar.tsx` - Top navigation
- [ ] `src/components/NavDrawer.tsx` - Side navigation drawer

## Priority 4: Container Components (Medium Impact, Low-Medium Complexity)
Application-level containers that orchestrate data flow.

### src/containers/ (9 untested files)
- [ ] `src/containers/App.tsx` - Root application component
- [ ] `src/containers/PrivateRoutesContainer.tsx` - Protected route wrapper
- [ ] `src/containers/TransactionCreateContainer.tsx` - Transaction creation flow
- [ ] `src/containers/TransactionDetailContainer.tsx` - Transaction detail page
- [ ] `src/containers/TransactionsContainer.tsx` - Transaction list page
- [ ] `src/containers/BankAccountsContainer.tsx` - Bank account management
- [ ] `src/containers/UserSettingsContainer.tsx` - User settings page
- [ ] `src/containers/NotificationsContainer.tsx` - Notifications page
- [ ] `src/containers/UserOnboardingContainer.tsx` - User onboarding flow

## Priority 5: Models and Types (Low Impact, Low Complexity)
TypeScript interfaces and data models - mainly type checking.

### src/models/ (8 untested files)
- [ ] `src/models/user.ts` - User data model
- [ ] `src/models/transaction.ts` - Transaction data model
- [ ] `src/models/bankaccount.ts` - Bank account model
- [ ] `src/models/notification.ts` - Notification model
- [ ] `src/models/comment.ts` - Comment model
- [ ] `src/models/like.ts` - Like model
- [ ] `src/models/contact.ts` - Contact model
- [ ] `src/models/banktransfer.ts` - Bank transfer model

## Priority 6: Remaining Components (Lower Priority)
UI components that are less critical or more presentational.

### src/components/ (Remaining Components)
- [ ] Filter and search components
- [ ] Form field components  
- [ ] Display and formatting components
- [ ] SVG icon components
- [ ] Layout helper components

## Testing Strategy Notes
- Start with utilities (pure functions, easy to test)
- Focus on XState machines (core business logic)
- Use React Testing Library for component tests
- Mock external dependencies (HTTP calls, localStorage, etc.)
- Test edge cases and error scenarios
- Ensure proper TypeScript coverage

## Coverage Goals
- **Target**: Increase from 0% to 80%+ line coverage for frontend
- **Focus**: Core business logic and user-facing components
- **Approach**: Incremental improvement, starting with highest impact files
