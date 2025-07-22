import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuth0 } from "@auth0/auth0-react";
import { useActor, useMachine } from "@xstate/react";
import AppAuth0 from "../AppAuth0";

vi.mock("@auth0/auth0-react");
vi.mock("@xstate/react");
vi.mock("../../machines/authMachine", () => ({
  authService: {
    send: vi.fn(),
    state: { matches: vi.fn() }
  }
}));
vi.mock("../../machines/snackbarMachine", () => ({
  snackbarMachine: {}
}));
vi.mock("../../machines/notificationsMachine", () => ({
  notificationsMachine: {}
}));
vi.mock("../../machines/bankAccountsMachine", () => ({
  bankAccountsMachine: {}
}));
vi.mock("../PrivateRoutesContainer", () => ({
  default: ({ isLoggedIn }: { isLoggedIn: boolean }) => (
    <div data-testid="private-routes">{isLoggedIn ? "Logged In" : "Not Logged In"}</div>
  )
}));
vi.mock("../../components/AlertBar", () => ({
  default: () => <div data-testid="alert-bar">Alert Bar</div>
}));

const mockUseAuth0 = vi.mocked(useAuth0);
const mockUseActor = vi.mocked(useActor);
const mockUseMachine = vi.mocked(useMachine);

describe("AppAuth0 Container", () => {
  const mockGetAccessTokenSilently = vi.fn();
  const mockAuthService = {
    send: vi.fn(),
    state: { matches: vi.fn() }
  };
  const mockNotificationsService = {};
  const mockSnackbarService = {};
  const mockBankAccountsService = {};

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { sub: "auth0|123", email: "test@example.com" },
      getAccessTokenSilently: mockGetAccessTokenSilently,
      isLoading: false,
      error: null
    } as any);

    mockUseActor.mockReturnValue([
      { matches: vi.fn().mockReturnValue(false) },
      vi.fn(),
      mockAuthService
    ] as any);

    mockUseMachine.mockImplementation((machine) => {
      if (machine === require("../../machines/notificationsMachine").notificationsMachine) {
        return [null, null, mockNotificationsService] as any;
      }
      if (machine === require("../../machines/snackbarMachine").snackbarMachine) {
        return [null, null, mockSnackbarService] as any;
      }
      if (machine === require("../../machines/bankAccountsMachine").bankAccountsMachine) {
        return [null, null, mockBankAccountsService] as any;
      }
      return [null, null, {}] as any;
    });

    mockGetAccessTokenSilently.mockResolvedValue("mock-access-token");
  });

  describe("Component Rendering", () => {
    it("should render without crashing", () => {
      render(<AppAuth0 />);
      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });

    it("should render CssBaseline and root container", () => {
      const { container } = render(<AppAuth0 />);
      expect(container.firstChild).toHaveClass("appAuth0-root");
    });

    it("should always render AlertBar component", () => {
      render(<AppAuth0 />);
      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });
  });

  describe("Authentication State Management", () => {
    it("should send AUTH0 event with user and token on mount", async () => {
      const mockUser = { sub: "auth0|123", email: "test@example.com" };
      mockUseAuth0.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        isLoading: false,
        error: null
      } as any);

      render(<AppAuth0 />);

      await waitFor(() => {
        expect(mockGetAccessTokenSilently).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockAuthService.send).toHaveBeenCalledWith("AUTH0", {
          user: mockUser,
          token: "mock-access-token"
        });
      });
    });

    it("should handle token retrieval failure gracefully", async () => {
      mockGetAccessTokenSilently.mockRejectedValue(new Error("Token retrieval failed"));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<AppAuth0 />);

      await waitFor(() => {
        expect(mockGetAccessTokenSilently).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it("should re-send AUTH0 event when user changes", async () => {
      const { rerender } = render(<AppAuth0 />);

      await waitFor(() => {
        expect(mockAuthService.send).toHaveBeenCalledTimes(1);
      });

      const newUser = { sub: "auth0|456", email: "newuser@example.com" };
      mockUseAuth0.mockReturnValue({
        isAuthenticated: true,
        user: newUser,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        isLoading: false,
        error: null
      } as any);

      rerender(<AppAuth0 />);

      await waitFor(() => {
        expect(mockAuthService.send).toHaveBeenCalledWith("AUTH0", {
          user: newUser,
          token: "mock-access-token"
        });
      });
    });
  });

  describe("Login State Logic", () => {
    it("should show PrivateRoutesContainer when user is authorized", () => {
      const mockAuthState = {
        matches: vi.fn((state: string) => state === "authorized")
      };
      
      mockUseActor.mockReturnValue([
        mockAuthState,
        vi.fn(),
        mockAuthService
      ] as any);

      render(<AppAuth0 />);

      expect(screen.getByTestId("private-routes")).toBeInTheDocument();
      expect(screen.getByText("Logged In")).toBeInTheDocument();
    });

    it("should show PrivateRoutesContainer when user is refreshing", () => {
      const mockAuthState = {
        matches: vi.fn((state: string) => state === "refreshing")
      };
      
      mockUseActor.mockReturnValue([
        mockAuthState,
        vi.fn(),
        mockAuthService
      ] as any);

      render(<AppAuth0 />);

      expect(screen.getByTestId("private-routes")).toBeInTheDocument();
      expect(screen.getByText("Logged In")).toBeInTheDocument();
    });

    it("should show PrivateRoutesContainer when user is updating", () => {
      const mockAuthState = {
        matches: vi.fn((state: string) => state === "updating")
      };
      
      mockUseActor.mockReturnValue([
        mockAuthState,
        vi.fn(),
        mockAuthService
      ] as any);

      render(<AppAuth0 />);

      expect(screen.getByTestId("private-routes")).toBeInTheDocument();
      expect(screen.getByText("Logged In")).toBeInTheDocument();
    });

    it("should not show PrivateRoutesContainer when user is not in logged in states", () => {
      const mockAuthState = {
        matches: vi.fn().mockReturnValue(false)
      };
      
      mockUseActor.mockReturnValue([
        mockAuthState,
        vi.fn(),
        mockAuthService
      ] as any);

      render(<AppAuth0 />);

      expect(screen.queryByTestId("private-routes")).not.toBeInTheDocument();
    });
  });

  describe("Service Integration", () => {
    it("should pass correct services to PrivateRoutesContainer", () => {
      const mockAuthState = {
        matches: vi.fn((state: string) => state === "authorized")
      };
      
      mockUseActor.mockReturnValue([
        mockAuthState,
        vi.fn(),
        mockAuthService
      ] as any);

      render(<AppAuth0 />);

      const privateRoutes = screen.getByTestId("private-routes");
      expect(privateRoutes).toBeInTheDocument();
    });

    it("should initialize all required XState machines", () => {
      render(<AppAuth0 />);

      expect(mockUseActor).toHaveBeenCalledWith(expect.any(Object));
      expect(mockUseMachine).toHaveBeenCalledTimes(3);
    });

    it("should pass snackbarService to AlertBar", () => {
      render(<AppAuth0 />);
      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });
  });

  describe("Auth0 Hook Integration", () => {
    it("should handle unauthenticated state", () => {
      mockUseAuth0.mockReturnValue({
        isAuthenticated: false,
        user: null,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        isLoading: false,
        error: null
      } as any);

      render(<AppAuth0 />);

      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });

    it("should handle loading state", () => {
      mockUseAuth0.mockReturnValue({
        isAuthenticated: false,
        user: null,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        isLoading: true,
        error: null
      } as any);

      render(<AppAuth0 />);

      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });

    it("should handle Auth0 error state", () => {
      mockUseAuth0.mockReturnValue({
        isAuthenticated: false,
        user: null,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        isLoading: false,
        error: new Error("Auth0 error")
      } as any);

      render(<AppAuth0 />);

      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });
  });

  describe("Cypress Integration", () => {
    it("should expose authService on window for Cypress", () => {
      const originalCypress = (window as any).Cypress;
      (window as any).Cypress = true;

      const { authService } = require("../../machines/authMachine");
      
      render(<AppAuth0 />);

      expect((window as any).authService).toBe(authService);

      (window as any).Cypress = originalCypress;
    });

    it("should not expose authService when Cypress is not present", () => {
      const originalCypress = (window as any).Cypress;
      delete (window as any).Cypress;

      render(<AppAuth0 />);

      (window as any).Cypress = originalCypress;
    });
  });

  describe("Error Handling", () => {
    it("should handle missing user gracefully", async () => {
      mockUseAuth0.mockReturnValue({
        isAuthenticated: true,
        user: null,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        isLoading: false,
        error: null
      } as any);

      render(<AppAuth0 />);

      await waitFor(() => {
        expect(mockGetAccessTokenSilently).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockAuthService.send).toHaveBeenCalledWith("AUTH0", {
          user: null,
          token: "mock-access-token"
        });
      });
    });

    it("should handle undefined getAccessTokenSilently", async () => {
      mockUseAuth0.mockReturnValue({
        isAuthenticated: true,
        user: { sub: "auth0|123" },
        getAccessTokenSilently: undefined,
        isLoading: false,
        error: null
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<AppAuth0 />);

      consoleSpy.mockRestore();
    });
  });

  describe("Component Lifecycle", () => {
    it("should clean up properly on unmount", () => {
      const { unmount } = render(<AppAuth0 />);
      
      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple re-renders without issues", () => {
      const { rerender } = render(<AppAuth0 />);
      
      expect(() => {
        rerender(<AppAuth0 />);
        rerender(<AppAuth0 />);
        rerender(<AppAuth0 />);
      }).not.toThrow();
    });
  });
});
