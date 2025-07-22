import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";

vi.mock("react-dom/client");
vi.mock("@auth0/auth0-react");
vi.mock("../containers/AppAuth0", () => ({
  default: () => <div data-testid="app-auth0">AppAuth0</div>
}));
vi.mock("../utils/historyUtils", () => ({
  history: {
    replace: vi.fn()
  }
}));

const mockCreateRoot = vi.mocked(createRoot);
const mockRender = vi.fn();

describe("Auth0 Index Configuration", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockRootElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = process.env;
    
    mockRootElement = document.createElement("div");
    mockRootElement.id = "root";
    document.body.appendChild(mockRootElement);
    
    vi.spyOn(document, "getElementById").mockReturnValue(mockRootElement);
    mockCreateRoot.mockReturnValue({ render: mockRender } as any);
    
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    document.body.removeChild(mockRootElement);
    vi.restoreAllMocks();
  });

  describe("Environment Configuration", () => {
    it("should render Auth0Provider when VITE_AUTH0 is configured", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: "test-domain.auth0.com",
        VITE_AUTH0_CLIENTID: "test-client-id",
        VITE_AUTH0_AUDIENCE: "test-audience",
        VITE_AUTH0_SCOPE: "openid profile email"
      };

      await import("../index.auth0");

      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
      expect(mockRender).toHaveBeenCalledTimes(1);
      
      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall.type.displayName).toBe("Auth0Provider");
    });

    it("should configure Auth0Provider with correct props", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: "test-domain.auth0.com",
        VITE_AUTH0_CLIENTID: "test-client-id",
        VITE_AUTH0_AUDIENCE: "test-audience",
        VITE_AUTH0_SCOPE: "openid profile email"
      };

      await import("../index.auth0");

      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall.props.domain).toBe("test-domain.auth0.com");
      expect(renderCall.props.clientId).toBe("test-client-id");
      expect(renderCall.props.audience).toBe("test-audience");
      expect(renderCall.props.scope).toBe("openid profile email");
      expect(renderCall.props.redirectUri).toBe(window.location.origin);
      expect(renderCall.props.cacheLocation).toBe("localstorage");
    });

    it("should log error when VITE_AUTH0 is not configured", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: undefined
      };

      await import("../index.auth0");

      expect(console.error).toHaveBeenCalledWith("Auth0 is not configured.");
      expect(mockRender).not.toHaveBeenCalled();
    });

    it("should handle missing Auth0 environment variables", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: undefined,
        VITE_AUTH0_CLIENTID: undefined
      };

      await import("../index.auth0");

      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
      expect(mockRender).toHaveBeenCalledTimes(1);
    });
  });

  describe("Theme Configuration", () => {
    it("should create theme with correct palette configuration", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: "test-domain.auth0.com",
        VITE_AUTH0_CLIENTID: "test-client-id"
      };

      await import("../index.auth0");

      const renderCall = mockRender.mock.calls[0][0];
      const themeProvider = renderCall.props.children.props.children.props.children;
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
      expect(themeProvider.props.theme.palette.secondary.main).toBe("#fff");
    });
  });

  describe("Redirect Callback", () => {
    it("should handle onRedirectCallback with appState", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: "test-domain.auth0.com",
        VITE_AUTH0_CLIENTID: "test-client-id"
      };

      const { history } = await import("../utils/historyUtils");

      await import("../index.auth0");

      const renderCall = mockRender.mock.calls[0][0];
      const onRedirectCallback = renderCall.props.onRedirectCallback;
      
      const mockAppState = { returnTo: "/dashboard" };
      onRedirectCallback(mockAppState);

      expect(history.replace).toHaveBeenCalledWith("/dashboard");
    });

    it("should handle onRedirectCallback without appState", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: "test-domain.auth0.com",
        VITE_AUTH0_CLIENTID: "test-client-id"
      };

      const { history } = await import("../utils/historyUtils");

      await import("../index.auth0");

      const renderCall = mockRender.mock.calls[0][0];
      const onRedirectCallback = renderCall.props.onRedirectCallback;
      
      onRedirectCallback(null);

      expect(history.replace).toHaveBeenCalledWith(window.location.pathname);
    });
  });

  describe("DOM Integration", () => {
    it("should find root element and create React root", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: "test-domain.auth0.com",
        VITE_AUTH0_CLIENTID: "test-client-id"
      };

      await import("../index.auth0");

      expect(document.getElementById).toHaveBeenCalledWith("root");
      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
    });

    it("should render complete component tree structure", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: "test-domain.auth0.com",
        VITE_AUTH0_CLIENTID: "test-client-id"
      };

      await import("../index.auth0");

      const renderCall = mockRender.mock.calls[0][0];
      
      expect(renderCall.type.displayName).toBe("Auth0Provider");
      
      const router = renderCall.props.children;
      expect(router.type.displayName).toBe("Router");
      
      const styledEngineProvider = router.props.children;
      expect(styledEngineProvider.type.displayName).toBe("StyledEngineProvider");
      
      const themeProvider = styledEngineProvider.props.children;
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing root element gracefully", async () => {
      vi.spyOn(document, "getElementById").mockReturnValue(null);

      process.env = {
        ...originalEnv,
        VITE_AUTH0: "true",
        VITE_AUTH0_DOMAIN: "test-domain.auth0.com",
        VITE_AUTH0_CLIENTID: "test-client-id"
      };

      expect(async () => {
        await import("../index.auth0");
      }).not.toThrow();
    });

    it("should not render when Auth0 configuration is missing", async () => {
      process.env = {
        ...originalEnv,
        VITE_AUTH0: ""
      };

      await import("../index.auth0");

      expect(mockRender).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("Auth0 is not configured.");
    });
  });
});
