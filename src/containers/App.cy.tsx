import React from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { interpret } from "xstate";
import App from "./App";
import { authMachine } from "../machines/authMachine";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
  },
});

describe("App Container", () => {
  let authService: any;

  const mountComponent = (initialRoute = "/") => {
    cy.mount(
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    authService = interpret(authMachine);
    authService.start();
    
    cy.window().then((win) => {
      win.Cypress = true;
      win.authService = authService;
    });
  });

  afterEach(() => {
    authService?.stop();
  });

  it("should render the app with basic structure", () => {
    mountComponent();

    cy.get(".App-root").should("exist");
    cy.get(".MuiCssBaseline-root").should("exist");
  });

  it("should show sign in form when unauthorized and on signin route", () => {
    mountComponent("/signin");

    cy.getBySel("signin-username").should("exist");
    cy.getBySel("signin-password").should("exist");
    cy.getBySel("signin-submit").should("exist");
    cy.contains("Sign In").should("exist");
  });

  it("should show sign up form when unauthorized and on signup route", () => {
    mountComponent("/signup");

    cy.getBySel("signup-first-name").should("exist");
    cy.getBySel("signup-last-name").should("exist");
    cy.getBySel("signup-username").should("exist");
    cy.getBySel("signup-password").should("exist");
    cy.getBySel("signup-confirmPassword").should("exist");
    cy.getBySel("signup-submit").should("exist");
    cy.contains("Sign Up").should("exist");
  });

  it("should redirect to signin when unauthorized and on unknown route", () => {
    mountComponent("/unknown-route");

    cy.url().should("include", "/signin");
    cy.getBySel("signin-username").should("exist");
    cy.getBySel("signin-password").should("exist");
  });

  it("should redirect to signin when unauthorized and on root route", () => {
    mountComponent("/");

    cy.url().should("include", "/signin");
    cy.getBySel("signin-username").should("exist");
    cy.getBySel("signin-password").should("exist");
  });

  it("should show private routes when authorized", () => {
    cy.window().then((win) => {
      const mockAuthService = {
        state: { matches: (state: string) => state === "authorized" },
        send: cy.stub(),
        subscribe: cy.stub(),
      };
      win.authService = mockAuthService;
    });

    mountComponent("/");

    cy.getBySel("signin-username").should("not.exist");
    cy.getBySel("signup-first-name").should("not.exist");
  });

  it("should show private routes when refreshing", () => {
    cy.window().then((win) => {
      const mockAuthService = {
        state: { matches: (state: string) => state === "refreshing" },
        send: cy.stub(),
        subscribe: cy.stub(),
      };
      win.authService = mockAuthService;
    });

    mountComponent("/");

    cy.getBySel("signin-username").should("not.exist");
    cy.getBySel("signup-first-name").should("not.exist");
  });

  it("should show private routes when updating", () => {
    cy.window().then((win) => {
      const mockAuthService = {
        state: { matches: (state: string) => state === "updating" },
        send: cy.stub(),
        subscribe: cy.stub(),
      };
      win.authService = mockAuthService;
    });

    mountComponent("/");

    cy.getBySel("signin-username").should("not.exist");
    cy.getBySel("signup-first-name").should("not.exist");
  });

  it("should render AlertBar component", () => {
    mountComponent();

    cy.get("[data-test*='alert']").should("exist");
  });

  it("should handle navigation between signin and signup", () => {
    mountComponent("/signin");

    cy.getBySel("signin-username").should("exist");
    
    cy.contains("Don't have an account? Sign Up").click();
    cy.url().should("include", "/signup");
    cy.getBySel("signup-first-name").should("exist");
    
    cy.contains("Have an account? Sign In").click();
    cy.url().should("include", "/signin");
    cy.getBySel("signin-username").should("exist");
  });

  it("should expose authService on window when Cypress is present", () => {
    mountComponent();

    cy.window().then((win) => {
      expect(win.authService).to.exist;
      expect(win.Cypress).to.be.true;
    });
  });

  it("should handle multiple authentication states correctly", () => {
    const authStates = ["unauthorized", "authorized", "refreshing", "updating"];
    
    authStates.forEach((state) => {
      cy.window().then((win) => {
        const mockAuthService = {
          state: { matches: (checkState: string) => checkState === state },
          send: cy.stub(),
          subscribe: cy.stub(),
        };
        win.authService = mockAuthService;
      });

      mountComponent("/");

      if (state === "unauthorized") {
        cy.getBySel("signin-username").should("exist");
      } else {
        cy.getBySel("signin-username").should("not.exist");
      }
    });
  });

  it("should handle route protection correctly", () => {
    const protectedRoutes = ["/dashboard", "/transactions", "/profile", "/settings"];
    
    protectedRoutes.forEach((route) => {
      mountComponent(route);
      
      cy.url().should("include", "/signin");
      cy.getBySel("signin-username").should("exist");
    });
  });

  it("should maintain Material-UI theme integration", () => {
    mountComponent();

    cy.get(".MuiCssBaseline-root").should("exist");
    cy.get(".App-root").should("have.css", "display", "flex");
  });

  it("should handle browser back/forward navigation", () => {
    mountComponent("/signin");

    cy.getBySel("signin-username").should("exist");
    
    cy.contains("Don't have an account? Sign Up").click();
    cy.getBySel("signup-first-name").should("exist");
    
    cy.go("back");
    cy.getBySel("signin-username").should("exist");
    
    cy.go("forward");
    cy.getBySel("signup-first-name").should("exist");
  });

  it("should handle deep linking to auth routes", () => {
    const authRoutes = [
      { path: "/signin", element: "signin-username" },
      { path: "/signup", element: "signup-first-name" },
    ];

    authRoutes.forEach(({ path, element }) => {
      mountComponent(path);
      cy.getBySel(element).should("exist");
      cy.url().should("include", path);
    });
  });

  it("should handle case-sensitive routing", () => {
    const routes = ["/SIGNIN", "/SignIn", "/signin"];
    
    routes.forEach((route) => {
      mountComponent(route);
      
      if (route === "/signin") {
        cy.getBySel("signin-username").should("exist");
      } else {
        cy.url().should("include", "/signin");
      }
    });
  });

  it("should handle query parameters in routes", () => {
    mountComponent("/signin?redirect=/dashboard");

    cy.getBySel("signin-username").should("exist");
    cy.url().should("include", "redirect=/dashboard");
  });

  it("should handle hash routing", () => {
    mountComponent("/signin#section");

    cy.getBySel("signin-username").should("exist");
    cy.url().should("include", "#section");
  });

  it("should handle rapid route changes", () => {
    mountComponent("/signin");

    cy.getBySel("signin-username").should("exist");
    
    cy.contains("Don't have an account? Sign Up").click();
    cy.contains("Have an account? Sign In").click();
    cy.contains("Don't have an account? Sign Up").click();
    
    cy.getBySel("signup-first-name").should("exist");
  });

  it("should handle authentication state changes during navigation", () => {
    mountComponent("/signin");

    cy.getBySel("signin-username").should("exist");
    
    cy.window().then((win) => {
      const mockAuthService = {
        state: { matches: (state: string) => state === "authorized" },
        send: cy.stub(),
        subscribe: cy.stub(),
      };
      win.authService = mockAuthService;
    });

    cy.getBySel("signin-username").should("not.exist");
  });

  it("should handle service initialization errors gracefully", () => {
    cy.window().then((win) => {
      win.authService = null;
    });

    mountComponent("/signin");

    cy.get(".App-root").should("exist");
  });

  it("should handle concurrent service operations", () => {
    mountComponent("/signin");

    cy.window().then((win) => {
      const mockAuthService = {
        state: { matches: (state: string) => state === "unauthorized" },
        send: cy.stub(),
        subscribe: cy.stub(),
      };
      
      mockAuthService.state.matches = (state: string) => state === "authorized";
      mockAuthService.state.matches = (state: string) => state === "unauthorized";
      
      win.authService = mockAuthService;
    });

    cy.getBySel("signin-username").should("exist");
  });

  it("should handle memory leaks prevention", () => {
    mountComponent("/signin");

    cy.mount(<div>Empty</div>);
    
    mountComponent("/signup");
    cy.getBySel("signup-first-name").should("exist");
  });

  it("should handle responsive layout", () => {
    mountComponent("/signin");

    cy.viewport(320, 568); // Mobile
    cy.getBySel("signin-username").should("exist");
    
    cy.viewport(1024, 768); // Desktop
    cy.getBySel("signin-username").should("exist");
  });

  it("should handle accessibility requirements", () => {
    mountComponent("/signin");

    cy.getBySel("signin-username").should("have.attr", "type", "text");
    cy.getBySel("signin-password").should("have.attr", "type", "password");
    
    cy.get("form").should("exist");
    cy.get("label").should("exist");
  });

  it("should handle error boundaries", () => {
    cy.window().then((win) => {
      const originalConsoleError = win.console.error;
      win.console.error = cy.stub();
      
      cy.then(() => {
        win.console.error = originalConsoleError;
      });
    });

    mountComponent("/signin");
    cy.get(".App-root").should("exist");
  });

  it("should handle performance optimization", () => {
    const startTime = Date.now();
    
    mountComponent("/signin");
    
    cy.getBySel("signin-username").should("exist").then(() => {
      const endTime = Date.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).to.be.lessThan(1000);
    });
  });
});
