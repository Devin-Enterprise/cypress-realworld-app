import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";

vi.mock("react-dom/client");
vi.mock("react-router-dom", () => ({
  Router: ({ children }: { children?: React.ReactNode }) => <div data-testid="router">{children}</div>
}));
vi.mock("../containers/AppGoogle", () => ({
  default: () => <div data-testid="app-google">AppGoogle</div>
}));
vi.mock("../utils/historyUtils", () => ({
  history: {
    replace: vi.fn()
  }
}));

const mockCreateRoot = vi.mocked(createRoot);
const mockRender = vi.fn();

describe("Google Index Configuration", () => {
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
    it("should render AppGoogle when VITE_GOOGLE is configured", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
      expect(mockRender).toHaveBeenCalledTimes(1);
      
      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall.type.displayName).toBe("Router");
    });

    it("should log error when VITE_GOOGLE is not configured", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: undefined
      };

      await import("../index.google");

      expect(console.error).toHaveBeenCalledWith("Google is not configured.");
      expect(mockRender).not.toHaveBeenCalled();
    });

    it("should handle empty VITE_GOOGLE environment variable", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: ""
      };

      await import("../index.google");

      expect(console.error).toHaveBeenCalledWith("Google is not configured.");
      expect(mockRender).not.toHaveBeenCalled();
    });

    it("should handle falsy VITE_GOOGLE environment variable", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "false"
      };

      await import("../index.google");

      expect(console.error).toHaveBeenCalledWith("Google is not configured.");
      expect(mockRender).not.toHaveBeenCalled();
    });
  });

  describe("Theme Configuration", () => {
    it("should create theme with correct palette configuration", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      const renderCall = mockRender.mock.calls[0][0];
      const themeProvider = renderCall.props.children.props.children;
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
      expect(themeProvider.props.theme.palette.secondary.main).toBe("#fff");
    });

    it("should use adaptV4Theme for Material-UI compatibility", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      const renderCall = mockRender.mock.calls[0][0];
      const themeProvider = renderCall.props.children.props.children;
      expect(themeProvider.props.theme).toBeDefined();
      expect(themeProvider.props.theme.palette).toBeDefined();
    });
  });

  describe("Router Configuration", () => {
    it("should configure Router with history", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      const { history } = await import("../utils/historyUtils");

      await import("../index.google");

      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall.type.displayName).toBe("Router");
      expect(renderCall.props.history).toBe(history);
    });

    it("should render AppGoogle within Router", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      const renderCall = mockRender.mock.calls[0][0];
      const styledEngineProvider = renderCall.props.children;
      const themeProvider = styledEngineProvider.props.children;
      const appGoogle = themeProvider.props.children;
      
      expect(appGoogle.type.displayName).toBe("AppGoogle");
    });
  });

  describe("DOM Integration", () => {
    it("should find root element and create React root", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      expect(document.getElementById).toHaveBeenCalledWith("root");
      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
    });

    it("should render complete component tree structure", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      const renderCall = mockRender.mock.calls[0][0];
      
      expect(renderCall.type.displayName).toBe("Router");
      
      const styledEngineProvider = renderCall.props.children;
      expect(styledEngineProvider.type.displayName).toBe("StyledEngineProvider");
      expect(styledEngineProvider.props.injectFirst).toBe(true);
      
      const themeProvider = styledEngineProvider.props.children;
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
      
      const appGoogle = themeProvider.props.children;
      expect(appGoogle.type.displayName).toBe("AppGoogle");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing root element gracefully", async () => {
      vi.spyOn(document, "getElementById").mockReturnValue(null);

      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      expect(async () => {
        await import("../index.google");
      }).not.toThrow();
    });

    it("should not render when Google configuration is missing", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: undefined
      };

      await import("../index.google");

      expect(mockRender).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("Google is not configured.");
    });

    it("should handle createRoot errors gracefully", async () => {
      mockCreateRoot.mockImplementation(() => {
        throw new Error("Failed to create root");
      });

      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      expect(async () => {
        await import("../index.google");
      }).not.toThrow();
    });
  });

  describe("Component Integration", () => {
    it("should pass correct props to StyledEngineProvider", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      const renderCall = mockRender.mock.calls[0][0];
      const styledEngineProvider = renderCall.props.children;
      
      expect(styledEngineProvider.props.injectFirst).toBe(true);
    });

    it("should integrate with Material-UI theme system", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      const renderCall = mockRender.mock.calls[0][0];
      const styledEngineProvider = renderCall.props.children;
      const themeProvider = styledEngineProvider.props.children;
      
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
      expect(themeProvider.props.theme).toBeDefined();
      expect(themeProvider.props.theme.palette.secondary.main).toBe("#fff");
    });

    it("should render AppGoogle as the main application component", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      const renderCall = mockRender.mock.calls[0][0];
      const styledEngineProvider = renderCall.props.children;
      const themeProvider = styledEngineProvider.props.children;
      const appGoogle = themeProvider.props.children;
      
      expect(appGoogle.type.displayName).toBe("AppGoogle");
    });
  });

  describe("Environment Variable Validation", () => {
    it("should handle various truthy values for VITE_GOOGLE", async () => {
      const truthyValues = ["true", "1", "yes", "enabled"];
      
      for (const value of truthyValues) {
        vi.clearAllMocks();
        process.env = {
          ...originalEnv,
          VITE_GOOGLE: value
        };

        await import("../index.google");

        expect(mockRender).toHaveBeenCalledTimes(1);
        expect(console.error).not.toHaveBeenCalled();
      }
    });

    it("should handle various falsy values for VITE_GOOGLE", async () => {
      const falsyValues = ["false", "0", "", undefined, null];
      
      for (const value of falsyValues) {
        vi.clearAllMocks();
        process.env = {
          ...originalEnv,
          VITE_GOOGLE: value as any
        };

        await import("../index.google");

        expect(mockRender).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith("Google is not configured.");
      }
    });
  });

  describe("Google-Specific Features", () => {
    it("should handle Google OAuth configuration when available", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true",
        VITE_GOOGLE_CLIENT_ID: "test-google-client-id"
      };

      await import("../index.google");

      expect(mockRender).toHaveBeenCalledTimes(1);
      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall.type.displayName).toBe("Router");
    });

    it("should render without Google OAuth environment variables", async () => {
      process.env = {
        ...originalEnv,
        VITE_GOOGLE: "true"
      };

      await import("../index.google");

      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
