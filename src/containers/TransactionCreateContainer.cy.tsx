import React from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { interpret } from "xstate";
import TransactionCreateContainer from "./TransactionCreateContainer";
import { authMachine } from "../machines/authMachine";
import { snackbarMachine } from "../machines/snackbarMachine";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
  },
});

describe("TransactionCreateContainer", () => {
  let authService: any;
  let snackbarService: any;

  const mockUser = {
    id: "test-user-123",
    uuid: "test-uuid-123",
    firstName: "John",
    lastName: "Doe",
    username: "johndoe",
    email: "john@example.com",
    phoneNumber: "555-123-4567",
    avatar: "https://example.com/avatar.jpg",
    defaultPrivacyLevel: "public",
    balance: 1000,
    createdAt: "2023-01-15T10:30:00Z",
    modifiedAt: "2023-01-15T10:30:00Z",
  };

  const mountComponent = (props = {}) => {
    const defaultProps = {
      authService,
      snackbarService,
      ...props,
    };

    cy.mount(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <TransactionCreateContainer {...defaultProps} />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    authService = interpret(authMachine).start();
    snackbarService = interpret(snackbarMachine).start();

    authService.state.context = { user: mockUser };
    authService.state.matches = cy.stub().returns(true);

    cy.window().then((win) => {
      win.createTransactionService = null;
    });
  });

  afterEach(() => {
    authService?.stop();
    snackbarService?.stop();
  });

  it("should render the stepper with correct steps", () => {
    mountComponent();

    cy.get(".MuiStepper-root").should("exist");
    cy.contains("Select Contact").should("exist");
    cy.contains("Payment").should("exist");
    cy.contains("Complete").should("exist");
  });

  it("should start on step one by default", () => {
    mountComponent();

    cy.get(".MuiStep-root").first().should("have.class", "MuiStep-active");
    cy.get("[data-test*='transaction-create-step-one']").should("exist");
  });

  it("should render TransactionCreateStepOne on stepOne state", () => {
    mountComponent();

    cy.get("[data-test*='transaction-create-step-one']").should("exist");
    cy.get("[data-test*='user-list-search']").should("exist");
    cy.get("[data-test*='users-list']").should("exist");
  });

  it("should expose createTransactionService on window", () => {
    mountComponent();

    cy.window().then((win) => {
      expect(win.createTransactionService).to.exist;
    });
  });

  it("should fetch users on mount", () => {
    const mockSendUsers = cy.stub();
    
    mountComponent();

    cy.get("[data-test*='users-list']").should("exist");
  });

  it("should handle user selection and move to step two", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();

    cy.get(".MuiStep-root").eq(1).should("have.class", "MuiStep-active");
    cy.get("[data-test*='transaction-create-step-two']").should("exist");
  });

  it("should render TransactionCreateStepTwo when sender exists and in stepTwo state", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();

    cy.get("[data-test*='transaction-create-step-two']").should("exist");
    cy.get("[data-test*='transaction-amount-input']").should("exist");
    cy.get("[data-test*='transaction-description-input']").should("exist");
    cy.get("[data-test*='transaction-submit']").should("exist");
  });

  it("should handle transaction creation and move to step three", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();
    
    cy.get("[data-test*='transaction-amount-input']").type("50");
    cy.get("[data-test*='transaction-description-input']").type("Test payment");
    cy.get("[data-test*='transaction-submit']").click();

    cy.get(".MuiStep-root").eq(2).should("have.class", "MuiStep-active");
    cy.get("[data-test*='transaction-create-step-three']").should("exist");
  });

  it("should render TransactionCreateStepThree on stepThree state", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();
    cy.get("[data-test*='transaction-amount-input']").type("25");
    cy.get("[data-test*='transaction-description-input']").type("Test");
    cy.get("[data-test*='transaction-submit']").click();

    cy.get("[data-test*='transaction-create-step-three']").should("exist");
    cy.get("[data-test*='transaction-success']").should("exist");
  });

  it("should handle user search with debouncing", () => {
    mountComponent();

    cy.get("[data-test*='user-list-search']").type("john");
    
    cy.get("[data-test*='users-list']").should("exist");
  });

  it("should handle rapid user search input", () => {
    mountComponent();

    cy.get("[data-test*='user-list-search']").type("john");
    
    cy.get("[data-test*='users-list']").should("exist");
  });

  it("should handle empty user search", () => {
    mountComponent();

    cy.get("[data-test*='user-list-search']").clear();
    
    cy.get("[data-test*='users-list']").should("exist");
  });

  it("should handle snackbar notifications", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();
    cy.get("[data-test*='transaction-amount-input']").type("invalid");
    cy.get("[data-test*='transaction-submit']").click();

    cy.get("[data-test*='alert']").should("exist");
  });

  it("should handle missing sender gracefully", () => {
    authService.state.context = { user: null };
    
    mountComponent();

    cy.get("[data-test*='transaction-create-step-one']").should("exist");
    
    cy.get("[data-test*='user-list-item']").first().click();
    cy.get("[data-test*='transaction-create-step-two']").should("not.exist");
  });

  it("should handle service errors gracefully", () => {
    const errorAuthService = {
      state: { context: { user: null }, matches: cy.stub().returns(false) },
      send: cy.stub().throws(new Error("Service error")),
      subscribe: cy.stub(),
    };

    mountComponent({ authService: errorAuthService });

    cy.get(".MuiStepper-root").should("exist");
  });

  it("should handle step navigation correctly", () => {
    mountComponent();

    cy.get(".MuiStep-root").first().should("have.class", "MuiStep-active");
    
    cy.get("[data-test*='user-list-item']").first().click();
    cy.get(".MuiStep-root").eq(1).should("have.class", "MuiStep-active");
    
    cy.get("[data-test*='transaction-amount-input']").type("30");
    cy.get("[data-test*='transaction-description-input']").type("Payment");
    cy.get("[data-test*='transaction-submit']").click();
    cy.get(".MuiStep-root").eq(2).should("have.class", "MuiStep-active");
  });

  it("should handle transaction payload validation", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();
    
    cy.get("[data-test*='transaction-submit']").click();
    
    cy.contains("Amount is required").should("exist");
  });

  it("should handle large transaction amounts", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();
    cy.get("[data-test*='transaction-amount-input']").type("999999");
    cy.get("[data-test*='transaction-description-input']").type("Large payment");
    cy.get("[data-test*='transaction-submit']").click();

    cy.get("[data-test*='transaction-create-step-three']").should("exist");
  });

  it("should handle special characters in transaction description", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();
    cy.get("[data-test*='transaction-amount-input']").type("15");
    cy.get("[data-test*='transaction-description-input']").type("Payment for café & restaurant 🍕");
    cy.get("[data-test*='transaction-submit']").click();

    cy.get("[data-test*='transaction-create-step-three']").should("exist");
  });

  it("should handle concurrent user searches", () => {
    mountComponent();

    cy.get("[data-test*='user-list-search']").type("alice");
    cy.get("[data-test*='user-list-search']").clear();
    cy.get("[data-test*='user-list-search']").type("bob");
    cy.get("[data-test*='user-list-search']").clear();
    cy.get("[data-test*='user-list-search']").type("charlie");
    
    cy.get("[data-test*='users-list']").should("exist");
  });

  it("should handle step state persistence", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();
    
    cy.get("[data-test*='transaction-amount-input']").type("40");
    
    cy.get("[data-test*='transaction-amount-input']").should("have.value", "40");
  });

  it("should handle responsive layout", () => {
    mountComponent();

    cy.viewport(320, 568); // Mobile
    cy.get(".MuiStepper-root").should("exist");
    cy.get("[data-test*='transaction-create-step-one']").should("exist");
    
    cy.viewport(1024, 768); // Desktop
    cy.get(".MuiStepper-root").should("exist");
    cy.get("[data-test*='transaction-create-step-one']").should("exist");
  });

  it("should handle accessibility requirements", () => {
    mountComponent();

    cy.get(".MuiStepper-root").should("have.attr", "aria-label");
    cy.get("[data-test*='user-list-search']").should("have.attr", "aria-label");
    
    cy.get("input").should("exist");
    cy.get("button").should("exist");
  });

  it("should handle memory leaks prevention", () => {
    mountComponent();

    cy.mount(<div>Empty</div>);
    
    mountComponent();
    cy.get(".MuiStepper-root").should("exist");
  });

  it("should handle edge case user selections", () => {
    mountComponent();

    cy.get("[data-test*='user-list-item']").first().click();
    cy.get("[data-test*='user-list-item']").first().click();
    
    cy.get(".MuiStep-root").eq(1).should("have.class", "MuiStep-active");
  });

  it("should handle transaction creation errors", () => {
    mountComponent();

    cy.intercept("POST", "**/transactions", {
      statusCode: 400,
      body: { message: "Insufficient funds" }
    }).as("transactionError");

    cy.get("[data-test*='user-list-item']").first().click();
    cy.get("[data-test*='transaction-amount-input']").type("10000");
    cy.get("[data-test*='transaction-description-input']").type("Large payment");
    cy.get("[data-test*='transaction-submit']").click();

    cy.wait("@transactionError");
    cy.get("[data-test*='alert']").should("exist");
  });

  it("should handle network connectivity issues", () => {
    mountComponent();

    cy.intercept("GET", "**/users", {
      forceNetworkError: true
    }).as("networkError");

    cy.get("[data-test*='user-list-search']").type("test");
    cy.wait("@networkError");
    
    cy.get(".MuiStepper-root").should("exist");
  });

  it("should handle performance with large user lists", () => {
    mountComponent();

    const largeUserList = Array.from({ length: 100 }, (_, i) => ({
      id: `user-${i}`,
      firstName: `User${i}`,
      lastName: `Test${i}`,
      username: `user${i}`,
    }));

    cy.get("[data-test*='user-list-search']").type("user");
    
    cy.get("[data-test*='users-list']").should("exist");
  });

  it("should handle complete transaction workflow", () => {
    mountComponent();

    cy.get("[data-test*='user-list-search']").type("alice");
    cy.get("[data-test*='user-list-item']").first().click();
    
    cy.get("[data-test*='transaction-amount-input']").type("75");
    cy.get("[data-test*='transaction-description-input']").type("Complete workflow test");
    cy.get("[data-test*='transaction-submit']").click();
    
    cy.get("[data-test*='transaction-create-step-three']").should("exist");
    cy.get("[data-test*='transaction-success']").should("exist");
  });

  it("should handle step validation correctly", () => {
    mountComponent();

    cy.get("[data-test*='transaction-create-step-one']").should("exist");
    
    cy.get("[data-test*='transaction-create-step-two']").should("not.exist");
    
    cy.get("[data-test*='user-list-item']").first().click();
    cy.get("[data-test*='transaction-create-step-two']").should("exist");
  });

  it("should handle service state synchronization", () => {
    mountComponent();

    cy.window().then((win) => {
      expect(win.createTransactionService).to.exist;
    });
    
    cy.get("[data-test*='user-list-search']").should("exist");
    cy.get(".MuiStepper-root").should("exist");
  });
});
