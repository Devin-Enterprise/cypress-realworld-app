import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";

vi.mock("react-dom/client");
vi.mock("@okta/okta-auth-js");
vi.mock("@okta/okta-react");
vi.mock("react-router-dom", () => ({
  Router: ({ children }: { children?: React.ReactNode }) => <div data-testid="router">{children}</div>,
  withRouter: (Component: any) => Component
}));
vi.mock("../containers/AppOkta", () => ({
  default: () => <div data-testid="app-okta">AppOkta</div>
}));
vi.mock("../utils/historyUtils", () => ({
  history: {
    replace: vi.fn()
  }
}));

const mockCreateRoot = vi.mocked(createRoot);
const mockRender = vi.fn();

describe("Okta Index Configuration", () => {
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
    it("should render Okta Security provider when VITE_OKTA is configured", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth } = await import("@okta/okta-auth-js");
      vi.mocked(OktaAuth).mockImplementation(() => ({
        issuer: `https://test-domain.okta.com/oauth2/default`,
        clientId: "test-client-id",
        redirectUri: `${window.location.origin}/implicit/callback`
      }) as any);

      await import("../index.okta");

      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it("should configure OktaAuth with correct parameters", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth } = await import("@okta/okta-auth-js");
      const mockOktaAuth = vi.mocked(OktaAuth);

      await import("../index.okta");

      expect(mockOktaAuth).toHaveBeenCalledWith({
        issuer: "https://test-domain.okta.com/oauth2/default",
        clientId: "test-client-id",
        redirectUri: `${window.location.origin}/implicit/callback`
      });
    });

    it("should log error when VITE_OKTA is not configured", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: undefined
      };

      await import("../index.okta");

      expect(console.error).toHaveBeenCalledWith("Okta is not configured.");
      expect(mockRender).not.toHaveBeenCalled();
    });

    it("should handle missing Okta environment variables", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: undefined,
        VITE_OKTA_CLIENTID: undefined
      };

      const { OktaAuth } = await import("@okta/okta-auth-js");
      vi.mocked(OktaAuth).mockImplementation(() => ({}) as any);

      await import("../index.okta");

      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
      expect(mockRender).toHaveBeenCalledTimes(1);
    });
  });

  describe("Theme Configuration", () => {
    it("should create theme with correct palette configuration", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth } = await import("@okta/okta-auth-js");
      vi.mocked(OktaAuth).mockImplementation(() => ({}) as any);

      await import("../index.okta");

      const renderCall = mockRender.mock.calls[0][0];
      const themeProvider = renderCall.props.children.props.children;
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
      expect(themeProvider.props.theme.palette.secondary.main).toBe("#fff");
    });
  });

  describe("Router Integration", () => {
    it("should configure withRouter HOC correctly", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth, toRelativeUrl } = await import("@okta/okta-auth-js");
      vi.mocked(OktaAuth).mockImplementation(() => ({}) as any);
      vi.mocked(toRelativeUrl).mockReturnValue("/dashboard");

      await import("../index.okta");

      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it("should handle restoreOriginalUri callback", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth, toRelativeUrl } = await import("@okta/okta-auth-js");
      vi.mocked(OktaAuth).mockImplementation(() => ({}) as any);
      vi.mocked(toRelativeUrl).mockReturnValue("/dashboard");

      const mockHistory = { replace: vi.fn() };

      await import("../index.okta");

      const renderCall = mockRender.mock.calls[0][0];
      const appWithRouter = renderCall.props.children.props.children.props.children;
      
      const AppWithRouterComponent = appWithRouter.type;
      const { restoreOriginalUri } = AppWithRouterComponent({ history: mockHistory }).props;
      
      restoreOriginalUri(null, "/original-uri");

      expect(toRelativeUrl).toHaveBeenCalledWith("/original-uri", window.location.origin);
      expect(mockHistory.replace).toHaveBeenCalledWith("/dashboard");
    });

    it("should handle restoreOriginalUri with default path", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth, toRelativeUrl } = await import("@okta/okta-auth-js");
      vi.mocked(OktaAuth).mockImplementation(() => ({}) as any);
      vi.mocked(toRelativeUrl).mockReturnValue("/");

      const mockHistory = { replace: vi.fn() };

      await import("../index.okta");

      const renderCall = mockRender.mock.calls[0][0];
      const appWithRouter = renderCall.props.children.props.children.props.children;
      
      const AppWithRouterComponent = appWithRouter.type;
      const { restoreOriginalUri } = AppWithRouterComponent({ history: mockHistory }).props;
      
      restoreOriginalUri(null, null);

      expect(toRelativeUrl).toHaveBeenCalledWith("/", window.location.origin);
      expect(mockHistory.replace).toHaveBeenCalledWith("/");
    });
  });

  describe("DOM Integration", () => {
    it("should find root element and create React root", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth } = await import("@okta/okta-auth-js");
      vi.mocked(OktaAuth).mockImplementation(() => ({}) as any);

      await import("../index.okta");

      expect(document.getElementById).toHaveBeenCalledWith("root");
      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
    });

    it("should render complete component tree structure", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth } = await import("@okta/okta-auth-js");
      vi.mocked(OktaAuth).mockImplementation(() => ({}) as any);

      await import("../index.okta");

      const renderCall = mockRender.mock.calls[0][0];
      
      expect(renderCall.type.displayName).toBe("Router");
      
      const styledEngineProvider = renderCall.props.children;
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
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      expect(async () => {
        await import("../index.okta");
      }).not.toThrow();
    });

    it("should not render when Okta configuration is missing", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: ""
      };

      await import("../index.okta");

      expect(mockRender).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("Okta is not configured.");
    });
  });

  describe("Security Provider Configuration", () => {
    it("should configure Security component with oktaAuth and restoreOriginalUri", async () => {
      process.env = {
        ...originalEnv,
        VITE_OKTA: "true",
        VITE_OKTA_DOMAIN: "test-domain.okta.com",
        VITE_OKTA_CLIENTID: "test-client-id"
      };

      const { OktaAuth } = await import("@okta/okta-auth-js");
      const mockOktaAuthInstance = {};
      vi.mocked(OktaAuth).mockImplementation(() => mockOktaAuthInstance as any);

      await import("../index.okta");

      const renderCall = mockRender.mock.calls[0][0];
      const appWithRouter = renderCall.props.children.props.children.props.children;
      
      const AppWithRouterComponent = appWithRouter.type;
      const securityProps = AppWithRouterComponent({ history: { replace: vi.fn() } }).props;
      
      expect(securityProps.oktaAuth).toBe(mockOktaAuthInstance);
      expect(typeof securityProps.restoreOriginalUri).toBe("function");
    });
  });
});
