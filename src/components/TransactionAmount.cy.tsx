import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import TransactionAmount from "./TransactionAmount";
import { TransactionResponseItem, TransactionStatus, DefaultPrivacyLevel } from "../models";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
  },
  typography: {
    body1: {
      fontSize: "1rem",
    },
  },
  breakpoints: {
    down: (key: string) => `@media (max-width:${key === "md" ? "960" : "600"}px)`,
  },
});

const createMockTransaction = (overrides: Partial<TransactionResponseItem> = {}): TransactionResponseItem => ({
  id: "test-transaction-1",
  uuid: "test-uuid-1",
  source: "test-source",
  amount: 2500,
  description: "Test transaction",
  privacyLevel: DefaultPrivacyLevel.public,
  receiverName: "John Doe",
  senderName: "Jane Smith",
  receiverAvatar: "https://example.com/john-avatar.jpg",
  senderAvatar: "https://example.com/jane-avatar.jpg",
  receiverId: "receiver-1",
  senderId: "sender-1",
  status: TransactionStatus.complete,
  requestStatus: "approved",
  balanceAtCompletion: 5000,
  likes: [],
  comments: [],
  createdAt: new Date("2023-01-15T10:30:00Z"),
  modifiedAt: new Date("2023-01-15T10:30:00Z"),
  requestResolvedAt: new Date("2023-01-15T10:30:00Z"),
  ...overrides,
});

