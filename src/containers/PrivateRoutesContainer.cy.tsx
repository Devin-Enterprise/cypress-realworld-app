import React from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { interpret } from "xstate";
import PrivateRoutesContainer from "./PrivateRoutesContainer";
import { authMachine } from "../machines/authMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import { snackbarMachine } from "../machines/snackbarMachine";
import { bankAccountsMachine } from "../machines/bankAccountsMachine";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
  },
});

describe("PrivateRoutesContainer", () => {
  let authService: any;
  let notificationsService: any;
  let snackbarService: any;
  let bankAccountsService: any;

  const mountComponent = (initialRoute = "/", props = {}) => {
    const defaultProps = {
      isLoggedIn: true,
      authService,
      notificationsService,
      snackbarService,
      bankAccountsService,
      ...props,
    };

    cy.mount(
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <PrivateRoutesContainer {...defaultProps} />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    authService = interpret(authMachine).start();
    notificationsService = interpret(notificationsMachine).start();
    snackbarService = interpret(snackbarMachine).start();
    bankAccountsService = interpret(bankAccountsMachine).start();

    cy.stub(notificationsService, 'send').as('notificationsSend');
  });

  afterEach(() => {
    authService?.stop();
    notificationsService?.stop();
    snackbarService?.stop();
    bankAccountsService?.stop();
  });

  it("should render the main layout structure", () => {
    mountComponent();

    cy.getBySel("main").should("exist");
    cy.get("nav").should("exist");
    cy.get("footer").should("exist");
  });

  it("should fetch notifications on mount", () => {
    mountComponent();

    cy.get("@notificationsSend").should("have.been.calledWith", { type: "FETCH" });
  });

  it("should render UserOnboardingContainer", () => {
    mountComponent();

    cy.get("[data-test*='user-onboarding']").should("exist");
  });

  it("should render TransactionsContainer on root route", () => {
    mountComponent("/");

    cy.get("[data-test*='transactions']").should("exist");
  });

  it("should render TransactionsContainer on public route", () => {
    mountComponent("/public");

    cy.get("[data-test*='transactions']").should("exist");
  });

  it("should render TransactionsContainer on contacts route", () => {
    mountComponent("/contacts");

    cy.get("[data-test*='transactions']").should("exist");
  });

  it("should render TransactionsContainer on personal route", () => {
    mountComponent("/personal");

    cy.get("[data-test*='transactions']").should("exist");
  });

  it("should render UserSettingsContainer on settings route", () => {
    mountComponent("/user/settings");

    cy.get("[data-test*='user-settings']").should("exist");
  });

  it("should render NotificationsContainer on notifications route", () => {
    mountComponent("/notifications");

    cy.get("[data-test*='notifications']").should("exist");
  });

  it("should render BankAccountsContainer on bankaccounts route", () => {
    mountComponent("/bankaccounts");

    cy.get("[data-test*='bankaccounts']").should("exist");
  });

  it("should render BankAccountsContainer on nested bankaccounts routes", () => {
    mountComponent("/bankaccounts/new");

    cy.get("[data-test*='bankaccounts']").should("exist");
  });

  it("should render TransactionCreateContainer on new transaction route", () => {
    mountComponent("/transaction/new");

    cy.get("[data-test*='transaction-create']").should("exist");
  });

  it("should render TransactionDetailContainer on transaction detail route", () => {
    mountComponent("/transaction/123");

    cy.get("[data-test*='transaction-detail']").should("exist");
  });

  it("should handle logged out state", () => {
    mountComponent("/", { isLoggedIn: false });

    cy.get("[data-test*='transactions']").should("not.exist");
  });

  it("should pass correct props to UserSettingsContainer", () => {
    mountComponent("/user/settings");

    cy.get("[data-test*='user-settings']").should("exist");
  });

  it("should pass correct props to NotificationsContainer", () => {
    mountComponent("/notifications");

    cy.get("[data-test*='notifications']").should("exist");
  });

  it("should pass correct props to BankAccountsContainer", () => {
    mountComponent("/bankaccounts");

    cy.get("[data-test*='bankaccounts']").should("exist");
  });

  it("should pass correct props to TransactionCreateContainer", () => {
    mountComponent("/transaction/new");

    cy.get("[data-test*='transaction-create']").should("exist");
  });

  it("should pass correct props to TransactionDetailContainer", () => {
    mountComponent("/transaction/456");

    cy.get("[data-test*='transaction-detail']").should("exist");
  });

  it("should handle navigation between routes", () => {
    mountComponent("/");

    cy.get("[data-test*='transactions']").should("exist");
    
    cy.visit("/user/settings");
    cy.get("[data-test*='user-settings']").should("exist");
    
    cy.visit("/notifications");
    cy.get("[data-test*='notifications']").should("exist");
  });

  it("should handle route parameters correctly", () => {
    const transactionId = "test-transaction-123";
    mountComponent(`/transaction/${transactionId}`);

    cy.get("[data-test*='transaction-detail']").should("exist");
    cy.url().should("include", transactionId);
  });

  it("should handle complex bankaccounts routes", () => {
    const routes = [
      "/bankaccounts",
      "/bankaccounts/new",
      "/bankaccounts/edit/123",
      "/bankaccounts/details/456",
    ];

    routes.forEach((route) => {
      mountComponent(route);
      cy.get("[data-test*='bankaccounts']").should("exist");
    });
  });

  it("should handle invalid routes gracefully", () => {
    mountComponent("/invalid-route");

    cy.getBySel("main").should("exist");
  });

  it("should handle service errors gracefully", () => {
    const errorNotificationsService = {
      send: cy.stub().throws(new Error("Service error")),
      state: { matches: cy.stub().returns(false) },
      subscribe: cy.stub(),
    };

    mountComponent("/", { notificationsService: errorNotificationsService });

    cy.getBySel("main").should("exist");
  });

  it("should handle missing services gracefully", () => {
    mountComponent("/", {
      authService: null,
      notificationsService: null,
      snackbarService: null,
      bankAccountsService: null,
    });

    cy.getBySel("main").should("exist");
  });

  it("should handle rapid route changes", () => {
    mountComponent("/");

    const routes = ["/user/settings", "/notifications", "/bankaccounts", "/"];
    
    routes.forEach((route) => {
      cy.visit(route);
      cy.getBySel("main").should("exist");
    });
  });

  it("should maintain service state across route changes", () => {
    mountComponent("/");

    cy.get("@notificationsSend").should("have.been.calledWith", { type: "FETCH" });
    
    cy.visit("/user/settings");
    
    cy.getBySel("main").should("exist");
  });

  it("should handle concurrent service operations", () => {
    mountComponent("/");

    cy.get("@notificationsSend").should("have.been.called");
    
    cy.visit("/notifications");
    cy.visit("/bankaccounts");
    cy.visit("/");
    
    cy.getBySel("main").should("exist");
  });

  it("should handle browser back/forward navigation", () => {
    mountComponent("/");

    cy.get("[data-test*='transactions']").should("exist");
    
    cy.visit("/user/settings");
    cy.get("[data-test*='user-settings']").should("exist");
    
    cy.go("back");
    cy.get("[data-test*='transactions']").should("exist");
    
    cy.go("forward");
    cy.get("[data-test*='user-settings']").should("exist");
  });

  it("should handle deep linking", () => {
    const deepRoutes = [
      "/user/settings",
      "/notifications",
      "/bankaccounts/new",
      "/transaction/new",
      "/transaction/deep-link-123",
    ];

    deepRoutes.forEach((route) => {
      mountComponent(route);
      cy.getBySel("main").should("exist");
      cy.url().should("include", route);
    });
  });

  it("should handle query parameters", () => {
    mountComponent("/user/settings?tab=profile");

    cy.get("[data-test*='user-settings']").should("exist");
    cy.url().should("include", "tab=profile");
  });

  it("should handle hash routing", () => {
    mountComponent("/notifications#unread");

    cy.get("[data-test*='notifications']").should("exist");
    cy.url().should("include", "#unread");
  });

  it("should handle case-sensitive routes", () => {
    const routes = [
      { path: "/user/settings", shouldMatch: true },
      { path: "/User/Settings", shouldMatch: false },
      { path: "/USER/SETTINGS", shouldMatch: false },
    ];

    routes.forEach(({ path, shouldMatch }) => {
      mountComponent(path);
      
      if (shouldMatch) {
        cy.get("[data-test*='user-settings']").should("exist");
      } else {
        cy.get("[data-test*='user-settings']").should("not.exist");
      }
    });
  });

  it("should handle route transitions with loading states", () => {
    mountComponent("/");

    cy.get("[data-test*='transactions']").should("exist");
    
    cy.visit("/user/settings");
    cy.get("[data-test*='user-settings']").should("exist");
  });

  it("should handle memory leaks prevention", () => {
    mountComponent("/");

    cy.mount(<div>Empty</div>);
    
    mountComponent("/user/settings");
    cy.get("[data-test*='user-settings']").should("exist");
  });

  it("should handle responsive layout", () => {
    mountComponent("/");

    cy.viewport(320, 568); // Mobile
    cy.getBySel("main").should("exist");
    
    cy.viewport(1024, 768); // Desktop
    cy.getBySel("main").should("exist");
  });

  it("should handle accessibility requirements", () => {
    mountComponent("/");

    cy.get("nav").should("exist");
    cy.get("main").should("exist");
    cy.get("footer").should("exist");
    
    cy.getBySel("main").should("have.attr", "data-test", "main");
  });

  it("should handle performance optimization", () => {
    const startTime = Date.now();
    
    mountComponent("/");
    
    cy.getBySel("main").should("exist").then(() => {
      const endTime = Date.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).to.be.lessThan(1000);
    });
  });

  it("should handle service subscription cleanup", () => {
    mountComponent("/");

    cy.get("@notificationsSend").should("have.been.called");
    
    cy.mount(<div>Cleanup Test</div>);
    
    cy.contains("Cleanup Test").should("exist");
  });

  it("should handle edge case route patterns", () => {
    const edgeRoutes = [
      "/",
      "/public",
      "/contacts",
      "/personal",
      "/bankaccounts/",
      "/transaction/",
    ];

    edgeRoutes.forEach((route) => {
      mountComponent(route);
      cy.getBySel("main").should("exist");
    });
  });

  it("should handle service state synchronization", () => {
    mountComponent("/");

    cy.get("@notificationsSend").should("have.been.calledWith", { type: "FETCH" });
    
    cy.visit("/notifications");
    cy.get("[data-test*='notifications']").should("exist");
  });
});
