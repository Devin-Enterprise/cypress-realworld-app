import { describe, expect, test, beforeEach, vi } from "vitest";
import { interpret } from "xstate";
import { createTransactionMachine } from "../createTransactionMachine";
import { httpClient } from "../../utils/asyncUtils";
import { authService } from "../authMachine";

vi.mock("../../utils/asyncUtils");
vi.mock("../authMachine", () => ({
  authService: {
    send: vi.fn()
  }
}));
vi.mock("../../utils/portUtils", () => ({
  backendPort: "3001"
}));

const mockedHttpClient = httpClient as any;
const mockedAuthService = authService as any;

describe("createTransactionMachine", () => {
  let createTransactionService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedHttpClient.post = vi.fn();
    mockedAuthService.send = vi.fn();
    createTransactionService = interpret(createTransactionMachine).start();
  });

  afterEach(() => {
    createTransactionService?.stop();
  });

  describe("initial state", () => {
    test("should start in stepOne state", () => {
      expect(createTransactionService.state.matches("stepOne")).toBe(true);
    });

    test("should have empty context initially", () => {
      expect(createTransactionService.state.context).toEqual({});
    });
  });

  describe("state transitions", () => {
    test("should transition from stepOne to stepTwo on SET_USERS event", () => {
      const sender = { id: "1", username: "sender" };
      const receiver = { id: "2", username: "receiver" };

      createTransactionService.send({
        type: "SET_USERS",
        sender,
        receiver
      });

      expect(createTransactionService.state.matches("stepTwo")).toBe(true);
      expect(createTransactionService.state.context.sender).toEqual(sender);
      expect(createTransactionService.state.context.receiver).toEqual(receiver);
    });

    test("should transition from stepTwo to stepThree on CREATE event", () => {
      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      expect(createTransactionService.state.matches("stepTwo")).toBe(true);

      const transactionDetails = {
        type: "CREATE",
        amount: 100,
        description: "Test transaction"
      };

      createTransactionService.send(transactionDetails);

      expect(createTransactionService.state.matches("stepThree")).toBe(true);
      expect(createTransactionService.state.context.transactionDetails).toEqual(transactionDetails);
    });

    test("should transition from stepThree back to stepOne on RESET event", () => {
      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      createTransactionService.send({
        type: "CREATE",
        amount: 100,
        description: "Test transaction"
      });

      expect(createTransactionService.state.matches("stepThree")).toBe(true);

      createTransactionService.send("RESET");

      expect(createTransactionService.state.matches("stepOne")).toBe(true);
      expect(createTransactionService.state.context).toEqual({});
    });
  });

  describe("context management", () => {
    test("should clear context when entering stepOne", () => {
      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      expect(createTransactionService.state.context.sender).toBeDefined();

      createTransactionService.send({
        type: "CREATE",
        amount: 100,
        description: "Test"
      });
      createTransactionService.send("RESET");

      expect(createTransactionService.state.context).toEqual({});
    });

    test("should set sender and receiver in context", () => {
      const sender = { id: "1", username: "alice", email: "alice@test.com" };
      const receiver = { id: "2", username: "bob", email: "bob@test.com" };

      createTransactionService.send({
        type: "SET_USERS",
        sender,
        receiver
      });

      expect(createTransactionService.state.context.sender).toEqual(sender);
      expect(createTransactionService.state.context.receiver).toEqual(receiver);
    });

    test("should set transaction details in context", () => {
      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      const transactionDetails = {
        type: "CREATE",
        amount: 250.50,
        description: "Payment for services",
        transactionType: "payment"
      };

      createTransactionService.send(transactionDetails);

      expect(createTransactionService.state.context.transactionDetails).toEqual(transactionDetails);
    });

    test("should preserve context across state transitions", () => {
      const sender = { id: "1", username: "sender" };
      const receiver = { id: "2", username: "receiver" };

      createTransactionService.send({
        type: "SET_USERS",
        sender,
        receiver
      });

      const transactionDetails = {
        type: "CREATE",
        amount: 100,
        description: "Test"
      };

      createTransactionService.send(transactionDetails);

      expect(createTransactionService.state.context.sender).toEqual(sender);
      expect(createTransactionService.state.context.receiver).toEqual(receiver);
      expect(createTransactionService.state.context.transactionDetails).toEqual(transactionDetails);
    });
  });

  describe("transactionDataMachine integration", () => {
    test("should invoke transactionDataMachine in stepTwo", () => {
      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      expect(createTransactionService.state.matches("stepTwo")).toBe(true);
      
      const childStates = createTransactionService.state.children;
      expect(Object.keys(childStates)).toContain("transactionDataMachine");
    });

    test("should handle CREATE event through transactionDataMachine", async () => {
      const mockResponse = {
        data: {
          id: "txn-123",
          amount: 100,
          description: "Test transaction",
          status: "pending"
        }
      };

      mockedHttpClient.post.mockResolvedValue(mockResponse);

      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      const transactionPayload = {
        type: "CREATE",
        amount: 100,
        description: "Test transaction",
        receiverId: "2"
      };

      createTransactionService.send(transactionPayload);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/transactions",
        {
          amount: 100,
          description: "Test transaction",
          receiverId: "2"
        }
      );
    });

    test("should refresh auth service after successful transaction creation", async () => {
      const mockResponse = { data: { id: "txn-123" } };
      mockedHttpClient.post.mockResolvedValue(mockResponse);

      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      createTransactionService.send({
        type: "CREATE",
        amount: 100,
        description: "Test transaction"
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedAuthService.send).toHaveBeenCalledWith("REFRESH");
    });

    test("should omit type from transaction payload", async () => {
      const mockResponse = { data: { id: "txn-123" } };
      mockedHttpClient.post.mockResolvedValue(mockResponse);

      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      const transactionPayload = {
        type: "CREATE",
        amount: 100,
        description: "Test transaction",
        receiverId: "2",
        extraField: "should be included"
      };

      createTransactionService.send(transactionPayload);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/transactions",
        {
          amount: 100,
          description: "Test transaction",
          receiverId: "2",
          extraField: "should be included"
        }
      );

      const callArgs = mockedHttpClient.post.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty("type");
    });

    test("should handle transaction creation errors", async () => {
      const mockError = new Error("Transaction failed");
      mockedHttpClient.post.mockRejectedValue(mockError);

      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      createTransactionService.send({
        type: "CREATE",
        amount: 100,
        description: "Test transaction"
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalled();
      expect(mockedAuthService.send).not.toHaveBeenCalled();
    });
  });

  describe("event handling", () => {
    test("should ignore invalid events in each state", () => {
      expect(createTransactionService.state.matches("stepOne")).toBe(true);
      
      createTransactionService.send("CREATE");
      expect(createTransactionService.state.matches("stepOne")).toBe(true);
      
      createTransactionService.send("RESET");
      expect(createTransactionService.state.matches("stepOne")).toBe(true);

      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      expect(createTransactionService.state.matches("stepTwo")).toBe(true);

      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "3", username: "other" },
        receiver: { id: "4", username: "another" }
      });
      expect(createTransactionService.state.matches("stepTwo")).toBe(true);
    });

    test("should handle autoForward in stepTwo", () => {
      createTransactionService.send({
        type: "SET_USERS",
        sender: { id: "1", username: "sender" },
        receiver: { id: "2", username: "receiver" }
      });

      expect(createTransactionService.state.matches("stepTwo")).toBe(true);

      const childMachine = createTransactionService.state.children.transactionDataMachine;
      expect(childMachine).toBeDefined();
    });
  });

  describe("machine configuration", () => {
    test("should have correct machine id", () => {
      expect(createTransactionMachine.id).toBe("createTransaction");
    });

    test("should have all required states", () => {
      const stateKeys = Object.keys(createTransactionMachine.states);
      expect(stateKeys).toContain("stepOne");
      expect(stateKeys).toContain("stepTwo");
      expect(stateKeys).toContain("stepThree");
    });

    test("should have all required actions", () => {
      const actions = createTransactionMachine.options?.actions;
      expect(actions).toBeDefined();
      expect(actions).toHaveProperty("setSenderAndReceiver");
      expect(actions).toHaveProperty("setTransactionDetails");
      expect(actions).toHaveProperty("clearContext");
    });

    test("should execute entry actions correctly", () => {
      expect(createTransactionService.state.context).toEqual({});

      const sender = { id: "1", username: "sender" };
      const receiver = { id: "2", username: "receiver" };

      createTransactionService.send({
        type: "SET_USERS",
        sender,
        receiver
      });

      expect(createTransactionService.state.context.sender).toEqual(sender);
      expect(createTransactionService.state.context.receiver).toEqual(receiver);

      const transactionDetails = {
        type: "CREATE",
        amount: 100,
        description: "Test"
      };

      createTransactionService.send(transactionDetails);

      expect(createTransactionService.state.context.transactionDetails).toEqual(transactionDetails);
    });
  });

  describe("complete transaction flow", () => {
    test("should handle full transaction creation workflow", async () => {
      const mockResponse = { data: { id: "txn-123", status: "completed" } };
      mockedHttpClient.post.mockResolvedValue(mockResponse);

      expect(createTransactionService.state.matches("stepOne")).toBe(true);

      const sender = { id: "1", username: "alice" };
      const receiver = { id: "2", username: "bob" };

      createTransactionService.send({
        type: "SET_USERS",
        sender,
        receiver
      });

      expect(createTransactionService.state.matches("stepTwo")).toBe(true);
      expect(createTransactionService.state.context.sender).toEqual(sender);
      expect(createTransactionService.state.context.receiver).toEqual(receiver);

      const transactionDetails = {
        type: "CREATE",
        amount: 150,
        description: "Payment for lunch",
        receiverId: "2"
      };

      createTransactionService.send(transactionDetails);

      expect(createTransactionService.state.matches("stepThree")).toBe(true);
      expect(createTransactionService.state.context.transactionDetails).toEqual(transactionDetails);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockedHttpClient.post).toHaveBeenCalledWith(
        "http://localhost:3001/transactions",
        {
          amount: 150,
          description: "Payment for lunch",
          receiverId: "2"
        }
      );

      expect(mockedAuthService.send).toHaveBeenCalledWith("REFRESH");

      createTransactionService.send("RESET");

      expect(createTransactionService.state.matches("stepOne")).toBe(true);
      expect(createTransactionService.state.context).toEqual({});
    });
  });
});
