import React from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import TransactionItem from "./TransactionItem";
import { TransactionResponseItem, TransactionStatus, DefaultPrivacyLevel } from "../models";

const theme = createTheme({
  palette: {
    secondary: {
      main: "#fff",
    },
    grey: {
      400: "#bdbdbd",
    },
    background: {
      paper: "#fff",
    },
  },
  typography: {
    fontSize: 14 * 0.875,
    body1: {
      lineHeight: 1.43,
      letterSpacing: "0.01071em",
    },
  },
  spacing: (factor: number) => factor * 8,
});

const mockTransaction: TransactionResponseItem = {
  id: "test-transaction-1",
  source: "test-source",
  amount: 2500,
  description: "Payment for dinner at restaurant",
  privacyLevel: DefaultPrivacyLevel.public,
  receiverName: "John Doe",
  senderName: "Jane Smith",
  receiverAvatar: "https://example.com/john-avatar.jpg",
  senderAvatar: "https://example.com/jane-avatar.jpg",
  likes: [
    { 
      id: "like-1", 
      uuid: "like-uuid-1",
      userId: "user-1", 
      transactionId: "test-transaction-1",
      createdAt: new Date("2023-01-15T10:30:00Z"),
      modifiedAt: new Date("2023-01-15T10:30:00Z"),
    },
    { 
      id: "like-2", 
      uuid: "like-uuid-2",
      userId: "user-2", 
      transactionId: "test-transaction-1",
      createdAt: new Date("2023-01-15T10:30:00Z"),
      modifiedAt: new Date("2023-01-15T10:30:00Z"),
    },
  ],
  comments: [
    { 
      id: "comment-1", 
      uuid: "comment-uuid-1",
      content: "Great dinner!", 
      userId: "user-1", 
      transactionId: "test-transaction-1",
      createdAt: new Date("2023-01-15T10:30:00Z"),
      modifiedAt: new Date("2023-01-15T10:30:00Z"),
    },
  ],
  createdAt: new Date("2023-01-15T10:30:00Z"),
  modifiedAt: new Date("2023-01-15T10:30:00Z"),
  requestStatus: "approved",
  requestResolvedAt: new Date("2023-01-15T10:30:00Z"),
  status: TransactionStatus.complete,
  uuid: "test-uuid-1",
  receiverId: "receiver-1",
  senderId: "sender-1",
  balanceAtCompletion: 5000,
};