describe("TransactionAmount Component", () => {
  const mountComponent = (transaction: TransactionResponseItem) => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TransactionAmount transaction={transaction} />
      </ThemeProvider>
    );
  };

  it("should render payment transaction with negative amount", () => {
    const paymentTransaction = createMockTransaction({
      id: "payment-1",
      amount: 2500,
      senderId: "current-user",
      receiverId: "other-user",
    });

    mountComponent(paymentTransaction);

    cy.getBySel("transaction-amount-payment-1").should("exist");
    cy.getBySel("transaction-amount-payment-1").should("contain.text", "-$25.00");
    cy.getBySel("transaction-amount-payment-1").should("have.class", "TransactionAmount-amountNegative");
  });

  it("should render request transaction with positive amount", () => {
    const requestTransaction = createMockTransaction({
      id: "request-1",
      amount: 1500,
      senderId: "other-user",
      receiverId: "current-user",
    });

    mountComponent(requestTransaction);

    cy.getBySel("transaction-amount-request-1").should("exist");
    cy.getBySel("transaction-amount-request-1").should("contain.text", "+$15.00");
    cy.getBySel("transaction-amount-request-1").should("have.class", "TransactionAmount-amountPositive");
  });

  it("should apply correct styling for positive amounts", () => {
    const requestTransaction = createMockTransaction({
      id: "positive-amount",
      senderId: "other-user",
      receiverId: "current-user",
    });

    mountComponent(requestTransaction);

    cy.getBySel("transaction-amount-positive-amount")
      .should("have.css", "color", "rgb(76, 175, 80)")
      .should("have.css", "font-size", "24px");
  });

  it("should apply correct styling for negative amounts", () => {
    const paymentTransaction = createMockTransaction({
      id: "negative-amount",
      senderId: "current-user",
      receiverId: "other-user",
    });

    mountComponent(paymentTransaction);

    cy.getBySel("transaction-amount-negative-amount")
      .should("have.css", "color", "rgb(255, 0, 0)")
      .should("have.css", "font-size", "24px");
  });

  it("should handle zero amount", () => {
    const zeroTransaction = createMockTransaction({
      id: "zero-amount",
      amount: 0,
    });

    mountComponent(zeroTransaction);

    cy.getBySel("transaction-amount-zero-amount").should("exist");
    cy.getBySel("transaction-amount-zero-amount").should("contain.text", "$0.00");
  });

  it("should handle large amounts", () => {
    const largeAmountTransaction = createMockTransaction({
      id: "large-amount",
      amount: 999999999,
      senderId: "current-user",
      receiverId: "other-user",
    });

    mountComponent(largeAmountTransaction);

    cy.getBySel("transaction-amount-large-amount").should("exist");
    cy.getBySel("transaction-amount-large-amount").should("contain.text", "-$9,999,999.99");
  });

  it("should handle small decimal amounts", () => {
    const smallAmountTransaction = createMockTransaction({
      id: "small-amount",
      amount: 1,
      senderId: "current-user",
      receiverId: "other-user",
    });

    mountComponent(smallAmountTransaction);

    cy.getBySel("transaction-amount-small-amount").should("exist");
    cy.getBySel("transaction-amount-small-amount").should("contain.text", "-$0.01");
  });

  it("should handle missing amount gracefully", () => {
    const noAmountTransaction = createMockTransaction({
      id: "no-amount",
      amount: undefined as any,
    });

    mountComponent(noAmountTransaction);

    cy.getBySel("transaction-amount-no-amount").should("exist");
  });

  it("should render as inline span element", () => {
    const transaction = createMockTransaction();

    mountComponent(transaction);

    cy.getBySel("transaction-amount-test-transaction-1")
      .should("have.prop", "tagName", "SPAN")
      .should("have.css", "display", "inline");
  });

  it("should have correct data-test attribute", () => {
    const transaction = createMockTransaction({
      id: "custom-id-123",
    });

    mountComponent(transaction);

    cy.getBySel("transaction-amount-custom-id-123").should("exist");
    cy.get("[data-test='transaction-amount-custom-id-123']").should("exist");
  });

  it("should handle different transaction statuses", () => {
    const pendingTransaction = createMockTransaction({
      id: "pending-transaction",
      status: TransactionStatus.pending,
      amount: 5000,
    });

    mountComponent(pendingTransaction);

    cy.getBySel("transaction-amount-pending-transaction").should("exist");
    cy.getBySel("transaction-amount-pending-transaction").should("contain.text", "$50.00");
  });

  it("should handle incomplete transactions", () => {
    const incompleteTransaction = createMockTransaction({
      id: "incomplete-transaction",
      status: TransactionStatus.incomplete,
      amount: 7500,
    });

    mountComponent(incompleteTransaction);

    cy.getBySel("transaction-amount-incomplete-transaction").should("exist");
    cy.getBySel("transaction-amount-incomplete-transaction").should("contain.text", "$75.00");
  });

  it("should maintain consistent formatting across different amounts", () => {
    const amounts = [100, 1000, 10000, 100000];
    const expectedTexts = ["$1.00", "$10.00", "$100.00", "$1,000.00"];

    amounts.forEach((amount, index) => {
      const transaction = createMockTransaction({
        id: `amount-test-${index}`,
        amount,
        senderId: "other-user",
        receiverId: "current-user",
      });

      mountComponent(transaction);

      cy.getBySel(`transaction-amount-amount-test-${index}`)
        .should("contain.text", `+${expectedTexts[index]}`);
    });
  });

  it("should handle edge case amounts", () => {
    const edgeCases = [
      { amount: 1, expected: "$0.01" },
      { amount: 99, expected: "$0.99" },
      { amount: 100, expected: "$1.00" },
      { amount: 999, expected: "$9.99" },
      { amount: 1000, expected: "$10.00" },
    ];

    edgeCases.forEach((testCase, index) => {
      const transaction = createMockTransaction({
        id: `edge-case-${index}`,
        amount: testCase.amount,
        senderId: "current-user",
        receiverId: "other-user",
      });

      mountComponent(transaction);

      cy.getBySel(`transaction-amount-edge-case-${index}`)
        .should("contain.text", `-${testCase.expected}`);
    });
  });

  it("should apply Material-UI Typography props correctly", () => {
    const transaction = createMockTransaction();

    mountComponent(transaction);

    cy.getBySel("transaction-amount-test-transaction-1")
      .should("have.attr", "color", "primary")
      .should("have.class", "MuiTypography-root");
  });

  it("should handle responsive font sizing", () => {
    const transaction = createMockTransaction();

    mountComponent(transaction);

    cy.getBySel("transaction-amount-test-transaction-1")
      .should("have.css", "font-size", "24px");

    cy.viewport("iphone-6");
    cy.getBySel("transaction-amount-test-transaction-1")
      .should("exist");
  });

  it("should distinguish between sent and received transactions", () => {
    const sentTransaction = createMockTransaction({
      id: "sent-transaction",
      amount: 2000,
      senderId: "current-user-id",
      receiverId: "other-user-id",
    });

    const receivedTransaction = createMockTransaction({
      id: "received-transaction",
      amount: 3000,
      senderId: "other-user-id",
      receiverId: "current-user-id",
    });

    mountComponent(sentTransaction);
    cy.getBySel("transaction-amount-sent-transaction")
      .should("contain.text", "-$20.00")
      .should("have.class", "TransactionAmount-amountNegative");

    mountComponent(receivedTransaction);
    cy.getBySel("transaction-amount-received-transaction")
      .should("contain.text", "+$30.00")
      .should("have.class", "TransactionAmount-amountPositive");
  });

  it("should handle special characters in transaction IDs", () => {
    const transaction = createMockTransaction({
      id: "transaction-with-special-chars_123",
      amount: 1500,
    });

    mountComponent(transaction);

    cy.getBySel("transaction-amount-transaction-with-special-chars_123").should("exist");
  });

  it("should maintain accessibility attributes", () => {
    const transaction = createMockTransaction();

    mountComponent(transaction);

    cy.getBySel("transaction-amount-test-transaction-1")
      .should("be.visible")
      .should("have.attr", "data-test");
  });

  it("should handle very long transaction IDs", () => {
    const longId = "very-long-transaction-id-that-might-cause-issues-in-some-systems-123456789";
    const transaction = createMockTransaction({
      id: longId,
      amount: 2500,
    });

    mountComponent(transaction);

    cy.getBySel(`transaction-amount-${longId}`).should("exist");
  });

  it("should render correctly with different privacy levels", () => {
    const privateTransaction = createMockTransaction({
      id: "private-transaction",
      privacyLevel: DefaultPrivacyLevel.private,
      amount: 4000,
    });

    mountComponent(privateTransaction);

    cy.getBySel("transaction-amount-private-transaction")
      .should("exist")
      .should("contain.text", "$40.00");
  });

  it("should handle null or undefined transaction gracefully", () => {
    const transactionWithNullFields = createMockTransaction({
      id: "null-fields",
      receiverName: null as any,
      senderName: null as any,
      amount: 1000,
    });

    mountComponent(transactionWithNullFields);

    cy.getBySel("transaction-amount-null-fields")
      .should("exist")
      .should("contain.text", "$10.00");
  });
});
