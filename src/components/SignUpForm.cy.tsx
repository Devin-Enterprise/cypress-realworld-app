import React from "react";
import { interpret } from "xstate";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import SignUpForm from "./SignUpForm";
import { authMachine } from "../machines/authMachine";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
  },
});

describe("SignUpForm", () => {
  let authService;
  
  const mountComponent = (authServiceOverride = authService) => {
    cy.mount(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SignUpForm authService={authServiceOverride} />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    authService = interpret(authMachine);
    authService.start();

    cy.intercept("POST", "http://localhost:3001/users", {
      user: {
        id: "new-user-id",
        uuid: "new-user-uuid",
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        email: "john@example.com",
        phoneNumber: "555-123-4567",
        avatar: "https://example.com/avatar.jpg",
        defaultPrivacyLevel: "public",
        balance: 0,
        createdAt: "2023-01-15T10:30:00Z",
        modifiedAt: "2023-01-15T10:30:00Z",
      },
    }).as("signupPost");
  });

  afterEach(() => {
    authService?.stop();
  });

  it("should render all form elements", () => {
    mountComponent();

    cy.getBySel("signup-title").should("contain.text", "Sign Up");
    cy.getBySel("signup-first-name").should("exist");
    cy.getBySel("signup-last-name").should("exist");
    cy.getBySel("signup-username").should("exist");
    cy.getBySel("signup-password").should("exist");
    cy.getBySel("signup-confirmPassword").should("exist");
    cy.getBySel("signup-submit").should("exist");
    
    cy.contains("Have an account? Sign In").should("exist");
    cy.get("svg").should("exist"); // RWA Logo
    cy.get("footer").should("exist");
  });

  it("should validate required first name field", () => {
    mountComponent();

    cy.getBySel("signup-first-name").focus();
    cy.getBySel("signup-first-name").blur();
    cy.contains("First Name is required").should("exist");
    cy.getBySel("signup-submit").should("be.disabled");
  });

  it("should validate required last name field", () => {
    mountComponent();

    cy.getBySel("signup-last-name").focus();
    cy.getBySel("signup-last-name").blur();
    cy.contains("Last Name is required").should("exist");
    cy.getBySel("signup-submit").should("be.disabled");
  });

  it("should validate required username field", () => {
    mountComponent();

    cy.getBySel("signup-username").focus();
    cy.getBySel("signup-username").blur();
    cy.contains("Username is required").should("exist");
    cy.getBySel("signup-submit").should("be.disabled");
  });

  it("should validate required password field", () => {
    mountComponent();

    cy.getBySel("signup-password").focus();
    cy.getBySel("signup-password").blur();
    cy.contains("Enter your password").should("exist");
    cy.getBySel("signup-submit").should("be.disabled");
  });

  it("should validate minimum password length", () => {
    mountComponent();

    cy.getBySel("signup-password").type("123");
    cy.getBySel("signup-password").blur();
    
    cy.contains("Password must contain at least 4 characters").should("exist");
    cy.getBySel("signup-submit").should("be.disabled");
  });

  it("should validate password confirmation field", () => {
    mountComponent();

    cy.getBySel("signup-confirmPassword").focus();
    cy.getBySel("signup-confirmPassword").blur();
    cy.contains("Confirm your password").should("exist");
    cy.getBySel("signup-submit").should("be.disabled");
  });

  it("should validate password confirmation matching", () => {
    mountComponent();

    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("differentpassword");
    cy.getBySel("signup-confirmPassword").blur();
    
    cy.contains("Password does not match").should("exist");
    cy.getBySel("signup-submit").should("be.disabled");
  });

  it("should enable submit button when all fields are valid", () => {
    mountComponent();

    cy.getBySel("signup-submit").should("be.disabled");
    
    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("johndoe");
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("password123");
    
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should submit form with valid data", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("johndoe");
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("password123");
    cy.getBySel("signup-submit").click();

    cy.wait("@signupPost");
  });

  it("should clear validation errors when user starts typing", () => {
    mountComponent();

    cy.getBySel("signup-first-name").focus();
    cy.getBySel("signup-first-name").blur();
    cy.contains("First Name is required").should("exist");
    
    cy.getBySel("signup-first-name").type("J");
    cy.contains("First Name is required").should("not.exist");
  });

  it("should handle password confirmation validation dynamically", () => {
    mountComponent();

    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("password");
    cy.getBySel("signup-confirmPassword").blur();
    
    cy.contains("Password does not match").should("exist");
    
    cy.getBySel("signup-confirmPassword").clear();
    cy.getBySel("signup-confirmPassword").type("password123");
    cy.contains("Password does not match").should("not.exist");
  });

  it("should handle form submission failure", () => {
    cy.intercept("POST", "http://localhost:3001/users", {
      statusCode: 400,
      body: { message: "Username already exists" }
    }).as("signupFailure");

    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("existinguser");
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("password123");
    cy.getBySel("signup-submit").click();

    cy.wait("@signupFailure");
  });

  it("should navigate to signin page when signin link is clicked", () => {
    mountComponent();

    cy.contains("Have an account? Sign In").should("have.attr", "href", "/signin");
    cy.contains("Have an account? Sign In").click();
  });

  it("should handle special characters in form fields", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("José");
    cy.getBySel("signup-last-name").type("García-López");
    cy.getBySel("signup-username").type("user@domain.com");
    cy.getBySel("signup-password").type("p@ssw0rd!");
    cy.getBySel("signup-confirmPassword").type("p@ssw0rd!");
    
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should handle very long input values", () => {
    mountComponent();

    const longName = "a".repeat(100);
    const longUsername = "b".repeat(100);
    const longPassword = "c".repeat(100);
    
    cy.getBySel("signup-first-name").type(longName);
    cy.getBySel("signup-last-name").type(longName);
    cy.getBySel("signup-username").type(longUsername);
    cy.getBySel("signup-password").type(longPassword);
    cy.getBySel("signup-confirmPassword").type(longPassword);
    
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should maintain form state during validation", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("johndoe");
    cy.getBySel("signup-password").type("short");
    cy.getBySel("signup-confirmPassword").type("different");
    
    cy.getBySel("signup-password").clear();
    cy.getBySel("signup-password").type("validpassword");
    cy.getBySel("signup-confirmPassword").clear();
    cy.getBySel("signup-confirmPassword").type("validpassword");
    
    cy.getBySel("signup-first-name").should("have.value", "John");
    cy.getBySel("signup-last-name").should("have.value", "Doe");
    cy.getBySel("signup-username").should("have.value", "johndoe");
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should handle rapid form interactions", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-first-name").clear();
    cy.getBySel("signup-first-name").type("Jane");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-last-name").clear();
    cy.getBySel("signup-last-name").type("Smith");
    cy.getBySel("signup-username").type("user1");
    cy.getBySel("signup-username").clear();
    cy.getBySel("signup-username").type("user2");
    cy.getBySel("signup-password").type("pass1");
    cy.getBySel("signup-password").clear();
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("pass1");
    cy.getBySel("signup-confirmPassword").clear();
    cy.getBySel("signup-confirmPassword").type("password123");
    
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should have proper accessibility attributes", () => {
    mountComponent();

    cy.getBySel("signup-first-name")
      .should("have.attr", "id", "firstName")
      .should("have.attr", "type", "text")
      .should("have.attr", "autoFocus");
    
    cy.getBySel("signup-last-name")
      .should("have.attr", "id", "lastName")
      .should("have.attr", "type", "text");
    
    cy.getBySel("signup-username")
      .should("have.attr", "id", "username")
      .should("have.attr", "type", "text");
    
    cy.getBySel("signup-password")
      .should("have.attr", "id", "password")
      .should("have.attr", "type", "password");
    
    cy.getBySel("signup-confirmPassword")
      .should("have.attr", "id", "confirmPassword")
      .should("have.attr", "type", "password");
    
    cy.get("label").contains("First Name").should("exist");
    cy.get("label").contains("Last Name").should("exist");
    cy.get("label").contains("Username").should("exist");
    cy.get("label").contains("Password").should("exist");
    cy.get("label").contains("Confirm Password").should("exist");
  });

  it("should handle network errors gracefully", () => {
    cy.intercept("POST", "http://localhost:3001/users", {
      forceNetworkError: true
    }).as("networkError");

    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("johndoe");
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("password123");
    cy.getBySel("signup-submit").click();

    cy.wait("@networkError");
  });

  it("should handle empty form submission", () => {
    mountComponent();

    cy.getBySel("signup-submit").should("be.disabled");
    
    cy.getBySel("signup-first-name").focus();
    cy.getBySel("signup-first-name").blur();
    cy.getBySel("signup-last-name").focus();
    cy.getBySel("signup-last-name").blur();
    cy.getBySel("signup-username").focus();
    cy.getBySel("signup-username").blur();
    cy.getBySel("signup-password").focus();
    cy.getBySel("signup-password").blur();
    cy.getBySel("signup-confirmPassword").focus();
    cy.getBySel("signup-confirmPassword").blur();
    
    cy.contains("First Name is required").should("exist");
    cy.contains("Last Name is required").should("exist");
    cy.contains("Username is required").should("exist");
    cy.contains("Enter your password").should("exist");
    cy.contains("Confirm your password").should("exist");
  });

  it("should handle edge case password lengths", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("johndoe");
    
    cy.getBySel("signup-password").type("1234");
    cy.getBySel("signup-confirmPassword").type("1234");
    cy.getBySel("signup-submit").should("not.be.disabled");
    
    cy.getBySel("signup-password").clear();
    cy.getBySel("signup-password").type("123");
    cy.getBySel("signup-confirmPassword").clear();
    cy.getBySel("signup-confirmPassword").type("123");
    cy.getBySel("signup-submit").should("be.disabled");
  });

  it("should maintain proper Material-UI styling", () => {
    mountComponent();

    cy.get(".MuiContainer-root").should("exist");
    cy.get(".MuiTextField-root").should("have.length", 5);
    cy.get(".MuiButton-root").should("exist");
    cy.get(".MuiTypography-root").should("exist");
    cy.get(".MuiGrid-container").should("exist");
  });

  it("should handle form reset scenarios", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("johndoe");
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("password123");
    
    cy.reload();
    
    cy.getBySel("signup-first-name").should("have.value", "");
    cy.getBySel("signup-last-name").should("have.value", "");
    cy.getBySel("signup-username").should("have.value", "");
    cy.getBySel("signup-password").should("have.value", "");
    cy.getBySel("signup-confirmPassword").should("have.value", "");
  });

  it("should validate all fields together", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-submit").should("be.disabled");
    
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-submit").should("be.disabled");
    
    cy.getBySel("signup-username").type("johndoe");
    cy.getBySel("signup-submit").should("be.disabled");
    
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-submit").should("be.disabled");
    
    cy.getBySel("signup-confirmPassword").type("password123");
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should handle whitespace in form fields", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("  John  ");
    cy.getBySel("signup-last-name").type("  Doe  ");
    cy.getBySel("signup-username").type("  johndoe  ");
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("password123");
    
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should handle numeric usernames", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("123456789");
    cy.getBySel("signup-password").type("password123");
    cy.getBySel("signup-confirmPassword").type("password123");
    
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should handle mixed case passwords", () => {
    mountComponent();

    cy.getBySel("signup-first-name").type("John");
    cy.getBySel("signup-last-name").type("Doe");
    cy.getBySel("signup-username").type("johndoe");
    cy.getBySel("signup-password").type("PassWord123");
    cy.getBySel("signup-confirmPassword").type("PassWord123");
    
    cy.getBySel("signup-submit").should("not.be.disabled");
  });

  it("should handle case sensitivity in password confirmation", () => {
    mountComponent();

    cy.getBySel("signup-password").type("Password123");
    cy.getBySel("signup-confirmPassword").type("password123");
    cy.getBySel("signup-confirmPassword").blur();
    
    cy.contains("Password does not match").should("exist");
    
    cy.getBySel("signup-confirmPassword").clear();
    cy.getBySel("signup-confirmPassword").type("Password123");
    cy.contains("Password does not match").should("not.exist");
  });
});