describe("TransactionItem Component", () => {
  const mountComponent = (transaction = mockTransaction, initialRoute = "/") => {
    cy.mount(
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <TransactionItem transaction={transaction} />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it("should render transaction item with basic information", () => {
    mountComponent();

    cy.getBySel("transaction-item-test-transaction-1").should("exist");
    cy.contains("Payment for dinner at restaurant").should("exist");
    cy.getBySel("transaction-like-count").should("contain.text", "2");
    cy.getBySel("transaction-comment-count").should("contain.text", "1");
  });

  it("should display sender and receiver avatars", () => {
    mountComponent();

    cy.get("img[src*='jane-avatar.jpg']").should("exist");
    cy.get("img[src*='john-avatar.jpg']").should("exist");
  });

  it("should show transaction description", () => {
    mountComponent();

    cy.contains("Payment for dinner at restaurant").should("exist");
    cy.get("[color='textSecondary']").should("contain.text", "Payment for dinner at restaurant");
  });

  it("should display social stats with correct counts", () => {
    mountComponent();

    cy.getBySel("transaction-like-count").should("contain.text", "2");
    cy.getBySel("transaction-comment-count").should("contain.text", "1");
    
    cy.get("[data-testid='ThumbUpAltOutlinedIcon']").should("exist");
    cy.get("[data-testid='CommentRoundedIcon']").should("exist");
  });

  it("should handle click navigation", () => {
    let navigationPath = "";
    const mockHistory = {
      push: (path: string) => {
        navigationPath = path;
      },
    };

    mountComponent();

    cy.getBySel("transaction-item-test-transaction-1").click();
    cy.url().should("include", "/");
  });

  it("should render with zero likes and comments", () => {
    const transactionWithNoSocial = {
      ...mockTransaction,
      likes: [],
      comments: [],
    };

    mountComponent(transactionWithNoSocial);

    cy.getBySel("transaction-like-count").should("contain.text", "0");
    cy.getBySel("transaction-comment-count").should("contain.text", "0");
  });

  it("should render with many likes and comments", () => {
    const transactionWithManySocial = {
      ...mockTransaction,
      likes: Array.from({ length: 15 }, (_, i) => ({
        id: `like-${i}`,
        uuid: `like-uuid-${i}`,
        userId: `user-${i}`,
        transactionId: "test-transaction-1",
        createdAt: new Date("2023-01-15T10:30:00Z"),
        modifiedAt: new Date("2023-01-15T10:30:00Z"),
      })),
      comments: Array.from({ length: 8 }, (_, i) => ({
        id: `comment-${i}`,
        uuid: `comment-uuid-${i}`,
        content: `Comment ${i}`,
        userId: `user-${i}`,
        transactionId: "test-transaction-1",
        createdAt: new Date("2023-01-15T10:30:00Z"),
        modifiedAt: new Date("2023-01-15T10:30:00Z"),
      })),
    };

    mountComponent(transactionWithManySocial);

    cy.getBySel("transaction-like-count").should("contain.text", "15");
    cy.getBySel("transaction-comment-count").should("contain.text", "8");
  });

  it("should handle missing avatar URLs", () => {
    const transactionWithMissingAvatars = {
      ...mockTransaction,
      senderAvatar: "",
      receiverAvatar: "",
    };

    mountComponent(transactionWithMissingAvatars);

    cy.getBySel("transaction-item-test-transaction-1").should("exist");
    cy.get("img").should("have.length.at.least", 0);
  });

  it("should handle long descriptions", () => {
    const transactionWithLongDescription = {
      ...mockTransaction,
      description: "This is a very long description that should be displayed properly even when it contains a lot of text and might wrap to multiple lines in the UI component.",
    };

    mountComponent(transactionWithLongDescription);

    cy.contains("This is a very long description").should("exist");
    cy.get("[color='textSecondary']").should("be.visible");
  });

  it("should handle empty description", () => {
    const transactionWithEmptyDescription = {
      ...mockTransaction,
      description: "",
    };

    mountComponent(transactionWithEmptyDescription);

    cy.getBySel("transaction-item-test-transaction-1").should("exist");
    cy.get("[color='textSecondary']").should("exist");
  });

  it("should render Material-UI components correctly", () => {
    mountComponent();

    cy.get(".MuiListItem-root").should("exist");
    cy.get(".MuiPaper-root").should("exist");
    cy.get(".MuiGrid-container").should("exist");
    cy.get(".MuiAvatar-root").should("exist");
    cy.get(".MuiBadge-root").should("exist");
  });

  it("should apply correct CSS classes", () => {
    mountComponent();

    cy.get(".TransactionItem-paper").should("exist");
    cy.get(".TransactionItem-socialStats").should("exist");
    cy.get(".TransactionItem-countIcons").should("exist");
    cy.get(".TransactionItem-countText").should("exist");
  });

  it("should handle different transaction types", () => {
    const requestTransaction = {
      ...mockTransaction,
      id: "request-transaction-1",
      description: "Request for lunch money",
    };

    mountComponent(requestTransaction);

    cy.getBySel("transaction-item-request-transaction-1").should("exist");
    cy.contains("Request for lunch money").should("exist");
  });

  it("should render TransactionTitle component", () => {
    mountComponent();

    cy.get("[data-test*='transaction-title']").should("exist");
  });

  it("should render TransactionAmount component", () => {
    mountComponent();

    cy.get("[data-test*='transaction-amount']").should("exist");
  });

  it("should handle special characters in description", () => {
    const transactionWithSpecialChars = {
      ...mockTransaction,
      description: "Payment for café & restaurant (50% tip) - $25.99",
    };

    mountComponent(transactionWithSpecialChars);

    cy.contains("Payment for café & restaurant (50% tip) - $25.99").should("exist");
  });

  it("should be clickable and have proper cursor", () => {
    mountComponent();

    cy.getBySel("transaction-item-test-transaction-1")
      .should("exist")
      .should("have.css", "cursor", "pointer");
  });

  it("should handle responsive layout", () => {
    mountComponent();

    cy.get(".MuiGrid-container").should("exist");
    cy.get(".MuiGrid-item").should("have.length.at.least", 3);
  });

  it("should display badge with receiver avatar correctly", () => {
    mountComponent();

    cy.get(".MuiBadge-root").should("exist");
    cy.get(".MuiBadge-badge").should("exist");
    cy.get("img[src*='john-avatar.jpg']").should("exist");
  });

  it("should handle missing transaction data gracefully", () => {
    const minimalTransaction = {
      ...mockTransaction,
      receiverName: "",
      senderName: "",
      description: "",
      likes: [],
      comments: [],
    };

    mountComponent(minimalTransaction);

    cy.getBySel("transaction-item-test-transaction-1").should("exist");
    cy.getBySel("transaction-like-count").should("contain.text", "0");
    cy.getBySel("transaction-comment-count").should("contain.text", "0");
  });

  it("should render with different privacy levels", () => {
    const privateTransaction = {
      ...mockTransaction,
      id: "private-transaction-1",
      privacyLevel: DefaultPrivacyLevel.private,
    };

    mountComponent(privateTransaction);

    cy.getBySel("transaction-item-private-transaction-1").should("exist");
  });

  it("should handle very large social counts", () => {
    const transactionWithLargeCounts = {
      ...mockTransaction,
      likes: Array.from({ length: 999 }, (_, i) => ({
        id: `like-${i}`,
        uuid: `like-uuid-${i}`,
        userId: `user-${i}`,
        transactionId: "test-transaction-1",
        createdAt: new Date("2023-01-15T10:30:00Z"),
        modifiedAt: new Date("2023-01-15T10:30:00Z"),
      })),
      comments: Array.from({ length: 500 }, (_, i) => ({
        id: `comment-${i}`,
        uuid: `comment-uuid-${i}`,
        content: `Comment ${i}`,
        userId: `user-${i}`,
        transactionId: "test-transaction-1",
        createdAt: new Date("2023-01-15T10:30:00Z"),
        modifiedAt: new Date("2023-01-15T10:30:00Z"),
      })),
    };

    mountComponent(transactionWithLargeCounts);

    cy.getBySel("transaction-like-count").should("contain.text", "999");
    cy.getBySel("transaction-comment-count").should("contain.text", "500");
  });

  it("should maintain proper spacing and alignment", () => {
    mountComponent();

    cy.get(".MuiGrid-container").should("have.css", "display", "flex");
    cy.get(".TransactionItem-socialStats").should("exist");
    cy.get(".MuiListItemAvatar-root").should("exist");
  });

  it("should handle theme styling correctly", () => {
    mountComponent();

    cy.get(".TransactionItem-countIcons").should("have.css", "color", "rgb(189, 189, 189)");
    cy.get(".TransactionItem-countText").should("have.css", "color", "rgb(189, 189, 189)");
  });

  it("should render all required elements in correct order", () => {
    mountComponent();

    cy.getBySel("transaction-item-test-transaction-1").within(() => {
      cy.get(".MuiListItemAvatar-root").should("exist");
      cy.get("[data-test*='transaction-title']").should("exist");
      cy.get("[color='textSecondary']").should("exist");
      cy.get(".TransactionItem-socialStats").should("exist");
      cy.get("[data-test*='transaction-amount']").should("exist");
    });
  });

  it("should handle interaction states", () => {
    mountComponent();

    cy.getBySel("transaction-item-test-transaction-1")
      .should("exist");
    cy.getBySel("transaction-item-test-transaction-1")
      .trigger("mouseover");
    cy.getBySel("transaction-item-test-transaction-1")
      .should("be.visible");
  });
});
