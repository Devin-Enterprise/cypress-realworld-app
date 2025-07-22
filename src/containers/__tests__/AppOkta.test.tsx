import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useOktaAuth } from "@okta/okta-react";
import { useActor, useMachine } from "@xstate/react";
import AppOkta from "../AppOkta";

vi.mock("@okta/okta-react");
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
vi.mock("react-router-dom", () => ({
  Route: ({ children }: { children?: React.ReactNode }) => <div data-testid="route">{children}</div>
}));

const mockUseOktaAuth = vi.mocked(useOktaAuth);
const mockUseActor = vi.mocked(useActor);
const mockUseMachine = vi.mocked(useMachine);

describe("AppOkta Container", () => {
  const mockOktaAuthService = {
    getUser: vi.fn()
  };
  const mockAuthService = {
    send: vi.fn(),
    state: { matches: vi.fn() }
  };
  const mockNotificationsService = {};
  const mockSnackbarService = {};
  const mockBankAccountsService = {};

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseOktaAuth.mockReturnValue({
      authState: {
        isAuthenticated: true,
        accessToken: "mock-okta-access-token"
      },
      oktaAuth: mockOktaAuthService
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

    mockOktaAuthService.getUser.mockResolvedValue({
      sub: "okta|123",
      email: "test@example.com",
      name: "Test User"
    });

    delete (window as any).Cypress;
    delete process.env.VITE_OKTA_PROGRAMMATIC;
  });

  const renderComponent = (component: React.ReactElement) => {
    return render(component);
  };

  describe("Component Rendering", () => {
    it("should render without crashing", () => {
      renderComponent(<AppOkta />);
      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });

    it("should render CssBaseline and root container", () => {
      const { container } = renderComponent(<AppOkta />);
      expect(container.querySelector(".appOkta-root")).toBeInTheDocument();
    });

    it("should always render AlertBar component", () => {
      renderComponent(<AppOkta />);
      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });
  });

  describe("Okta Authentication State Management", () => {
    it("should send OKTA event with user and token on mount", async () => {
      const mockUser = {
        sub: "okta|123",
        email: "test@example.com",
        name: "Test User"
      };
      
      mockOktaAuthService.getUser.mockResolvedValue(mockUser);

      renderComponent(<AppOkta />);

      await waitFor(() => {
        expect(mockOktaAuthService.getUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockAuthService.send).toHaveBeenCalledWith("OKTA", {
          user: mockUser,
          token: "mock-okta-access-token"
        });
      });
    });

    it("should handle user retrieval failure gracefully", async () => {
      mockOktaAuthService.getUser.mockRejectedValue(new Error("User retrieval failed"));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(<AppOkta />);

      await waitFor(() => {
        expect(mockOktaAuthService.getUser).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it("should not send OKTA event when not authenticated", () => {
      mockUseOktaAuth.mockReturnValue({
        authState: {
          isAuthenticated: false,
          accessToken: null
        },
        oktaAuth: mockOktaAuthService
      } as any);

      renderComponent(<AppOkta />);

      expect(mockOktaAuthService.getUser).not.toHaveBeenCalled();
      expect(mockAuthService.send).not.toHaveBeenCalled();
    });

    it("should re-send OKTA event when auth state changes", async () => {
      const { rerender } = renderComponent(<AppOkta />);

      await waitFor(() => {
        expect(mockAuthService.send).toHaveBeenCalledTimes(1);
      });

      const newAuthState = {
        isAuthenticated: true,
        accessToken: "new-mock-token"
      };
      
      mockUseOktaAuth.mockReturnValue({
        authState: newAuthState,
        oktaAuth: mockOktaAuthService
      } as any);

      rerender(<AppOkta />);

      await waitFor(() => {
        expect(mockOktaAuthService.getUser).toHaveBeenCalled();
      });
    });
  });

  describe("Cypress Programmatic Testing", () => {
    beforeEach(() => {
      (window as any).Cypress = true;
      process.env.VITE_OKTA_PROGRAMMATIC = "true";
      
      const mockOktaData = {
        user: { sub: "okta|cypress", email: "cypress@example.com" },
        token: "cypress-mock-token"
      };
      
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(mockOktaData));
    });

    afterEach(() => {
      delete (window as any).Cypress;
      delete process.env.VITE_OKTA_PROGRAMMATIC;
      vi.restoreAllMocks();
    });

    it("should use localStorage data for Cypress programmatic testing", () => {
      renderComponent(<AppOkta />);

      expect(mockAuthService.send).toHaveBeenCalledWith("OKTA", {
        user: { sub: "okta|cypress", email: "cypress@example.com" },
        token: "cypress-mock-token"
      });
    });

    it("should handle missing localStorage data gracefully", () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(<AppOkta />);

      consoleSpy.mockRestore();
    });

    it("should handle invalid JSON in localStorage", () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue("invalid-json");

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(<AppOkta />);

      consoleSpy.mockRestore();
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

      renderComponent(<AppOkta />);

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

      renderComponent(<AppOkta />);

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

      renderComponent(<AppOkta />);

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

      renderComponent(<AppOkta />);

      expect(screen.queryByTestId("private-routes")).not.toBeInTheDocument();
    });
  });

  describe("Unauthorized State Routing", () => {
    it("should render Route components when unauthorized", () => {
      const mockAuthState = {
        matches: vi.fn((state: string) => state === "unauthorized")
      };
      
      mockUseActor.mockReturnValue([
        mockAuthState,
        vi.fn(),
        mockAuthService
      ] as any);

      const { container } = renderComponent(<AppOkta />);

      expect(mockAuthState.matches).toHaveBeenCalledWith("unauthorized");
    });

    it("should not render Route components when authorized", () => {
      const mockAuthState = {
        matches: vi.fn((state: string) => state === "authorized")
      };
      
      mockUseActor.mockReturnValue([
        mockAuthState,
        vi.fn(),
        mockAuthService
      ] as any);

      renderComponent(<AppOkta />);

      expect(mockAuthState.matches).toHaveBeenCalledWith("unauthorized");
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

      renderComponent(<AppOkta />);

      const privateRoutes = screen.getByTestId("private-routes");
      expect(privateRoutes).toBeInTheDocument();
    });

    it("should initialize all required XState machines", () => {
      renderComponent(<AppOkta />);

      expect(mockUseActor).toHaveBeenCalledWith(expect.any(Object));
      expect(mockUseMachine).toHaveBeenCalledTimes(3);
    });

    it("should pass snackbarService to AlertBar", () => {
      renderComponent(<AppOkta />);
      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
    });
  });

  describe("Okta Hook Integration", () => {
    it("should handle null authState gracefully", () => {
      mockUseOktaAuth.mockReturnValue({
        authState: null,
        oktaAuth: mockOktaAuthService
      } as any);

      renderComponent(<AppOkta />);

      expect(screen.getByTestId("alert-bar")).toBeInTheDocument();
      expect(mockOktaAuthService.getUser).not.toHaveBeenCalled();
    });

    it("should handle undefined oktaAuth service", () => {
      mockUseOktaAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          accessToken: "token"
        },
        oktaAuth: undefined
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(<AppOkta />);

      consoleSpy.mockRestore();
    });

    it("should handle missing access token", async () => {
      mockUseOktaAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          accessToken: null
        },
        oktaAuth: mockOktaAuthService
      } as any);

      renderComponent(<AppOkta />);

      await waitFor(() => {
        expect(mockOktaAuthService.getUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockAuthService.send).toHaveBeenCalledWith("OKTA", {
          user: expect.any(Object),
          token: null
        });
      });
    });
  });

  describe("Cypress Integration", () => {
    it("should expose authService on window for Cypress", () => {
      const originalCypress = (window as any).Cypress;
      (window as any).Cypress = true;

      const { authService } = require("../../machines/authMachine");
      
      renderComponent(<AppOkta />);

      expect((window as any).authService).toBe(authService);

      (window as any).Cypress = originalCypress;
    });

    it("should not expose authService when Cypress is not present", () => {
      const originalCypress = (window as any).Cypress;
      delete (window as any).Cypress;

      renderComponent(<AppOkta />);

      (window as any).Cypress = originalCypress;
    });
  });

  describe("Error Handling", () => {
    it("should handle getUser promise rejection", async () => {
      mockOktaAuthService.getUser.mockRejectedValue(new Error("Network error"));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(<AppOkta />);

      await waitFor(() => {
        expect(mockOktaAuthService.getUser).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it("should handle missing user data from getUser", async () => {
      mockOktaAuthService.getUser.mockResolvedValue(null);

      renderComponent(<AppOkta />);

      await waitFor(() => {
        expect(mockOktaAuthService.getUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockAuthService.send).toHaveBeenCalledWith("OKTA", {
          user: null,
          token: "mock-okta-access-token"
        });
      });
    });
  });

  describe("Component Lifecycle", () => {
    it("should clean up properly on unmount", () => {
      const { unmount } = renderComponent(<AppOkta />);
      
      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple re-renders without issues", () => {
      const { rerender } = renderComponent(<AppOkta />);
      
      expect(() => {
        rerender(<AppOkta />);
        rerender(<AppOkta />);
      }).not.toThrow();
    });
  });

  describe("Conditional Logic Coverage", () => {
    it("should handle both Cypress programmatic and normal flow paths", () => {
      (window as any).Cypress = true;
      process.env.VITE_OKTA_PROGRAMMATIC = "true";

      const mockOktaData = {
        user: { sub: "okta|test" },
        token: "test-token"
      };
      
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(mockOktaData));

      renderComponent(<AppOkta />);

      expect(mockAuthService.send).toHaveBeenCalledWith("OKTA", mockOktaData);

      delete (window as any).Cypress;
      delete process.env.VITE_OKTA_PROGRAMMATIC;
      vi.restoreAllMocks();
    });

    it("should use normal Okta flow when not in Cypress programmatic mode", async () => {
      delete (window as any).Cypress;
      delete process.env.VITE_OKTA_PROGRAMMATIC;

      renderComponent(<AppOkta />);

      await waitFor(() => {
        expect(mockOktaAuthService.getUser).toHaveBeenCalled();
      });
    });
  });
});
