import { describe, expect, test, beforeEach, vi } from "vitest";
import { interpret } from "xstate";
import { authMachine, AuthMachineContext, AuthMachineEvents } from "../authMachine";
import { httpClient } from "../../utils/asyncUtils";
import { history } from "../../utils/historyUtils";
import { backendPort } from "../../utils/portUtils";

vi.mock("../../utils/asyncUtils");
vi.mock("../../utils/historyUtils");
vi.mock("../../utils/portUtils");

const mockedHttpClient = httpClient as any;
const mockedHistory = history as any;

describe("authMachine", () => {
  let authService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    mockedHistory.push = vi.fn();
    mockedHistory.location = { pathname: "/" };
    
    mockedHttpClient.post = vi.fn();
    mockedHttpClient.get = vi.fn();
    mockedHttpClient.patch = vi.fn();
    
    vi.spyOn(console, "log").mockImplementation(() => {});
    
    Object.defineProperty(window, "location", {
      value: { pathname: "/" },
      writable: true,
    });
    
    authService = interpret(authMachine).start();
  });

  afterEach(() => {
    authService?.stop();
  });

  describe("initial state", () => {
    test("should start in unauthorized state", () => {
      expect(authService.state.matches("unauthorized")).toBe(true);
    });

    test("should have undefined user and message in initial context", () => {
      expect(authService.state.context.user).toBeUndefined();
      expect(authService.state.context.message).toBeUndefined();
    });
  });

  describe("state transitions", () => {
    test("should transition from unauthorized to loading on LOGIN event", () => {
      authService.send("LOGIN");
      expect(authService.state.matches("loading")).toBe(true);
    });

    test("should transition from unauthorized to signup on SIGNUP event", () => {
      authService.send("SIGNUP");
      expect(authService.state.matches("signup")).toBe(true);
    });

    test("should transition from unauthorized to google on GOOGLE event", () => {
      authService.send("GOOGLE");
      expect(authService.state.matches("google")).toBe(true);
    });

    test("should transition from unauthorized to auth0 on AUTH0 event", () => {
      authService.send("AUTH0");
      expect(authService.state.matches("auth0")).toBe(true);
    });

    test("should transition from unauthorized to okta on OKTA event", () => {
      authService.send("OKTA");
      expect(authService.state.matches("okta")).toBe(true);
    });

    test("should transition from unauthorized to cognito on COGNITO event", () => {
      authService.send("COGNITO");
      expect(authService.state.matches("cognito")).toBe(true);
    });

    test("should transition from authorized to updating on UPDATE event", () => {
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: { user: { id: "1" } } });
      
      expect(authService.state.matches("authorized")).toBe(true);
      
      authService.send("UPDATE");
      expect(authService.state.matches("updating")).toBe(true);
    });

    test("should transition from authorized to refreshing on REFRESH event", () => {
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: { user: { id: "1" } } });
      
      expect(authService.state.matches("authorized")).toBe(true);
      
      authService.send("REFRESH");
      expect(authService.state.matches("refreshing")).toBe(true);
    });

    test("should transition from authorized to logout on LOGOUT event", () => {
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: { user: { id: "1" } } });
      
      expect(authService.state.matches("authorized")).toBe(true);
      
      authService.send("LOGOUT");
      expect(authService.state.matches("logout")).toBe(true);
    });
  });

  describe("machine behavior", () => {
    test("should handle successful login flow", async () => {
      const mockResponse = { data: { user: { id: "1", username: "testuser" } } };
      mockedHttpClient.post.mockResolvedValue(mockResponse);
      
      authService.send({ type: "LOGIN", username: "testuser", password: "password" });
      expect(authService.state.matches("loading")).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/login",
        { type: "LOGIN", username: "testuser", password: "password" }
      );
    });

    test("should handle successful signup flow", async () => {
      const mockResponse = { data: { user: { id: "1", username: "testuser" } } };
      mockedHttpClient.post.mockResolvedValue(mockResponse);
      
      authService.send({ type: "SIGNUP", username: "testuser", password: "password" });
      expect(authService.state.matches("signup")).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/users",
        { username: "testuser", password: "password" }
      );
    });

    test("should handle logout flow", async () => {
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: { user: { id: "1" } } });
      expect(authService.state.matches("authorized")).toBe(true);
      
      const mockResponse = { data: {} };
      mockedHttpClient.post.mockResolvedValue(mockResponse);
      
      authService.send("LOGOUT");
      expect(authService.state.matches("logout")).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockedHttpClient.post).toHaveBeenCalledWith("http://localhost:3001/logout");
    });

    test("should handle profile update flow", async () => {
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: { user: { id: "1" } } });
      expect(authService.state.matches("authorized")).toBe(true);
      
      const mockResponse = { data: { user: { id: "1", username: "updateduser" } } };
      mockedHttpClient.patch.mockResolvedValue(mockResponse);
      
      authService.send({ type: "UPDATE", id: "1", username: "updateduser" });
      expect(authService.state.matches("updating")).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockedHttpClient.patch).toHaveBeenCalledWith(
        "http://localhost:3001/users/1",
        { id: "1", username: "updateduser" }
      );
    });

    test("should handle profile refresh flow", async () => {
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: { user: { id: "1" } } });
      expect(authService.state.matches("authorized")).toBe(true);
      
      const mockResponse = { data: { user: { id: "1", username: "testuser" } } };
      mockedHttpClient.get.mockResolvedValue(mockResponse);
      
      authService.send("REFRESH");
      expect(authService.state.matches("refreshing")).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockedHttpClient.get).toHaveBeenCalledWith("http://localhost:3001/checkAuth");
    });

    test("should handle third-party auth flows", () => {
      authService.send("GOOGLE");
      expect(authService.state.matches("google")).toBe(true);
      
      authService = interpret(authMachine).start();
      
      authService.send("AUTH0");
      expect(authService.state.matches("auth0")).toBe(true);
      
      authService = interpret(authMachine).start();
      
      authService.send("OKTA");
      expect(authService.state.matches("okta")).toBe(true);
      
      authService = interpret(authMachine).start();
      
      authService.send("COGNITO");
      expect(authService.state.matches("cognito")).toBe(true);
    });
  });

  describe("context updates", () => {
    test("should update context on successful login", () => {
      const userData = { user: { id: "1", username: "testuser" } };
      
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: userData });
      
      expect(authService.state.context.user).toEqual(userData.user);
      expect(authService.state.context.message).toBeUndefined();
    });

    test("should update context on error", () => {
      const errorData = { message: "Login failed" };
      
      authService.send("LOGIN");
      authService.send({ type: "error.platform.performLogin", data: errorData });
      
      expect(authService.state.context.message).toBe("Login failed");
    });

    test("should reset user context when entering unauthorized state", () => {
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: { user: { id: "1" } } });
      expect(authService.state.context.user).toBeDefined();
      
      authService.send("LOGOUT");
      authService.send({ type: "done.invoke.performLogout", data: {} });
      
      expect(authService.state.context.user).toBeUndefined();
    });

    test("should handle third-party user profile mapping", () => {
      const oktaUserData = {
        user: {
          id: "okta-123",
          email: "test@okta.com",
          firstName: "John",
          lastName: "Doe",
          username: "johndoe",
        },
      };
      
      authService.send("OKTA");
      authService.send({ type: "done.invoke.getOktaUserProfile", data: oktaUserData });
      
      expect(authService.state.context.user).toEqual(oktaUserData.user);
      expect(authService.state.matches("authorized")).toBe(true);
    });
  });

  describe("localStorage integration", () => {
    test("should persist auth state to localStorage", () => {
      authService.send("LOGIN");
      authService.send({ type: "done.invoke.performLogin", data: { user: { id: "1" } } });
      
      const storedState = localStorage.getItem("authState");
      expect(storedState).toBeTruthy();
      
      const parsedState = JSON.parse(storedState!);
      expect(parsedState.value).toBe("authorized");
    });

    test("should restore auth state from localStorage", () => {
      const mockState = {
        value: "authorized",
        context: { user: { id: "1", username: "testuser" } },
        changed: false,
      };
      localStorage.setItem("authState", JSON.stringify(mockState));
      
      const newAuthService = interpret(authMachine).start();
      
      expect(newAuthService.state.matches("authorized")).toBe(true);
      
      newAuthService.stop();
    });
  });
});
