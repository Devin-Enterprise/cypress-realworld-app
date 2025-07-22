import { describe, expect, it, beforeEach, vi } from "vitest";
import { interpret } from "xstate";
import { authMachine } from "../machines/authMachine";
import * as asyncUtils from "../utils/asyncUtils";
import * as historyUtils from "../utils/historyUtils";

vi.mock("../utils/asyncUtils");
vi.mock("../utils/historyUtils");
vi.mock("../utils/portUtils", () => ({
  backendPort: "3001"
}));

const mockHttpClient = {
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn()
};

const mockHistory = {
  push: vi.fn(),
  location: { pathname: "/signin" },
  replace: vi.fn()
};

describe("Authentication Machine", () => {
  let authService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (asyncUtils as any).httpClient = mockHttpClient;
    (historyUtils as any).history = mockHistory;
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });

    authService = interpret(authMachine).start();
  });

  describe("Initial State", () => {
    it("should start in unauthorized state", () => {
      expect(authService.state.value).toBe("unauthorized");
      expect(authService.state.context.user).toBeUndefined();
      expect(authService.state.context.message).toBeUndefined();
    });
  });

  describe("State Transitions", () => {
    it("should transition from unauthorized to loading on LOGIN event", () => {
      authService.send("LOGIN");
      expect(authService.state.value).toBe("loading");
    });

    it("should transition from unauthorized to signup on SIGNUP event", () => {
      authService.send("SIGNUP");
      expect(authService.state.value).toBe("signup");
    });

    it("should transition from unauthorized to auth0 on AUTH0 event", () => {
      authService.send("AUTH0");
      expect(authService.state.value).toBe("auth0");
    });

    it("should transition from unauthorized to okta on OKTA event", () => {
      authService.send("OKTA");
      expect(authService.state.value).toBe("okta");
    });

    it("should transition from unauthorized to cognito on COGNITO event", () => {
      authService.send("COGNITO");
      expect(authService.state.value).toBe("cognito");
    });

    it("should transition from unauthorized to google on GOOGLE event", () => {
      authService.send("GOOGLE");
      expect(authService.state.value).toBe("google");
    });
  });

  describe("Login Service", () => {
    it("should perform successful login", async () => {
      const mockUser = { id: "1", username: "testuser" };
      mockHttpClient.post.mockResolvedValue({ data: { user: mockUser } });

      authService.send("LOGIN", { username: "testuser", password: "password" });
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/login",
        { username: "testuser", password: "password", type: "LOGIN" }
      );
      expect(mockHistory.push).toHaveBeenCalledWith("/");
    });

    it("should handle login failure", async () => {
      mockHttpClient.post.mockRejectedValue(new Error("Invalid credentials"));

      authService.send("LOGIN", { username: "testuser", password: "wrong" });
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(authService.state.value).toBe("unauthorized");
      expect(authService.state.context.message).toBe("Username or password is invalid");
    });
  });

  describe("Signup Service", () => {
    it("should perform successful signup", async () => {
      const mockUser = { id: "1", username: "newuser" };
      mockHttpClient.post.mockResolvedValue({ data: { user: mockUser } });

      authService.send("SIGNUP", { 
        username: "newuser", 
        password: "password",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com"
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/users",
        { 
          username: "newuser", 
          password: "password",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com"
        }
      );
      expect(mockHistory.push).toHaveBeenCalledWith("/signin");
    });

    it("should handle signup failure", async () => {
      mockHttpClient.post.mockRejectedValue(new Error("User already exists"));

      authService.send("SIGNUP", { username: "existinguser", password: "password" });
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(authService.state.value).toBe("unauthorized");
    });
  });

  describe("External Provider Services", () => {
    it("should handle Auth0 user profile mapping", () => {
      const auth0User = {
        sub: "auth0|123",
        email: "user@example.com",
        nickname: "testuser",
        picture: "https://example.com/avatar.jpg"
      };
      const token = "auth0-token";

      authService.send("AUTH0", { user: auth0User, token });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        process.env.VITE_AUTH_TOKEN_NAME,
        token
      );
    });

    it("should handle Okta user profile mapping", () => {
      const oktaUser = {
        sub: "okta|456",
        email: "user@example.com",
        given_name: "Test",
        family_name: "User",
        preferred_username: "testuser"
      };
      const token = "okta-token";

      authService.send("OKTA", { user: oktaUser, token });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        process.env.VITE_AUTH_TOKEN_NAME,
        token
      );
    });

    it("should handle Google user profile mapping", () => {
      const googleUser = {
        googleId: "google123",
        email: "user@example.com",
        givenName: "Test",
        familyName: "User",
        imageUrl: "https://example.com/avatar.jpg"
      };
      const token = "google-token";

      authService.send("GOOGLE", { user: googleUser, token });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        process.env.VITE_AUTH_TOKEN_NAME,
        token
      );
    });

    it("should handle Cognito user profile mapping", () => {
      const cognitoData = {
        userSub: "cognito-sub-789",
        email: "user@example.com",
        accessTokenJwtString: "cognito-jwt-token"
      };

      authService.send("COGNITO", cognitoData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        process.env.VITE_AUTH_TOKEN_NAME,
        "cognito-jwt-token"
      );
    });
  });

  describe("Logout Service", () => {
    it("should perform logout", async () => {
      mockHttpClient.post.mockResolvedValue({});

      authService.send("LOGOUT");
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(localStorage.removeItem).toHaveBeenCalledWith("authState");
      expect(mockHttpClient.post).toHaveBeenCalledWith("http://localhost:3001/logout");
    });
  });

  describe("Profile Update Service", () => {
    it("should update user profile", async () => {
      const updatedUser = { id: "1", firstName: "Updated", lastName: "Name" };
      mockHttpClient.patch.mockResolvedValue({ data: { user: updatedUser } });

      authService.send("UPDATE", { id: "1", firstName: "Updated", lastName: "Name" });
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        "http://localhost:3001/users/1",
        { id: "1", firstName: "Updated", lastName: "Name" }
      );
    });
  });

  describe("Context Updates", () => {
    it("should reset user context on unauthorized entry", () => {
      authService.state.context.user = { id: "1", username: "test" };
      authService.send("LOGOUT");
      
      expect(authService.state.context.user).toBeUndefined();
    });

    it("should set user profile on successful authentication", async () => {
      const mockUser = { id: "1", username: "testuser" };
      mockHttpClient.post.mockResolvedValue({ data: { user: mockUser } });

      authService.send("LOGIN", { username: "testuser", password: "password" });
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(authService.state.context.user).toEqual(mockUser);
      expect(authService.state.context.message).toBeUndefined();
    });
  });
});
