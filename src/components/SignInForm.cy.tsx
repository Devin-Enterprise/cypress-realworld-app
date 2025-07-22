import React from "react";
import { interpret } from "xstate";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import SignInForm from "./SignInForm";
import { authMachine } from "../machines/authMachine";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
  },
});

describe("SignInForm", () => {
  let authService;
  
  const mountComponent = (authServiceOverride = authService) => {
    cy.mount(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SignInForm authService={authServiceOverride} />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    authService = interpret(authMachine);
    authService.start();

    expect(authService.state.value).to.equal("unauthorized");
    cy.intercept("POST", "http://localhost:3001/login", {
      user: {
        id: "t45AiwidW",
        uuid: "6383f84e-b511-44c5-a835-3ece1d781fa8",
        firstName: "Edgar",
        lastName: "Johns",
        username: "Katharina_Bernier",
        password: "$2a$10$5PXHGtcsckWtAprT5/JmluhR13f16BL8SIGhvAKNP.Dhxkt69FfzW",
        email: "Norene39@yahoo.com",
        phoneNumber: "625-316-9882",
        avatar: "https://cypress-realworld-app-svgs.s3.amazonaws.com/t45AiwidW.svg",
        defaultPrivacyLevel: "public",
        balance: 168137,
        createdAt: "2019-08-27T23:47:05.637Z",
        modifiedAt: "2020-05-21T11:02:22.857Z",
      },
    }).as("loginPost");
  });

  afterEach(() => {
    authService?.stop();
  });

  it("submits the username and password to the backend", () => {
    mountComponent();
    
    cy.getBySel("signin-username").type("Katharina_Bernier");
    cy.getBySel("signin-password").type("s3cret");
    cy.getBySel("signin-submit").click();

    cy.wait("@loginPost");
    cy.getBySel("signin-error").should("not.exist");
  });

  it("should render all form elements", () => {
    mountComponent();

    cy.getBySel("signin-username").should("exist");
    cy.getBySel("signin-password").should("exist");
    cy.getBySel("signin-remember-me").should("exist");
    cy.getBySel("signin-submit").should("exist");
    cy.getBySel("signup").should("exist");
    
    cy.contains("Sign in").should("exist");
    cy.contains("Remember me").should("exist");
    cy.contains("Don't have an account? Sign Up").should("exist");
  });

  it("should validate required username field", () => {
    mountComponent();

    cy.getBySel("signin-username").focus();
    cy.getBySel("signin-username").blur();
    cy.contains("Username is required").should("exist");
    cy.getBySel("signin-submit").should("be.disabled");
  });

  it("should validate required password field", () => {
    mountComponent();

    cy.getBySel("signin-password").focus();
    cy.getBySel("signin-password").blur();
    cy.contains("Enter your password").should("exist");
    cy.getBySel("signin-submit").should("be.disabled");
  });

  it("should validate minimum password length", () => {
    mountComponent();

    cy.getBySel("signin-username").type("testuser");
    cy.getBySel("signin-password").type("123");
    cy.getBySel("signin-password").blur();
    
    cy.contains("Password must contain at least 4 characters").should("exist");
    cy.getBySel("signin-submit").should("be.disabled");
  });

  it("should enable submit button when form is valid", () => {
    mountComponent();

    cy.getBySel("signin-submit").should("be.disabled");
    
    cy.getBySel("signin-username").type("testuser");
    cy.getBySel("signin-password").type("validpassword");
    
    cy.getBySel("signin-submit").should("not.be.disabled");
  });

  it("should handle remember me checkbox", () => {
    mountComponent();

    cy.getBySel("signin-remember-me").should("not.be.checked");
    cy.getBySel("signin-remember-me").check();
    cy.getBySel("signin-remember-me").should("be.checked");
    cy.getBySel("signin-remember-me").uncheck();
    cy.getBySel("signin-remember-me").should("not.be.checked");
  });

  it("should display error message when auth context has error", () => {
    const authServiceWithError = interpret(authMachine.withContext({
      message: "Invalid username or password"
    }));
    authServiceWithError.start();

    mountComponent(authServiceWithError);

    cy.getBySel("signin-error").should("exist");
    cy.getBySel("signin-error").should("contain.text", "Invalid username or password");
    
    authServiceWithError.stop();
  });

  it("should handle login failure", () => {
    cy.intercept("POST", "http://localhost:3001/login", {
      statusCode: 401,
      body: { message: "Invalid credentials" }
    }).as("loginFailure");

    mountComponent();

    cy.getBySel("signin-username").type("wronguser");
    cy.getBySel("signin-password").type("wrongpass");
    cy.getBySel("signin-submit").click();

    cy.wait("@loginFailure");
  });

  it("should navigate to signup page when signup link is clicked", () => {
    mountComponent();

    cy.getBySel("signup").should("have.attr", "href", "/signup");
    cy.getBySel("signup").click();
  });

  it("should handle form submission with remember me checked", () => {
    mountComponent();

    cy.getBySel("signin-username").type("Katharina_Bernier");
    cy.getBySel("signin-password").type("s3cret");
    cy.getBySel("signin-remember-me").check();
    cy.getBySel("signin-submit").click();

    cy.wait("@loginPost");
  });

  it("should clear validation errors when user starts typing", () => {
    mountComponent();

    cy.getBySel("signin-username").focus();
    cy.getBySel("signin-username").blur();
    cy.contains("Username is required").should("exist");
    
    cy.getBySel("signin-username").type("u");
    cy.contains("Username is required").should("not.exist");
  });

  it("should handle empty form submission", () => {
    mountComponent();

    cy.getBySel("signin-submit").should("be.disabled");
    cy.getBySel("signin-username").focus();
    cy.getBySel("signin-username").blur();
    cy.getBySel("signin-password").focus();
    cy.getBySel("signin-password").blur();
    
    cy.contains("Username is required").should("exist");
    cy.contains("Enter your password").should("exist");
  });

  it("should handle special characters in username and password", () => {
    mountComponent();

    cy.getBySel("signin-username").type("user@domain.com");
    cy.getBySel("signin-password").type("p@ssw0rd!");
    
    cy.getBySel("signin-submit").should("not.be.disabled");
  });

  it("should handle very long username and password", () => {
    mountComponent();

    const longUsername = "a".repeat(100);
    const longPassword = "b".repeat(100);
    
    cy.getBySel("signin-username").type(longUsername);
    cy.getBySel("signin-password").type(longPassword);
    
    cy.getBySel("signin-submit").should("not.be.disabled");
  });

  it("should maintain form state during validation", () => {
    mountComponent();

    cy.getBySel("signin-username").type("testuser");
    cy.getBySel("signin-password").type("123");
    cy.getBySel("signin-remember-me").check();
    
    cy.getBySel("signin-password").clear();
    cy.getBySel("signin-password").type("validpassword");
    
    cy.getBySel("signin-username").should("have.value", "testuser");
    cy.getBySel("signin-remember-me").should("be.checked");
    cy.getBySel("signin-submit").should("not.be.disabled");
  });

  it("should handle rapid form interactions", () => {
    mountComponent();

    cy.getBySel("signin-username").type("user");
    cy.getBySel("signin-password").type("pass");
    cy.getBySel("signin-remember-me").check();
    cy.getBySel("signin-remember-me").uncheck();
    cy.getBySel("signin-remember-me").check();
    cy.getBySel("signin-username").clear();
    cy.getBySel("signin-username").type("newuser");
    cy.getBySel("signin-password").clear();
    cy.getBySel("signin-password").type("newpass");
    
    cy.getBySel("signin-submit").should("not.be.disabled");
  });

  it("should have proper accessibility attributes", () => {
    mountComponent();

    cy.getBySel("signin-username")
      .should("have.attr", "id", "username")
      .should("have.attr", "type", "text")
      .should("have.attr", "autoFocus");
    
    cy.getBySel("signin-password")
      .should("have.attr", "id", "password")
      .should("have.attr", "type", "password");
    
    cy.get("label").contains("Username").should("exist");
    cy.get("label").contains("Password").should("exist");
  });

  it("should handle network errors gracefully", () => {
    cy.intercept("POST", "http://localhost:3001/login", {
      forceNetworkError: true
    }).as("networkError");

    mountComponent();

    cy.getBySel("signin-username").type("testuser");
    cy.getBySel("signin-password").type("testpass");
    cy.getBySel("signin-submit").click();

    cy.wait("@networkError");
  });

  it("should render RWA logo", () => {
    mountComponent();

    cy.get("svg").should("exist");
  });

  it("should render footer component", () => {
    mountComponent();

    cy.get("footer").should("exist");
  });

  it("should handle form reset scenarios", () => {
    mountComponent();

    cy.getBySel("signin-username").type("testuser");
    cy.getBySel("signin-password").type("testpass");
    cy.getBySel("signin-remember-me").check();
    
    cy.reload();
    
    cy.getBySel("signin-username").should("have.value", "");
    cy.getBySel("signin-password").should("have.value", "");
    cy.getBySel("signin-remember-me").should("not.be.checked");
  });

  it("should handle edge case password lengths", () => {
    mountComponent();

    cy.getBySel("signin-username").type("testuser");
    
    cy.getBySel("signin-password").type("1234");
    cy.getBySel("signin-submit").should("not.be.disabled");
    
    cy.getBySel("signin-password").clear();
    cy.getBySel("signin-password").type("123");
    cy.getBySel("signin-submit").should("be.disabled");
  });

  it("should maintain proper Material-UI styling", () => {
    mountComponent();

    cy.get(".MuiContainer-root").should("exist");
    cy.get(".MuiTextField-root").should("have.length", 2);
    cy.get(".MuiButton-root").should("exist");
    cy.get(".MuiCheckbox-root").should("exist");
    cy.get(".MuiTypography-root").should("exist");
  });
});
