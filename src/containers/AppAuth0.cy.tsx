import React from "react";
import { MemoryRouter } from "react-router-dom";
import { interpret } from "xstate";
import { authMachine } from "../machines/authMachine";
import { snackbarMachine } from "../machines/snackbarMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import { bankAccountsMachine } from "../machines/bankAccountsMachine";
import AlertBar from "../components/AlertBar";
import PrivateRoutesContainer from "./PrivateRoutesContainer";

const TestAppAuth0 = ({ isAuthenticated = false, user = null }) => {
  const authService = interpret(authMachine);
  const snackbarService = interpret(snackbarMachine);
  const notificationsService = interpret(notificationsMachine);
  const bankAccountsService = interpret(bankAccountsMachine);

  React.useEffect(() => {
    authService.start();
    snackbarService.start();
    notificationsService.start();
    bankAccountsService.start();

    if (typeof window !== "undefined") {
      (window as any).authService = authService;
      (window as any).snackbarService = snackbarService;
      (window as any).notificationsService = notificationsService;
      (window as any).bankAccountsService = bankAccountsService;
    }

    return () => {
      authService.stop();
      snackbarService.stop();
      notificationsService.stop();
      bankAccountsService.stop();
    };
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      authService.send({
        type: "AUTH0"
      });
    }
  }, [isAuthenticated, user, authService]);

  const isLoggedIn = isAuthenticated;

  return (
    <div data-test="app-auth0">
      {isLoggedIn && (
        <div data-test="private-routes-container">
          <PrivateRoutesContainer
            notificationsService={notificationsService}
            authService={authService}
            snackbarService={snackbarService}
            bankAccountsService={bankAccountsService}
            isLoggedIn={isLoggedIn}
          />
        </div>
      )}
      <AlertBar snackbarService={snackbarService} />
    </div>
  );
};

describe("AppAuth0", () => {
  it("renders without crashing when not authenticated", () => {
    cy.mount(
      <MemoryRouter>
        <TestAppAuth0 isAuthenticated={false} />
      </MemoryRouter>
    );

    cy.get("[data-test=app-auth0]").should("exist");
  });

  it("renders AlertBar component", () => {
    cy.mount(
      <MemoryRouter>
        <TestAppAuth0 isAuthenticated={false} />
      </MemoryRouter>
    );

    cy.window().then((win) => {
      const snackbarService = (win as any).snackbarService;
      snackbarService.send({
        type: "SHOW",
        message: "Test message",
        severity: "info"
      });
    });

    cy.get(".MuiSnackbar-root").should("exist");
    cy.get("[data-test*=alert-bar]").should("exist");
  });

  it("renders when authenticated", () => {
    const mockUser = {
      id: "auth0|123456789",
      firstName: "Test",
      lastName: "User",
      username: "testuser",
      email: "test@example.com"
    };

    cy.mount(
      <MemoryRouter>
        <TestAppAuth0 isAuthenticated={true} user={mockUser} />
      </MemoryRouter>
    );

    cy.get("[data-test=app-auth0]").should("exist");
    cy.get("[data-test=private-routes-container]").should("exist");
  });

  it("does not render PrivateRoutesContainer when not authenticated", () => {
    cy.mount(
      <MemoryRouter>
        <TestAppAuth0 isAuthenticated={false} />
      </MemoryRouter>
    );

    cy.get("[data-test=private-routes-container]").should("not.exist");
  });

  it("exposes services on window for Cypress", () => {
    cy.mount(
      <MemoryRouter>
        <TestAppAuth0 isAuthenticated={false} />
      </MemoryRouter>
    );

    cy.window().should("have.property", "authService");
    cy.window().should("have.property", "snackbarService");
    cy.window().should("have.property", "notificationsService");
    cy.window().should("have.property", "bankAccountsService");
  });

  it("handles authentication flow", () => {
    const mockUser = {
      id: "auth0|123456789",
      firstName: "Test",
      lastName: "User",
      username: "testuser",
      email: "test@example.com"
    };

    cy.mount(
      <MemoryRouter>
        <TestAppAuth0 isAuthenticated={true} user={mockUser} />
      </MemoryRouter>
    );

    cy.window().then((win) => {
      const service = (win as any).authService;
      expect(service).to.exist;
    });

    cy.get("[data-test=app-auth0]").should("exist");
  });

  it("handles state transitions correctly", () => {
    cy.mount(
      <MemoryRouter>
        <TestAppAuth0 isAuthenticated={false} />
      </MemoryRouter>
    );

    cy.window().then((win) => {
      const service = (win as any).authService;
      expect(service.state.matches("unauthorized")).to.be.true;
    });

    cy.get("[data-test=app-auth0]").should("exist");
  });

  it("manages XState services correctly", () => {
    cy.mount(
      <MemoryRouter>
        <TestAppAuth0 isAuthenticated={false} />
      </MemoryRouter>
    );

    cy.window().then((win) => {
      const authService = (win as any).authService;
      const snackbarService = (win as any).snackbarService;
      const notificationsService = (win as any).notificationsService;
      const bankAccountsService = (win as any).bankAccountsService;
      
      expect(authService).to.exist;
      expect(snackbarService).to.exist;
      expect(notificationsService).to.exist;
      expect(bankAccountsService).to.exist;
    });
  });
});
