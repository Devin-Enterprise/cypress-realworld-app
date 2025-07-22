import { describe, expect, test, beforeEach, vi } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    create: vi.fn(),
  },
}));

const mockedAxios = axios as any;

describe("asyncUtils", () => {
  let mockAxiosInstance: any;
  let mockInterceptor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    delete process.env.VITE_AUTH0;
    delete process.env.VITE_OKTA;
    delete process.env.VITE_AWS_COGNITO;
    delete process.env.VITE_GOOGLE;
    delete process.env.VITE_AUTH_TOKEN_NAME;

    mockInterceptor = {
      use: vi.fn()
    };
    
    mockAxiosInstance = {
      interceptors: {
        request: mockInterceptor
      }
    };
    
    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);
  });

  describe("httpClient creation", () => {
    test("should create axios instance with withCredentials true", async () => {
      vi.resetModules();
      await import("../asyncUtils");
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        withCredentials: true,
      });
    });

    test("should set up request interceptor", async () => {
      vi.resetModules();
      await import("../asyncUtils");
      
      expect(mockInterceptor.use).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("request interceptor", () => {
    let interceptorFunction: any;

    beforeEach(async () => {
      vi.resetModules();
      await import("../asyncUtils");
      if (mockInterceptor.use.mock.calls.length > 0) {
        interceptorFunction = mockInterceptor.use.mock.calls[0][0];
      }
    });

    test("should add Authorization header when VITE_AUTH0 is set and token exists", () => {
      process.env.VITE_AUTH0 = "true";
      process.env.VITE_AUTH_TOKEN_NAME = "authToken";
      localStorage.setItem("authToken", "test-auth0-token");

      const mockConfig = { headers: {} };
      const result = interceptorFunction(mockConfig);

      expect(result.headers.Authorization).toBe("Bearer test-auth0-token");
    });

    test("should add Authorization header when VITE_OKTA is set and token exists", () => {
      process.env.VITE_OKTA = "true";
      process.env.VITE_AUTH_TOKEN_NAME = "oktaToken";
      localStorage.setItem("oktaToken", "test-okta-token");

      const mockConfig = { headers: {} };
      const result = interceptorFunction(mockConfig);

      expect(result.headers.Authorization).toBe("Bearer test-okta-token");
    });

    test("should add Authorization header when VITE_AWS_COGNITO is set and token exists", () => {
      process.env.VITE_AWS_COGNITO = "true";
      process.env.VITE_AUTH_TOKEN_NAME = "cognitoToken";
      localStorage.setItem("cognitoToken", "test-cognito-token");

      const mockConfig = { headers: {} };
      const result = interceptorFunction(mockConfig);

      expect(result.headers.Authorization).toBe("Bearer test-cognito-token");
    });

    test("should add Authorization header when VITE_GOOGLE is set and token exists", () => {
      process.env.VITE_GOOGLE = "true";
      process.env.VITE_AUTH_TOKEN_NAME = "googleToken";
      localStorage.setItem("googleToken", "test-google-token");

      const mockConfig = { headers: {} };
      const result = interceptorFunction(mockConfig);

      expect(result.headers.Authorization).toBe("Bearer test-google-token");
    });

    test("should not add Authorization header when no auth provider is set", () => {
      const mockConfig = { headers: {} };
      const result = interceptorFunction(mockConfig);

      expect(result.headers.Authorization).toBeUndefined();
    });

    test("should add Authorization header with null when token does not exist in localStorage", () => {
      process.env.VITE_AUTH0 = "true";
      process.env.VITE_AUTH_TOKEN_NAME = "missingToken";

      const mockConfig = { headers: {} };
      const result = interceptorFunction(mockConfig);

      expect(result.headers.Authorization).toBe("Bearer null");
    });

    test("should preserve existing headers when adding Authorization", () => {
      process.env.VITE_AUTH0 = "true";
      process.env.VITE_AUTH_TOKEN_NAME = "authToken";
      localStorage.setItem("authToken", "test-token");

      const mockConfig = { 
        headers: { 
          "Content-Type": "application/json",
          "X-Custom-Header": "custom-value"
        } 
      };
      const result = interceptorFunction(mockConfig);

      expect(result.headers["Content-Type"]).toBe("application/json");
      expect(result.headers["X-Custom-Header"]).toBe("custom-value");
      expect(result.headers.Authorization).toBe("Bearer test-token");
    });

    test("should handle multiple auth providers set (first one wins)", () => {
      process.env.VITE_AUTH0 = "true";
      process.env.VITE_OKTA = "true";
      process.env.VITE_AUTH_TOKEN_NAME = "authToken";
      localStorage.setItem("authToken", "test-token");

      const mockConfig = { headers: {} };
      const result = interceptorFunction(mockConfig);

      expect(result.headers.Authorization).toBe("Bearer test-token");
    });

    test("should return the same config object reference", () => {
      const mockConfig = { headers: {} };
      const result = interceptorFunction(mockConfig);

      expect(result).toBe(mockConfig);
    });
  });
});
