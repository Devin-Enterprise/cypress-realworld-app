import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";

vi.mock("react-dom/client");
vi.mock("react-router-dom", () => ({
  Router: ({ children }: { children?: React.ReactNode }) => <div data-testid="router">{children}</div>
}));
vi.mock("../containers/AppCognito", () => ({
  default: () => <div data-testid="app-cognito">AppCognito</div>
}));
vi.mock("../utils/historyUtils", () => ({
  history: {
    replace: vi.fn()
  }
}));

const mockCreateRoot = vi.mocked(createRoot);
const mockRender = vi.fn();

describe("Cognito Index Configuration", () => {
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
    it("should render AppCognito when VITE_AWS_COGNITO is configured", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
      expect(mockRender).toHaveBeenCalledTimes(1);
      
      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall.type.displayName).toBe("Router");
    });

    it("should log error when VITE_AWS_COGNITO is not configured", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: undefined
      };

      await import("../index.cognito");

      expect(console.error).toHaveBeenCalledWith("Cognito is not configured.");
      expect(mockRender).not.toHaveBeenCalled();
    });

    it("should handle empty VITE_AWS_COGNITO environment variable", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: ""
      };

      await import("../index.cognito");

      expect(console.error).toHaveBeenCalledWith("Cognito is not configured.");
      expect(mockRender).not.toHaveBeenCalled();
    });

    it("should handle falsy VITE_AWS_COGNITO environment variable", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "false"
      };

      await import("../index.cognito");

      expect(console.error).toHaveBeenCalledWith("Cognito is not configured.");
      expect(mockRender).not.toHaveBeenCalled();
    });
  });

  describe("Theme Configuration", () => {
    it("should create theme with correct palette configuration", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

      const renderCall = mockRender.mock.calls[0][0];
      const themeProvider = renderCall.props.children.props.children;
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
      expect(themeProvider.props.theme.palette.secondary.main).toBe("#fff");
    });

    it("should use adaptV4Theme for Material-UI compatibility", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

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
        VITE_AWS_COGNITO: "true"
      };

      const { history } = await import("../utils/historyUtils");

      await import("../index.cognito");

      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall.type.displayName).toBe("Router");
      expect(renderCall.props.history).toBe(history);
    });

    it("should render AppCognito within Router", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

      const renderCall = mockRender.mock.calls[0][0];
      const styledEngineProvider = renderCall.props.children;
      const themeProvider = styledEngineProvider.props.children;
      const appCognito = themeProvider.props.children;
      
      expect(appCognito.type.displayName).toBe("AppCognito");
    });
  });

  describe("DOM Integration", () => {
    it("should find root element and create React root", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

      expect(document.getElementById).toHaveBeenCalledWith("root");
      expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
    });

    it("should render complete component tree structure", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

      const renderCall = mockRender.mock.calls[0][0];
      
      expect(renderCall.type.displayName).toBe("Router");
      
      const styledEngineProvider = renderCall.props.children;
      expect(styledEngineProvider.type.displayName).toBe("StyledEngineProvider");
      expect(styledEngineProvider.props.injectFirst).toBe(true);
      
      const themeProvider = styledEngineProvider.props.children;
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
      
      const appCognito = themeProvider.props.children;
      expect(appCognito.type.displayName).toBe("AppCognito");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing root element gracefully", async () => {
      vi.spyOn(document, "getElementById").mockReturnValue(null);

      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      expect(async () => {
        await import("../index.cognito");
      }).not.toThrow();
    });

    it("should not render when Cognito configuration is missing", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: undefined
      };

      await import("../index.cognito");

      expect(mockRender).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("Cognito is not configured.");
    });

    it("should handle createRoot errors gracefully", async () => {
      mockCreateRoot.mockImplementation(() => {
        throw new Error("Failed to create root");
      });

      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      expect(async () => {
        await import("../index.cognito");
      }).not.toThrow();
    });
  });

  describe("Component Integration", () => {
    it("should pass correct props to StyledEngineProvider", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

      const renderCall = mockRender.mock.calls[0][0];
      const styledEngineProvider = renderCall.props.children;
      
      expect(styledEngineProvider.props.injectFirst).toBe(true);
    });

    it("should integrate with Material-UI theme system", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

      const renderCall = mockRender.mock.calls[0][0];
      const styledEngineProvider = renderCall.props.children;
      const themeProvider = styledEngineProvider.props.children;
      
      expect(themeProvider.type.displayName).toBe("ThemeProvider");
      expect(themeProvider.props.theme).toBeDefined();
      expect(themeProvider.props.theme.palette.secondary.main).toBe("#fff");
    });

    it("should render AppCognito as the main application component", async () => {
      process.env = {
        ...originalEnv,
        VITE_AWS_COGNITO: "true"
      };

      await import("../index.cognito");

      const renderCall = mockRender.mock.calls[0][0];
      const styledEngineProvider = renderCall.props.children;
      const themeProvider = styledEngineProvider.props.children;
      const appCognito = themeProvider.props.children;
      
      expect(appCognito.type.displayName).toBe("AppCognito");
    });
  });

  describe("Environment Variable Validation", () => {
    it("should handle various truthy values for VITE_AWS_COGNITO", async () => {
      const truthyValues = ["true", "1", "yes", "enabled"];
      
      for (const value of truthyValues) {
        vi.clearAllMocks();
        process.env = {
          ...originalEnv,
          VITE_AWS_COGNITO: value
        };

        await import("../index.cognito");

        expect(mockRender).toHaveBeenCalledTimes(1);
        expect(console.error).not.toHaveBeenCalled();
      }
    });

    it("should handle various falsy values for VITE_AWS_COGNITO", async () => {
      const falsyValues = ["false", "0", "", undefined, null];
      
      for (const value of falsyValues) {
        vi.clearAllMocks();
        process.env = {
          ...originalEnv,
          VITE_AWS_COGNITO: value as any
        };

        await import("../index.cognito");

        expect(mockRender).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith("Cognito is not configured.");
      }
    });
  });
});
