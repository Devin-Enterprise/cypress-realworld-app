import { describe, expect, test, beforeEach, vi } from "vitest";
import { interpret } from "xstate";
import { bankAccountsMachine } from "../bankAccountsMachine";
import { httpClient } from "../../utils/asyncUtils";

vi.mock("../../utils/asyncUtils");
vi.mock("../../utils/portUtils", () => ({
  backendPort: "3001"
}));

const mockedHttpClient = httpClient as any;

describe("bankAccountsMachine", () => {
  let bankAccountsService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedHttpClient.post = vi.fn();
    bankAccountsService = interpret(bankAccountsMachine).start();
  });

  afterEach(() => {
    bankAccountsService?.stop();
  });

  describe("initial state", () => {
    test("should start in idle state", () => {
      expect(bankAccountsService.state.matches("idle")).toBe(true);
    });

    test("should have empty results in initial context", () => {
      expect(bankAccountsService.state.context.results).toEqual([]);
    });
  });

  describe("fetchData service", () => {
    test("should make GraphQL query to list bank accounts", async () => {
      const mockBankAccounts = [
        {
          id: "1",
          uuid: "uuid-1",
          userId: "user-1",
          bankName: "Test Bank",
          accountNumber: "1234567890",
          routingNumber: "123456789",
          isDeleted: false,
          createdAt: "2023-01-01",
          modifiedAt: "2023-01-01"
        },
        {
          id: "2",
          uuid: "uuid-2",
          userId: "user-1",
          bankName: "Another Bank",
          accountNumber: "0987654321",
          routingNumber: "987654321",
          isDeleted: false,
          createdAt: "2023-01-02",
          modifiedAt: "2023-01-02"
        }
      ];

      const mockResponse = {
        data: {
          data: {
            listBankAccount: mockBankAccounts
          }
        }
      };

      mockedHttpClient.post.mockResolvedValue(mockResponse);

      bankAccountsService.send("FETCH");
      expect(bankAccountsService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/graphql",
        {
          operationName: "ListBankAccount",
          query: expect.stringContaining("query ListBankAccount"),
        }
      );

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/graphql",
        expect.objectContaining({
          query: expect.stringContaining("listBankAccount")
        })
      );
    });

    test("should handle fetch errors", async () => {
      const mockError = new Error("Network error");
      mockedHttpClient.post.mockRejectedValue(mockError);

      bankAccountsService.send("FETCH");
      expect(bankAccountsService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalled();
    });
  });

  describe("deleteData service", () => {
    test("should make GraphQL mutation to delete bank account", async () => {
      const mockResponse = {
        data: {
          data: {
            deleteBankAccount: true
          }
        }
      };

      mockedHttpClient.post.mockResolvedValue(mockResponse);

      const deleteEvent = { type: "DELETE", id: "1" };
      bankAccountsService.send(deleteEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/graphql",
        {
          operationName: "DeleteBankAccount",
          query: expect.stringContaining("mutation DeleteBankAccount"),
          variables: { id: "1" }
        }
      );

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/graphql",
        expect.objectContaining({
          query: expect.stringContaining("deleteBankAccount")
        })
      );
    });

    test("should omit type from event payload", async () => {
      const mockResponse = { data: { data: { deleteBankAccount: true } } };
      mockedHttpClient.post.mockResolvedValue(mockResponse);

      const deleteEvent = { type: "DELETE", id: "1", extraField: "value" };
      bankAccountsService.send(deleteEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/graphql",
        expect.objectContaining({
          variables: { id: "1", extraField: "value" }
        })
      );

      const callArgs = mockedHttpClient.post.mock.calls[0][1];
      expect(callArgs.variables).not.toHaveProperty("type");
    });

    test("should handle delete errors", async () => {
      const mockError = new Error("Delete failed");
      mockedHttpClient.post.mockRejectedValue(mockError);

      bankAccountsService.send({ type: "DELETE", id: "1" });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalled();
    });
  });

  describe("createData service", () => {
    test("should make GraphQL mutation to create bank account", async () => {
      const newBankAccount = {
        id: "3",
        uuid: "uuid-3",
        userId: "user-1",
        bankName: "New Bank",
        accountNumber: "1111111111",
        routingNumber: "111111111",
        isDeleted: false,
        createdAt: "2023-01-03"
      };

      const mockResponse = {
        data: {
          data: {
            createBankAccount: newBankAccount
          }
        }
      };

      mockedHttpClient.post.mockResolvedValue(mockResponse);

      const createEvent = {
        type: "CREATE",
        bankName: "New Bank",
        accountNumber: "1111111111",
        routingNumber: "111111111"
      };

      bankAccountsService.send(createEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/graphql",
        {
          operationName: "CreateBankAccount",
          query: expect.stringContaining("mutation CreateBankAccount"),
          variables: {
            bankName: "New Bank",
            accountNumber: "1111111111",
            routingNumber: "111111111"
          }
        }
      );

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/graphql",
        expect.objectContaining({
          query: expect.stringContaining("createBankAccount")
        })
      );
    });

    test("should omit type from create event payload", async () => {
      const mockResponse = { data: { data: { createBankAccount: {} } } };
      mockedHttpClient.post.mockResolvedValue(mockResponse);

      const createEvent = {
        type: "CREATE",
        bankName: "Test Bank",
        accountNumber: "1234567890",
        routingNumber: "123456789",
        extraField: "should be included"
      };

      bankAccountsService.send(createEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      const callArgs = mockedHttpClient.post.mock.calls[0][1];
      expect(callArgs.variables).toEqual({
        bankName: "Test Bank",
        accountNumber: "1234567890",
        routingNumber: "123456789",
        extraField: "should be included"
      });
      expect(callArgs.variables).not.toHaveProperty("type");
    });

    test("should handle create errors", async () => {
      const mockError = new Error("Create failed");
      mockedHttpClient.post.mockRejectedValue(mockError);

      bankAccountsService.send({
        type: "CREATE",
        bankName: "Test Bank",
        accountNumber: "1234567890",
        routingNumber: "123456789"
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalled();
    });
  });

  describe("GraphQL queries and mutations", () => {
    test("should use correct GraphQL operation names", async () => {
      mockedHttpClient.post.mockResolvedValue({ data: { data: {} } });

      bankAccountsService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operationName: "ListBankAccount" })
      );

      mockedHttpClient.post.mockClear();

      bankAccountsService.send({ type: "DELETE", id: "1" });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operationName: "DeleteBankAccount" })
      );

      mockedHttpClient.post.mockClear();

      bankAccountsService.send({
        type: "CREATE",
        bankName: "Test",
        accountNumber: "123",
        routingNumber: "456"
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operationName: "CreateBankAccount" })
      );
    });

    test("should include required fields in GraphQL queries", async () => {
      mockedHttpClient.post.mockResolvedValue({ data: { data: {} } });

      bankAccountsService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));

      const callArgs = mockedHttpClient.post.mock.calls[0][1];
      const query = callArgs.query;

      expect(query).toContain("id");
      expect(query).toContain("uuid");
      expect(query).toContain("userId");
      expect(query).toContain("bankName");
      expect(query).toContain("accountNumber");
      expect(query).toContain("routingNumber");
      expect(query).toContain("isDeleted");
      expect(query).toContain("createdAt");
      expect(query).toContain("modifiedAt");
    });

    test("should include required parameters in create mutation", async () => {
      mockedHttpClient.post.mockResolvedValue({ data: { data: {} } });

      bankAccountsService.send({
        type: "CREATE",
        bankName: "Test Bank",
        accountNumber: "1234567890",
        routingNumber: "123456789"
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      const callArgs = mockedHttpClient.post.mock.calls[0][1];
      const query = callArgs.query;

      expect(query).toContain("$bankName: String!");
      expect(query).toContain("$accountNumber: String!");
      expect(query).toContain("$routingNumber: String!");
      expect(query).toContain("bankName: $bankName");
      expect(query).toContain("accountNumber: $accountNumber");
      expect(query).toContain("routingNumber: $routingNumber");
    });
  });

  describe("state machine integration", () => {
    test("should extend dataMachine functionality", () => {
      expect(bankAccountsService.state.matches("idle")).toBe(true);
      
      bankAccountsService.send("FETCH");
      expect(bankAccountsService.state.matches("loading")).toBe(true);
    });

    test("should handle multiple operations sequentially", async () => {
      mockedHttpClient.post.mockResolvedValue({ data: { data: {} } });

      bankAccountsService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockedHttpClient.post).toHaveBeenCalledTimes(1);

      bankAccountsService.send({
        type: "CREATE",
        bankName: "Test",
        accountNumber: "123",
        routingNumber: "456"
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockedHttpClient.post).toHaveBeenCalledTimes(2);

      bankAccountsService.send({ type: "DELETE", id: "1" });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockedHttpClient.post).toHaveBeenCalledTimes(3);
    });
  });
});
