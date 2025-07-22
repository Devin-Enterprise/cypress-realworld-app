import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { interpret } from "xstate";
import MainLayout from "./MainLayout";
import { authMachine } from "../machines/authMachine";
import { notificationsMachine } from "../machines/notificationsMachine";

const theme = createTheme({
  palette: {
    secondary: {
      main: "#fff",
    },
  },
  typography: {
    fontSize: 14 * 0.875,
    body1: {
      lineHeight: 1.43,
      letterSpacing: "0.01071em",
    },
  },
});

describe("MainLayout Component", () => {
  let authService: any;
  let notificationsService: any;

  beforeEach(() => {
    authService = interpret(authMachine).start();
    notificationsService = interpret(notificationsMachine).start();
  });

  afterEach(() => {
    authService?.stop();
    notificationsService?.stop();
  });

  const mountComponent = (children = <div>Test Content</div>) => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainLayout authService={authService} notificationsService={notificationsService}>
          {children}
        </MainLayout>
      </ThemeProvider>
    );
  };

  it("should render the main layout structure", () => {
    mountComponent();

    cy.getBySel("main").should("exist");
    cy.get("nav").should("exist");
    cy.get("footer").should("exist");
  });

  it("should render children content", () => {
    const testContent = <div data-test="test-content">Custom Test Content</div>;
    mountComponent(testContent);

    cy.getBySel("test-content").should("exist");
    cy.getBySel("test-content").should("contain.text", "Custom Test Content");
  });

  it("should render with Material-UI components", () => {
    mountComponent();

    cy.get(".MuiContainer-root").should("exist");
    cy.get(".MuiGrid-container").should("exist");
    cy.get(".MuiGrid-item").should("exist");
  });

  it("should have correct CSS classes applied", () => {
    mountComponent();

    cy.getBySel("main").should("have.class", "MainLayout-content");
    cy.get(".MainLayout-appBarSpacer").should("exist");
    cy.get(".MainLayout-container").should("exist");
  });

  it("should handle responsive layout", () => {
    mountComponent();

    cy.getBySel("main").should("exist");
    cy.get(".MainLayout-content").should("have.css", "height", "100vh");
    cy.get(".MainLayout-appBarSpacer").should("exist");
    cy.get(".MainLayout-container").should("exist");
  });

  it("should handle drawer interactions", () => {
    mountComponent();

    cy.get("[data-test*='sidenav-toggle']").should("exist");
    cy.get("[data-test*='sidenav-toggle']").click();
  });

  it("should render navigation components", () => {
    mountComponent();

    cy.get("nav").should("exist");
    cy.get("[data-test*='sidenav']").should("exist");
  });

  it("should render content in main area", () => {
    const complexContent = (
      <div>
        <h1>Test Title</h1>
        <p>Test paragraph content</p>
        <button>Test Button</button>
      </div>
    );
    mountComponent(complexContent);

    cy.getBySel("main").within(() => {
      cy.contains("Test Title").should("exist");
      cy.contains("Test paragraph content").should("exist");
      cy.contains("Test Button").should("exist");
    });
  });

  it("should handle scrollable content", () => {
    const longContent = (
      <div>
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i}>This is paragraph {i + 1} with content.</p>
        ))}
      </div>
    );
    mountComponent(longContent);

    cy.getBySel("main").should("have.css", "overflow", "auto");
    cy.contains("This is paragraph 1").should("exist");
    cy.contains("This is paragraph 20").should("exist");
  });

  it("should apply theme styles correctly", () => {
    mountComponent();

    cy.get(".MainLayout-appBarSpacer").should("exist");
    cy.get(".MainLayout-content").should("have.css", "flex-grow", "1");
    cy.get(".MainLayout-container").should("exist");
  });

  it("should integrate with services", () => {
    mountComponent();

    cy.get("nav").should("exist");
    cy.get("[data-test*='sidenav']").should("exist");
  });

  it("should have proper semantic structure", () => {
    mountComponent();

    cy.get("nav").should("exist");
    cy.get("main").should("exist");
    cy.get("footer").should("exist");
    cy.getBySel("main").should("have.attr", "data-test", "main");
    cy.getBySel("main").should("be.visible");
  });

  it("should handle edge cases", () => {
    mountComponent(null);

    cy.getBySel("main").should("exist");
    cy.get(".MuiGrid-item").should("exist");
  });

  it("should render efficiently with large content", () => {
    const largeContent = (
      <div>
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} data-test={`item-${i}`}>
            Item {i}
          </div>
        ))}
      </div>
    );

    mountComponent(largeContent);

    cy.getBySel("item-0").should("exist");
    cy.getBySel("item-49").should("exist");
  });

  it("should work with complete layout workflow", () => {
    mountComponent(<div data-test="workflow-content">Workflow Test</div>);

    cy.getBySel("main").should("exist");
    cy.getBySel("workflow-content").should("exist");
    cy.getBySel("workflow-content").should("contain.text", "Workflow Test");
    
    cy.get("[data-test*='sidenav-toggle']").click();
  });
});
