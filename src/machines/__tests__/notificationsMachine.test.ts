import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { interpret } from "xstate";
import { notificationsMachine } from "../notificationsMachine";
import { httpClient } from "../../utils/asyncUtils";

vi.mock("../../utils/asyncUtils");
vi.mock("../../utils/portUtils", () => ({
  backendPort: "3001"
}));

const mockedHttpClient = httpClient as any;

describe("notificationsMachine", () => {
  let notificationsService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedHttpClient.get = vi.fn();
    mockedHttpClient.patch = vi.fn();
    notificationsService = interpret(notificationsMachine).start();
  });

  afterEach(() => {
    notificationsService?.stop();
  });

  describe("initial state", () => {
    test("should start in idle state", () => {
      expect(notificationsService.state.matches("idle")).toBe(true);
    });

    test("should have empty results in initial context", () => {
      expect(notificationsService.state.context.results).toEqual([]);
    });

    test("should extend dataMachine functionality", () => {
      expect(notificationsService.state.matches("idle")).toBe(true);
      
      notificationsService.send("FETCH");
      expect(notificationsService.state.matches("loading")).toBe(true);
    });
  });

  describe("fetchData service", () => {
    test("should make GET request to notifications endpoint", async () => {
      const mockNotifications = [
        {
          id: "1",
          type: "payment",
          message: "Payment received",
          isRead: false,
          createdAt: "2023-01-01"
        },
        {
          id: "2",
          type: "request",
          message: "Payment requested",
          isRead: true,
          createdAt: "2023-01-02"
        }
      ];

      const mockResponse = {
        data: {
          results: mockNotifications,
          pageData: { page: 1, total: 2 }
        }
      };

      mockedHttpClient.get.mockResolvedValue(mockResponse);

      notificationsService.send("FETCH");
      expect(notificationsService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        "http://localhost:3001/notifications",
        {
          params: undefined
        }
      );
    });

    test("should include query parameters when provided", async () => {
      const mockResponse = {
        data: {
          results: [],
          pageData: { page: 1, total: 0 }
        }
      };

      mockedHttpClient.get.mockResolvedValue(mockResponse);

      const fetchEvent = {
        type: "FETCH",
        userId: "123",
        isRead: false,
        limit: 10
      };

      notificationsService.send(fetchEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        "http://localhost:3001/notifications",
        {
          params: {
            userId: "123",
            isRead: false,
            limit: 10
          }
        }
      );
    });

    test("should omit type from query parameters", async () => {
      const mockResponse = {
        data: {
          results: [],
          pageData: { page: 1, total: 0 }
        }
      };

      mockedHttpClient.get.mockResolvedValue(mockResponse);

      const fetchEvent = {
        type: "FETCH",
        userId: "123",
        status: "unread",
        extraField: "should be included"
      };

      notificationsService.send(fetchEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        "http://localhost:3001/notifications",
        {
          params: {
            userId: "123",
            status: "unread",
            extraField: "should be included"
          }
        }
      );

      const callArgs = mockedHttpClient.get.mock.calls[0][1];
      expect(callArgs.params).not.toHaveProperty("type");
    });

    test("should not include params when payload is empty", async () => {
      const mockResponse = {
        data: {
          results: [],
          pageData: { page: 1, total: 0 }
        }
      };

      mockedHttpClient.get.mockResolvedValue(mockResponse);

      notificationsService.send("FETCH");

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        "http://localhost:3001/notifications",
        {
          params: undefined
        }
      );
    });

    test("should handle fetch errors", async () => {
      const mockError = new Error("Network error");
      mockedHttpClient.get.mockRejectedValue(mockError);

      notificationsService.send("FETCH");
      expect(notificationsService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.get).toHaveBeenCalled();
    });

    test("should handle empty payload correctly", async () => {
      const mockResponse = {
        data: {
          results: [],
          pageData: { page: 1, total: 0 }
        }
      };

      mockedHttpClient.get.mockResolvedValue(mockResponse);

      const fetchEvent = { type: "FETCH" };
      notificationsService.send(fetchEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        "http://localhost:3001/notifications",
        {
          params: undefined
        }
      );
    });
  });

  describe("updateData service", () => {
    test("should make PATCH request to update notification", async () => {
      const mockResponse = {
        data: {
          id: "1",
          type: "payment",
          message: "Payment received",
          isRead: true,
          updatedAt: "2023-01-01T12:00:00Z"
        }
      };

      mockedHttpClient.patch.mockResolvedValue(mockResponse);

      const updateEvent = {
        type: "UPDATE",
        id: "1",
        isRead: true
      };

      notificationsService.send(updateEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.patch).toHaveBeenCalledWith(
        "http://localhost:3001/notifications/1",
        {
          id: "1",
          isRead: true
        }
      );
    });

    test("should omit type from update payload", async () => {
      const mockResponse = {
        data: {
          id: "2",
          isRead: false,
          priority: "high"
        }
      };

      mockedHttpClient.patch.mockResolvedValue(mockResponse);

      const updateEvent = {
        type: "UPDATE",
        id: "2",
        isRead: false,
        priority: "high",
        extraField: "should be included"
      };

      notificationsService.send(updateEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.patch).toHaveBeenCalledWith(
        "http://localhost:3001/notifications/2",
        {
          id: "2",
          isRead: false,
          priority: "high",
          extraField: "should be included"
        }
      );

      const callArgs = mockedHttpClient.patch.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty("type");
    });

    test("should use notification id in URL path", async () => {
      const mockResponse = { data: { id: "notification-123" } };
      mockedHttpClient.patch.mockResolvedValue(mockResponse);

      const updateEvent = {
        type: "UPDATE",
        id: "notification-123",
        isRead: true,
        status: "archived"
      };

      notificationsService.send(updateEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.patch).toHaveBeenCalledWith(
        "http://localhost:3001/notifications/notification-123",
        {
          id: "notification-123",
          isRead: true,
          status: "archived"
        }
      );
    });

    test("should handle update errors", async () => {
      const mockError = new Error("Update failed");
      mockedHttpClient.patch.mockRejectedValue(mockError);

      notificationsService.send({
        type: "UPDATE",
        id: "1",
        isRead: true
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.patch).toHaveBeenCalled();
    });

    test("should handle missing id in update payload", async () => {
      const mockResponse = { data: { success: true } };
      mockedHttpClient.patch.mockResolvedValue(mockResponse);

      const updateEvent = {
        type: "UPDATE",
        isRead: true,
        status: "read"
      };

      notificationsService.send(updateEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.patch).toHaveBeenCalledWith(
        "http://localhost:3001/notifications/undefined",
        {
          isRead: true,
          status: "read"
        }
      );
    });

    test("should handle complex update payloads", async () => {
      const mockResponse = { data: { id: "complex-1" } };
      mockedHttpClient.patch.mockResolvedValue(mockResponse);

      const updateEvent = {
        type: "UPDATE",
        id: "complex-1",
        isRead: false,
        metadata: {
          source: "mobile",
          timestamp: "2023-01-01T12:00:00Z"
        },
        tags: ["urgent", "payment"],
        priority: 1
      };

      notificationsService.send(updateEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.patch).toHaveBeenCalledWith(
        "http://localhost:3001/notifications/complex-1",
        {
          id: "complex-1",
          isRead: false,
          metadata: {
            source: "mobile",
            timestamp: "2023-01-01T12:00:00Z"
          },
          tags: ["urgent", "payment"],
          priority: 1
        }
      );
    });
  });

  describe("state machine integration", () => {
    test("should transition through states correctly for fetch", async () => {
      const mockResponse = {
        data: {
          results: [{ id: "1", message: "test" }],
          pageData: { page: 1, total: 1 }
        }
      };

      mockedHttpClient.get.mockResolvedValue(mockResponse);

      expect(notificationsService.state.matches("idle")).toBe(true);

      notificationsService.send("FETCH");
      expect(notificationsService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("success")).toBe(true);
    });

    test("should transition through states correctly for update", async () => {
      const mockResponse = { data: { id: "1", isRead: true } };
      mockedHttpClient.patch.mockResolvedValue(mockResponse);
      mockedHttpClient.get.mockResolvedValue({
        data: { results: [], pageData: {} }
      });

      expect(notificationsService.state.matches("idle")).toBe(true);

      notificationsService.send({ type: "UPDATE", id: "1", isRead: true });
      expect(notificationsService.state.matches("updating")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("success")).toBe(true);
    });

    test("should handle multiple operations sequentially", async () => {
      const fetchResponse = {
        data: {
          results: [{ id: "1", isRead: false }],
          pageData: { page: 1, total: 1 }
        }
      };
      const updateResponse = { data: { id: "1", isRead: true } };

      mockedHttpClient.get.mockResolvedValue(fetchResponse);
      mockedHttpClient.patch.mockResolvedValue(updateResponse);

      notificationsService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("success")).toBe(true);
      expect(mockedHttpClient.get).toHaveBeenCalledTimes(1);

      notificationsService.send({ type: "UPDATE", id: "1", isRead: true });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("loading")).toBe(true);
      expect(mockedHttpClient.patch).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("success")).toBe(true);
      expect(mockedHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    test("should handle network errors gracefully", async () => {
      const networkError = new Error("Network unavailable");
      mockedHttpClient.get.mockRejectedValue(networkError);

      notificationsService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(notificationsService.state.matches("failure")).toBe(true);
    });

    test("should handle server errors gracefully", async () => {
      const serverError = new Error("Internal server error");
      mockedHttpClient.patch.mockRejectedValue(serverError);

      notificationsService.send({ type: "UPDATE", id: "1", isRead: true });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(notificationsService.state.matches("failure")).toBe(true);
    });

    test("should allow retry after failure", async () => {
      const error = new Error("Temporary error");
      const successResponse = {
        data: {
          results: [{ id: "1" }],
          pageData: { page: 1, total: 1 }
        }
      };

      mockedHttpClient.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(successResponse);

      notificationsService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("failure")).toBe(true);

      notificationsService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("success")).toBe(true);
    });
  });

  describe("machine configuration", () => {
    test("should have correct machine id", () => {
      expect(notificationsMachine.id).toBe("notifications");
    });

    test("should have fetchData and updateData services configured", () => {
      const services = notificationsMachine.options?.services;
      expect(services).toBeDefined();
      expect(services).toHaveProperty("fetchData");
      expect(services).toHaveProperty("updateData");
    });

    test("should not have createData or deleteData services", () => {
      const services = notificationsMachine.options?.services;
      expect(services).toBeDefined();
      expect(services).not.toHaveProperty("createData");
      expect(services).not.toHaveProperty("deleteData");
    });

    test("should inherit dataMachine states and behavior", () => {
      const stateKeys = Object.keys(notificationsMachine.states);
      expect(stateKeys).toContain("idle");
      expect(stateKeys).toContain("loading");
      expect(stateKeys).toContain("updating");
      expect(stateKeys).toContain("success");
      expect(stateKeys).toContain("failure");
    });
  });

  describe("complete workflows", () => {
    test("should handle complete notification management workflow", async () => {
      const initialNotifications = [
        { id: "1", message: "Payment received", isRead: false },
        { id: "2", message: "Request sent", isRead: false }
      ];

      const fetchResponse = {
        data: {
          results: initialNotifications,
          pageData: { page: 1, total: 2 }
        }
      };

      const updateResponse = {
        data: { id: "1", message: "Payment received", isRead: true }
      };

      const refetchResponse = {
        data: {
          results: [
            { id: "1", message: "Payment received", isRead: true },
            { id: "2", message: "Request sent", isRead: false }
          ],
          pageData: { page: 1, total: 2 }
        }
      };

      mockedHttpClient.get
        .mockResolvedValueOnce(fetchResponse)
        .mockResolvedValueOnce(refetchResponse);
      mockedHttpClient.patch.mockResolvedValue(updateResponse);

      expect(notificationsService.state.matches("idle")).toBe(true);

      notificationsService.send({ type: "FETCH", userId: "user-123" });
      expect(notificationsService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("success.withData")).toBe(true);
      expect(notificationsService.state.context.results).toEqual(initialNotifications);

      notificationsService.send({
        type: "UPDATE",
        id: "1",
        isRead: true
      });
      expect(notificationsService.state.matches("updating")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(notificationsService.state.matches("success.withData")).toBe(true);

      expect(mockedHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockedHttpClient.get).toHaveBeenNthCalledWith(1,
        "http://localhost:3001/notifications",
        { params: { userId: "user-123" } }
      );
      expect(mockedHttpClient.get).toHaveBeenNthCalledWith(2,
        "http://localhost:3001/notifications",
        { params: undefined }
      );

      expect(mockedHttpClient.patch).toHaveBeenCalledTimes(1);
      expect(mockedHttpClient.patch).toHaveBeenCalledWith(
        "http://localhost:3001/notifications/1",
        { id: "1", isRead: true }
      );
    });
  });
});
