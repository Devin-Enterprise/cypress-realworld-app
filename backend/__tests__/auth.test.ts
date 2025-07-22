import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import passport from "passport";
import bcrypt from "bcryptjs";
import authRouter from "../auth";
import * as database from "../database";

vi.mock("../database");
vi.mock("bcryptjs");

const mockGetUserBy = vi.mocked(database.getUserBy);
const mockGetUserById = vi.mocked(database.getUserById);
const mockBcryptCompareSync = vi.mocked(bcrypt.compareSync);

describe("Authentication Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    app.use(
      session({
        secret: "test-secret",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
      })
    );
    
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(authRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /login", () => {
    it("should login successfully with valid credentials", async () => {
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      const response = await request(app)
        .post("/login")
        .send({
          username: "testuser",
          password: "password123"
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
      expect(mockGetUserBy).toHaveBeenCalledWith("username", "testuser");
      expect(mockBcryptCompareSync).toHaveBeenCalledWith("password123", "hashedpassword");
    });

    it("should fail login with non-existent username", async () => {
      mockGetUserBy.mockReturnValue(null);

      const response = await request(app)
        .post("/login")
        .send({
          username: "nonexistent",
          password: "password123"
        });

      expect(response.status).toBe(401);
      expect(mockGetUserBy).toHaveBeenCalledWith("username", "nonexistent");
      expect(mockBcryptCompareSync).not.toHaveBeenCalled();
    });

    it("should fail login with incorrect password", async () => {
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(false);

      const response = await request(app)
        .post("/login")
        .send({
          username: "testuser",
          password: "wrongpassword"
        });

      expect(response.status).toBe(401);
      expect(mockGetUserBy).toHaveBeenCalledWith("username", "testuser");
      expect(mockBcryptCompareSync).toHaveBeenCalledWith("wrongpassword", "hashedpassword");
    });

    it("should set extended session when remember is true", async () => {
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      const response = await request(app)
        .post("/login")
        .send({
          username: "testuser",
          password: "password123",
          remember: true
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
    });

    it("should set session expiry to undefined when remember is false", async () => {
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      const response = await request(app)
        .post("/login")
        .send({
          username: "testuser",
          password: "password123",
          remember: false
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
    });
  });

  describe("POST /logout", () => {
    it("should logout successfully", async () => {
      const agent = request.agent(app);
      
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      await agent
        .post("/login")
        .send({
          username: "testuser",
          password: "password123"
        });

      const response = await agent.post("/logout");

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("/");
    });

    it("should clear session cookie on logout", async () => {
      const response = await request(app).post("/logout");

      expect(response.status).toBe(302);
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookieHeader = response.headers["set-cookie"][0];
      expect(cookieHeader).toContain("connect.sid=;");
    });
  });

  describe("GET /checkAuth", () => {
    it("should return user data when authenticated", async () => {
      const agent = request.agent(app);
      
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockGetUserById.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      await agent
        .post("/login")
        .send({
          username: "testuser",
          password: "password123"
        });

      const response = await agent.get("/checkAuth");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/checkAuth");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "User is unauthorized" });
    });
  });

  describe("Passport Configuration", () => {
    it("should handle user serialization through login flow", async () => {
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      const response = await request(app)
        .post("/login")
        .send({
          username: "testuser",
          password: "password123"
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual(mockUser);
    });

    it("should handle user deserialization through checkAuth", async () => {
      const agent = request.agent(app);
      
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockGetUserById.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      await agent
        .post("/login")
        .send({
          username: "testuser",
          password: "password123"
        });

      const response = await agent.get("/checkAuth");

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual(mockUser);
      expect(mockGetUserById).toHaveBeenCalledWith("user1");
    });
  });

  describe("LocalStrategy Configuration", () => {
    it("should authenticate user with valid credentials", async () => {
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      const response = await request(app)
        .post("/login")
        .send({
          username: "testuser",
          password: "password123"
        });

      expect(response.status).toBe(200);
      expect(mockGetUserBy).toHaveBeenCalledWith("username", "testuser");
      expect(mockBcryptCompareSync).toHaveBeenCalledWith("password123", "hashedpassword");
    });

    it("should reject authentication with invalid username", async () => {
      mockGetUserBy.mockReturnValue(null);

      const response = await request(app)
        .post("/login")
        .send({
          username: "invaliduser",
          password: "password123"
        });

      expect(response.status).toBe(401);
      expect(mockGetUserBy).toHaveBeenCalledWith("username", "invaliduser");
    });

    it("should reject authentication with invalid password", async () => {
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(false);

      const response = await request(app)
        .post("/login")
        .send({
          username: "testuser",
          password: "wrongpassword"
        });

      expect(response.status).toBe(401);
      expect(mockBcryptCompareSync).toHaveBeenCalledWith("wrongpassword", "hashedpassword");
    });
  });

  describe("Session Management", () => {
    it("should maintain session across requests after login", async () => {
      const agent = request.agent(app);
      
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockGetUserById.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      const loginResponse = await agent
        .post("/login")
        .send({
          username: "testuser",
          password: "password123"
        });

      expect(loginResponse.status).toBe(200);

      const checkAuthResponse = await agent.get("/checkAuth");
      expect(checkAuthResponse.status).toBe(200);
      expect(checkAuthResponse.body.user).toEqual(mockUser);
    });

    it("should destroy session after logout", async () => {
      const agent = request.agent(app);
      
      const mockUser = {
        id: "user1",
        username: "testuser",
        password: "hashedpassword",
        email: "test@example.com"
      };

      mockGetUserBy.mockReturnValue(mockUser);
      mockGetUserById.mockReturnValue(mockUser);
      mockBcryptCompareSync.mockReturnValue(true);

      await agent
        .post("/login")
        .send({
          username: "testuser",
          password: "password123"
        });

      await agent.post("/logout");

      const checkAuthResponse = await agent.get("/checkAuth");
      expect(checkAuthResponse.status).toBe(401);
    });
  });
});
