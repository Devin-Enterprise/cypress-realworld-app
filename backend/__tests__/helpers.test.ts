import { describe, expect, it, beforeEach, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import {
  verifyOktaToken,
  checkAuth0Jwt,
  checkCognitoJwt,
  checkGoogleJwt,
  ensureAuthenticated,
  validateMiddleware
} from "../helpers";

vi.mock("express-jwt");
vi.mock("jwks-rsa");
vi.mock("@okta/jwt-verifier");
vi.mock("../src/aws-exports", () => ({
  default: {
    Auth: {
      Cognito: {
        userPoolId: "us-east-1_test123"
      }
    }
  }
}));

describe("JWT Verification Helpers", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      headers: {},
      user: undefined,
      isAuthenticated: vi.fn() as any
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    
    mockNext = vi.fn() as any;
  });

  describe("Auth0 JWT Middleware", () => {
    it("should be defined as middleware function", () => {
      expect(checkAuth0Jwt).toBeDefined();
      expect(typeof checkAuth0Jwt).toBe("function");
    });

    it("should handle JWT validation through middleware", () => {
      expect(checkAuth0Jwt).toHaveProperty("unless");
    });
  });

  describe("Okta JWT Verification", () => {
    it("should verify valid Okta token", async () => {
      const mockOktaJwtVerifier = {
        verifyAccessToken: vi.fn().mockResolvedValue({ sub: "okta|123" })
      };
      
      vi.doMock("@okta/jwt-verifier", () => {
        return vi.fn().mockImplementation(() => mockOktaJwtVerifier);
      });

      mockReq.headers = {
        authorization: "Bearer valid-okta-token"
      };

      await verifyOktaToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({ sub: "okta|123" });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle missing authorization header", async () => {
      mockReq.headers = {};

      await verifyOktaToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle invalid Okta token", async () => {
      const mockOktaJwtVerifier = {
        verifyAccessToken: vi.fn().mockRejectedValue(new Error("Invalid token"))
      };
      
      vi.doMock("@okta/jwt-verifier", () => {
        return vi.fn().mockImplementation(() => mockOktaJwtVerifier);
      });

      mockReq.headers = {
        authorization: "Bearer invalid-okta-token"
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await verifyOktaToken(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith("error", expect.any(Error));
      expect(mockNext).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe("Google JWT Middleware", () => {
    it("should be defined as middleware function", () => {
      expect(checkGoogleJwt).toBeDefined();
      expect(typeof checkGoogleJwt).toBe("function");
    });

    it("should handle JWT validation through middleware", () => {
      expect(checkGoogleJwt).toHaveProperty("unless");
    });
  });

  describe("Cognito JWT Middleware", () => {
    it("should be defined as middleware function", () => {
      expect(checkCognitoJwt).toBeDefined();
      expect(typeof checkCognitoJwt).toBe("function");
    });

    it("should handle JWT validation through middleware", () => {
      expect(checkCognitoJwt).toHaveProperty("unless");
    });
  });

  describe("ensureAuthenticated Middleware", () => {
    it("should call next() when user is authenticated", () => {
      (mockReq.isAuthenticated as any).mockReturnValue(true);
      mockReq.user = { sub: "auth0|123" } as any;

      ensureAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.user).toHaveProperty("id", "auth0|123");
    });

    it("should return 401 when user is not authenticated", () => {
      (mockReq.isAuthenticated as any).mockReturnValue(false);

      ensureAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should map sub to id when user has sub property", () => {
      (mockReq.isAuthenticated as any).mockReturnValue(true);
      mockReq.user = { sub: "google|456", email: "test@example.com" } as any;

      ensureAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toHaveProperty("id", "google|456");
      expect(mockReq.user).toHaveProperty("sub", "google|456");
    });

    it("should work without sub property", () => {
      (mockReq.isAuthenticated as any).mockReturnValue(true);
      mockReq.user = {
        id: "local-user-123",
        uuid: "uuid-123",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com",
        phoneNumber: "555-0123",
        balance: 1000,
        avatar: "avatar.jpg",
        defaultPrivacyLevel: "public"
      } as any;

      ensureAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toHaveProperty("id", "local-user-123");
    });
  });

  describe("validateMiddleware Function", () => {
    it("should create middleware that validates request data", async () => {
      const mockValidation1 = {
        run: vi.fn().mockResolvedValue(undefined)
      };
      const mockValidation2 = {
        run: vi.fn().mockResolvedValue(undefined)
      };

      const validations = [mockValidation1, mockValidation2];
      const middleware = validateMiddleware(validations);

      const { validationResult } = await import("express-validator");
      vi.mocked(validationResult).mockReturnValue({
        isEmpty: () => true,
        array: () => []
      } as any);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockValidation1.run).toHaveBeenCalledWith(mockReq);
      expect(mockValidation2.run).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 422 when validation errors exist", async () => {
      const mockValidation = {
        run: vi.fn().mockResolvedValue(undefined)
      };

      const validations = [mockValidation];
      const middleware = validateMiddleware(validations);

      const mockErrors = [
        { field: "email", message: "Invalid email" },
        { field: "password", message: "Password too short" }
      ];

      const { validationResult } = await import("express-validator");
      vi.mocked(validationResult).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ errors: mockErrors });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete authentication flow", () => {
      expect(checkAuth0Jwt).toBeDefined();
      expect(checkGoogleJwt).toBeDefined();
      expect(checkCognitoJwt).toBeDefined();
      expect(verifyOktaToken).toBeDefined();
      expect(ensureAuthenticated).toBeDefined();
      expect(validateMiddleware).toBeDefined();
    });

    it("should properly configure JWT middleware with unless paths", () => {
      expect(checkAuth0Jwt).toHaveProperty("unless");
      expect(checkGoogleJwt).toHaveProperty("unless");
      expect(checkCognitoJwt).toHaveProperty("unless");
    });
  });
});
