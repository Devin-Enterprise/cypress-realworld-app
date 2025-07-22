import React from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import BankAccountForm from "./BankAccountForm";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
  },
});

describe("BankAccountForm", () => {
  const mockCreateBankAccount = cy.stub();
  const mockUserId = "test-user-123";

  const mountComponent = (props = {}) => {
    const defaultProps = {
      userId: mockUserId,
      createBankAccount: mockCreateBankAccount,
      onboarding: false,
      ...props,
    };

    cy.mount(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BankAccountForm {...defaultProps} />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    mockCreateBankAccount.reset();
  });

  it("should render all form elements", () => {
    mountComponent();

    cy.getBySel("bankaccount-form").should("exist");
    cy.getBySel("bankaccount-bankName-input").should("exist");
    cy.getBySel("bankaccount-routingNumber-input").should("exist");
    cy.getBySel("bankaccount-accountNumber-input").should("exist");
    cy.getBySel("bankaccount-submit").should("exist");
    
    cy.getBySel("bankaccount-bankName-input").should("have.attr", "placeholder", "Bank Name");
    cy.getBySel("bankaccount-routingNumber-input").should("have.attr", "placeholder", "Routing Number");
    cy.getBySel("bankaccount-accountNumber-input").should("have.attr", "placeholder", "Account Number");
    cy.getBySel("bankaccount-submit").should("contain.text", "Save");
  });

  it("should validate required bank name field", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").focus();
    cy.getBySel("bankaccount-bankName-input").blur();
    cy.contains("Enter a bank name").should("exist");
    cy.getBySel("bankaccount-submit").should("be.disabled");
  });

  it("should validate minimum bank name length", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("Bank");
    cy.getBySel("bankaccount-bankName-input").blur();
    
    cy.contains("Must contain at least 5 characters").should("exist");
    cy.getBySel("bankaccount-submit").should("be.disabled");
  });

  it("should validate required routing number field", () => {
    mountComponent();

    cy.getBySel("bankaccount-routingNumber-input").focus();
    cy.getBySel("bankaccount-routingNumber-input").blur();
    cy.contains("Enter a valid bank routing number").should("exist");
    cy.getBySel("bankaccount-submit").should("be.disabled");
  });

  it("should validate routing number length", () => {
    mountComponent();

    cy.getBySel("bankaccount-routingNumber-input").type("12345678");
    cy.getBySel("bankaccount-routingNumber-input").blur();
    
    cy.contains("Must contain a valid routing number").should("exist");
    cy.getBySel("bankaccount-submit").should("be.disabled");
    
    cy.getBySel("bankaccount-routingNumber-input").clear();
    cy.getBySel("bankaccount-routingNumber-input").type("1234567890");
    cy.getBySel("bankaccount-routingNumber-input").blur();
    
    cy.contains("Must contain a valid routing number").should("exist");
    cy.getBySel("bankaccount-submit").should("be.disabled");
  });

  it("should validate required account number field", () => {
    mountComponent();

    cy.getBySel("bankaccount-accountNumber-input").focus();
    cy.getBySel("bankaccount-accountNumber-input").blur();
    cy.contains("Enter a valid bank account number").should("exist");
    cy.getBySel("bankaccount-submit").should("be.disabled");
  });

  it("should validate account number length constraints", () => {
    mountComponent();

    cy.getBySel("bankaccount-accountNumber-input").type("12345678");
    cy.getBySel("bankaccount-accountNumber-input").blur();
    
    cy.contains("Must contain at least 9 digits").should("exist");
    cy.getBySel("bankaccount-submit").should("be.disabled");
    
    cy.getBySel("bankaccount-accountNumber-input").clear();
    cy.getBySel("bankaccount-accountNumber-input").type("1234567890123");
    cy.getBySel("bankaccount-accountNumber-input").blur();
    
    cy.contains("Must contain no more than 12 digits").should("exist");
    cy.getBySel("bankaccount-submit").should("be.disabled");
  });

  it("should enable submit button when all fields are valid", () => {
    mountComponent();

    cy.getBySel("bankaccount-submit").should("be.disabled");
    
    cy.getBySel("bankaccount-bankName-input").type("Chase Bank");
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should submit form with valid data", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("Wells Fargo");
    cy.getBySel("bankaccount-routingNumber-input").type("121000248");
    cy.getBySel("bankaccount-accountNumber-input").type("1234567890");
    cy.getBySel("bankaccount-submit").click();

    cy.then(() => {
      expect(mockCreateBankAccount).to.have.been.calledWith({
        userId: mockUserId,
        bankName: "Wells Fargo",
        routingNumber: "121000248",
        accountNumber: "1234567890",
      });
    });
  });

  it("should handle onboarding mode", () => {
    mountComponent({ onboarding: true });

    cy.getBySel("bankaccount-bankName-input").type("Bank of America");
    cy.getBySel("bankaccount-routingNumber-input").type("026009593");
    cy.getBySel("bankaccount-accountNumber-input").type("123456789");
    cy.getBySel("bankaccount-submit").click();

    cy.then(() => {
      expect(mockCreateBankAccount).to.have.been.calledWith({
        userId: mockUserId,
        bankName: "Bank of America",
        routingNumber: "026009593",
        accountNumber: "123456789",
      });
    });
  });

  it("should clear validation errors when user starts typing", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").focus();
    cy.getBySel("bankaccount-bankName-input").blur();
    cy.contains("Enter a bank name").should("exist");
    
    cy.getBySel("bankaccount-bankName-input").type("C");
    cy.contains("Enter a bank name").should("not.exist");
  });

  it("should handle edge case routing numbers", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("Test Bank");
    cy.getBySel("bankaccount-accountNumber-input").type("123456789");
    
    cy.getBySel("bankaccount-routingNumber-input").type("000000000");
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
    
    cy.getBySel("bankaccount-routingNumber-input").clear();
    cy.getBySel("bankaccount-routingNumber-input").type("999999999");
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should handle edge case account numbers", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("Test Bank");
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    
    cy.getBySel("bankaccount-accountNumber-input").type("123456789");
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
    
    cy.getBySel("bankaccount-accountNumber-input").clear();
    cy.getBySel("bankaccount-accountNumber-input").type("123456789012");
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should handle special characters in bank name", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("First National Bank & Trust");
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should handle numeric bank names", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("1st Bank");
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should maintain form state during validation", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("Test Bank");
    cy.getBySel("bankaccount-routingNumber-input").type("12345678");
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    
    cy.getBySel("bankaccount-routingNumber-input").clear();
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    
    cy.getBySel("bankaccount-bankName-input").should("have.value", "Test Bank");
    cy.getBySel("bankaccount-accountNumber-input").should("have.value", "987654321");
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should handle rapid form interactions", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("Bank1");
    cy.getBySel("bankaccount-bankName-input").clear();
    cy.getBySel("bankaccount-bankName-input").type("Bank2");
    cy.getBySel("bankaccount-routingNumber-input").type("111111111");
    cy.getBySel("bankaccount-routingNumber-input").clear();
    cy.getBySel("bankaccount-routingNumber-input").type("222222222");
    cy.getBySel("bankaccount-accountNumber-input").type("111111111");
    cy.getBySel("bankaccount-accountNumber-input").clear();
    cy.getBySel("bankaccount-accountNumber-input").type("222222222");
    
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should have proper accessibility attributes", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input")
      .should("have.attr", "id", "bankaccount-bankName-input")
      .should("have.attr", "type", "text")
      .should("have.attr", "required");
    
    cy.getBySel("bankaccount-routingNumber-input")
      .should("have.attr", "id", "bankaccount-routingNumber-input")
      .should("have.attr", "type", "text")
      .should("have.attr", "required");
    
    cy.getBySel("bankaccount-accountNumber-input")
      .should("have.attr", "id", "bankaccount-accountNumber-input")
      .should("have.attr", "type", "text")
      .should("have.attr", "required");
  });

  it("should handle empty form submission", () => {
    mountComponent();

    cy.getBySel("bankaccount-submit").should("be.disabled");
    
    cy.getBySel("bankaccount-bankName-input").focus();
    cy.getBySel("bankaccount-bankName-input").blur();
    cy.getBySel("bankaccount-routingNumber-input").focus();
    cy.getBySel("bankaccount-routingNumber-input").blur();
    cy.getBySel("bankaccount-accountNumber-input").focus();
    cy.getBySel("bankaccount-accountNumber-input").blur();
    
    cy.contains("Enter a bank name").should("exist");
    cy.contains("Enter a valid bank routing number").should("exist");
    cy.contains("Enter a valid bank account number").should("exist");
  });

  it("should handle whitespace in form fields", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("  Chase Bank  ");
    cy.getBySel("bankaccount-routingNumber-input").type("  123456789  ");
    cy.getBySel("bankaccount-accountNumber-input").type("  987654321  ");
    
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should handle very long bank names", () => {
    mountComponent();

    const longBankName = "Very Long Bank Name That Exceeds Normal Length Expectations";
    
    cy.getBySel("bankaccount-bankName-input").type(longBankName);
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should maintain proper Material-UI styling", () => {
    mountComponent();

    cy.get(".MuiTextField-root").should("have.length", 3);
    cy.get(".MuiButton-root").should("exist");
    cy.get(".MuiGrid-container").should("exist");
    cy.get(".MuiGrid-item").should("exist");
  });

  it("should handle form reset scenarios", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("Test Bank");
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    
    cy.reload();
    
    cy.getBySel("bankaccount-bankName-input").should("have.value", "");
    cy.getBySel("bankaccount-routingNumber-input").should("have.value", "");
    cy.getBySel("bankaccount-accountNumber-input").should("have.value", "");
  });

  it("should validate all fields together", () => {
    mountComponent();

    cy.getBySel("bankaccount-bankName-input").type("Chase");
    cy.getBySel("bankaccount-submit").should("be.disabled");
    
    cy.getBySel("bankaccount-bankName-input").clear();
    cy.getBySel("bankaccount-bankName-input").type("Chase Bank");
    cy.getBySel("bankaccount-submit").should("be.disabled");
    
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    cy.getBySel("bankaccount-submit").should("be.disabled");
    
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    cy.getBySel("bankaccount-submit").should("not.be.disabled");
  });

  it("should handle different user IDs", () => {
    const differentUserId = "different-user-456";
    mountComponent({ userId: differentUserId });

    cy.getBySel("bankaccount-bankName-input").type("Test Bank");
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    cy.getBySel("bankaccount-submit").click();

    cy.then(() => {
      expect(mockCreateBankAccount).to.have.been.calledWith({
        userId: differentUserId,
        bankName: "Test Bank",
        routingNumber: "123456789",
        accountNumber: "987654321",
      });
    });
  });

  it("should handle real bank routing numbers", () => {
    mountComponent();

    const realRoutingNumbers = [
      "021000021", // Chase
      "026009593", // Bank of America
      "121000248", // Wells Fargo
      "111000025", // Bank of New York Mellon
    ];

    realRoutingNumbers.forEach((routingNumber, index) => {
      cy.getBySel("bankaccount-bankName-input").clear();
      cy.getBySel("bankaccount-bankName-input").type(`Bank ${index + 1}`);
      cy.getBySel("bankaccount-routingNumber-input").clear();
      cy.getBySel("bankaccount-routingNumber-input").type(routingNumber);
      cy.getBySel("bankaccount-accountNumber-input").clear();
      cy.getBySel("bankaccount-accountNumber-input").type("123456789");
      
      cy.getBySel("bankaccount-submit").should("not.be.disabled");
    });
  });

  it("should handle account numbers with different lengths", () => {
    mountComponent();

    const accountNumbers = [
      "123456789",    // 9 digits
      "1234567890",   // 10 digits
      "12345678901",  // 11 digits
      "123456789012", // 12 digits
    ];

    accountNumbers.forEach((accountNumber, index) => {
      cy.getBySel("bankaccount-bankName-input").clear();
      cy.getBySel("bankaccount-bankName-input").type(`Bank ${index + 1}`);
      cy.getBySel("bankaccount-routingNumber-input").clear();
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
      cy.getBySel("bankaccount-accountNumber-input").clear();
      cy.getBySel("bankaccount-accountNumber-input").type(accountNumber);
      
      cy.getBySel("bankaccount-submit").should("not.be.disabled");
    });
  });

  it("should handle form submission errors gracefully", () => {
    const errorCreateBankAccount = cy.stub().throws(new Error("Network error"));
    mountComponent({ createBankAccount: errorCreateBankAccount });

    cy.getBySel("bankaccount-bankName-input").type("Test Bank");
    cy.getBySel("bankaccount-routingNumber-input").type("123456789");
    cy.getBySel("bankaccount-accountNumber-input").type("987654321");
    cy.getBySel("bankaccount-submit").click();

    cy.then(() => {
      expect(errorCreateBankAccount).to.have.been.called;
    });
  });
});
