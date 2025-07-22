import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { interpret } from "xstate";
import { dataMachine } from "../dataMachine";

describe("dataMachine", () => {
  let dataService: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    dataService?.stop();
  });

  describe("machine creation", () => {
    test("should create machine with provided id", () => {
      const machine = dataMachine("testMachine");
      expect(machine.id).toBe("testMachine");
    });

    test("should create machine with different ids", () => {
      const machine1 = dataMachine("users");
      const machine2 = dataMachine("transactions");
      
      expect(machine1.id).toBe("users");
      expect(machine2.id).toBe("transactions");
      expect(machine1.id).not.toBe(machine2.id);
    });

    test("should have correct initial state and context", () => {
      const machine = dataMachine("test");
      dataService = interpret(machine).start();

      expect(dataService.state.matches("idle")).toBe(true);
      expect(dataService.state.context).toEqual({
        pageData: {},
        results: [],
        message: undefined,
      });
    });
  });

  describe("state transitions from idle", () => {
    beforeEach(() => {
      const machine = dataMachine("test");
      dataService = interpret(machine).start();
    });

    test("should transition from idle to loading on FETCH", () => {
      dataService.send("FETCH");
      expect(dataService.state.matches("loading")).toBe(true);
    });

    test("should transition from idle to creating on CREATE", () => {
      dataService.send("CREATE");
      expect(dataService.state.matches("creating")).toBe(true);
    });

    test("should transition from idle to updating on UPDATE", () => {
      dataService.send("UPDATE");
      expect(dataService.state.matches("updating")).toBe(true);
    });

    test("should transition from idle to deleting on DELETE", () => {
      dataService.send("DELETE");
      expect(dataService.state.matches("deleting")).toBe(true);
    });

    test("should ignore invalid events in idle state", () => {
      dataService.send("INVALID_EVENT");
      expect(dataService.state.matches("idle")).toBe(true);
    });
  });

  describe("loading state", () => {
    beforeEach(() => {
      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockResolvedValue({ results: [], pageData: {} })
        }
      });
      dataService = interpret(machine).start();
    });

    test("should invoke fetchData service", () => {
      dataService.send("FETCH");
      expect(dataService.state.matches("loading")).toBe(true);
    });

    test("should transition to success on successful fetch", async () => {
      const mockData = {
        results: [{ id: 1, name: "test" }],
        pageData: { page: 1, total: 1 }
      };

      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockResolvedValue(mockData)
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("success")).toBe(true);
    });

    test("should transition to failure on fetch error", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockRejectedValue(new Error("Fetch failed"))
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("failure")).toBe(true);
    });
  });

  describe("creating state", () => {
    test("should transition to loading after successful create", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          createData: vi.fn().mockResolvedValue({ id: 1 }),
          fetchData: vi.fn().mockResolvedValue({ results: [], pageData: {} })
        }
      });
      dataService = interpret(machine).start();

      dataService.send("CREATE");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("loading")).toBe(true);
    });

    test("should transition to failure on create error", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          createData: vi.fn().mockRejectedValue(new Error("Create failed"))
        }
      });
      dataService = interpret(machine).start();

      dataService.send("CREATE");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("failure")).toBe(true);
    });
  });

  describe("updating state", () => {
    test("should transition to loading after successful update", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          updateData: vi.fn().mockResolvedValue({ id: 1 }),
          fetchData: vi.fn().mockResolvedValue({ results: [], pageData: {} })
        }
      });
      dataService = interpret(machine).start();

      dataService.send("UPDATE");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("loading")).toBe(true);
    });

    test("should transition to failure on update error", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          updateData: vi.fn().mockRejectedValue(new Error("Update failed"))
        }
      });
      dataService = interpret(machine).start();

      dataService.send("UPDATE");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("failure")).toBe(true);
    });
  });

  describe("deleting state", () => {
    test("should transition to loading after successful delete", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          deleteData: vi.fn().mockResolvedValue({ success: true }),
          fetchData: vi.fn().mockResolvedValue({ results: [], pageData: {} })
        }
      });
      dataService = interpret(machine).start();

      dataService.send("DELETE");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("loading")).toBe(true);
    });

    test("should transition to failure on delete error", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          deleteData: vi.fn().mockRejectedValue(new Error("Delete failed"))
        }
      });
      dataService = interpret(machine).start();

      dataService.send("DELETE");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("failure")).toBe(true);
    });
  });

  describe("success state", () => {
    test("should execute entry actions on success", async () => {
      const mockData = {
        results: [{ id: 1, name: "test" }],
        pageData: { page: 1, total: 1 }
      };

      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockResolvedValue(mockData)
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("success")).toBe(true);
      expect(dataService.state.context.results).toEqual(mockData.results);
      expect(dataService.state.context.pageData).toEqual(mockData.pageData);
    });

    test("should transition to withData when results exist", async () => {
      const mockData = {
        results: [{ id: 1, name: "test" }],
        pageData: { page: 1, total: 1 }
      };

      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockResolvedValue(mockData)
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("success.withData")).toBe(true);
    });

    test("should transition to withoutData when no results", async () => {
      const mockData = {
        results: [],
        pageData: { page: 1, total: 0 }
      };

      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockResolvedValue(mockData)
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("success.withoutData")).toBe(true);
    });

    test("should handle CRUD operations from success state", async () => {
      const mockData = {
        results: [{ id: 1, name: "test" }],
        pageData: { page: 1, total: 1 }
      };

      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockResolvedValue(mockData),
          createData: vi.fn().mockResolvedValue({ id: 2 }),
          updateData: vi.fn().mockResolvedValue({ id: 1 }),
          deleteData: vi.fn().mockResolvedValue({ success: true })
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("success")).toBe(true);

      dataService.send("FETCH");
      expect(dataService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      dataService.send("CREATE");
      expect(dataService.state.matches("creating")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));
      dataService.send("UPDATE");
      expect(dataService.state.matches("updating")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));
      dataService.send("DELETE");
      expect(dataService.state.matches("deleting")).toBe(true);
    });
  });

  describe("failure state", () => {
    test("should set error message on failure", async () => {
      const errorMessage = "Network error occurred";
      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockRejectedValue({ message: errorMessage })
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dataService.state.matches("failure")).toBe(true);
      expect(dataService.state.context.message).toBe(errorMessage);
    });

    test("should transition to loading on FETCH from failure", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockRejectedValue(new Error("Initial error"))
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("failure")).toBe(true);

      dataService.send("FETCH");
      expect(dataService.state.matches("loading")).toBe(true);
    });

    test("should ignore non-FETCH events in failure state", async () => {
      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: vi.fn().mockRejectedValue(new Error("Error"))
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("failure")).toBe(true);

      dataService.send("CREATE");
      expect(dataService.state.matches("failure")).toBe(true);

      dataService.send("UPDATE");
      expect(dataService.state.matches("failure")).toBe(true);

      dataService.send("DELETE");
      expect(dataService.state.matches("failure")).toBe(true);
    });
  });

  describe("actions", () => {
    describe("setResults", () => {
      test("should set results for first page", async () => {
        const mockData = {
          results: [{ id: 1 }, { id: 2 }],
          pageData: { page: 1, total: 2 }
        };

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: vi.fn().mockResolvedValue(mockData)
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(dataService.state.context.results).toEqual(mockData.results);
      });

      test("should concatenate results for subsequent pages", async () => {
        const initialData = {
          results: [{ id: 1 }, { id: 2 }],
          pageData: { page: 1, total: 4 }
        };

        const secondPageData = {
          results: [{ id: 3 }, { id: 4 }],
          pageData: { page: 2, total: 4 }
        };

        const fetchDataMock = vi.fn()
          .mockResolvedValueOnce(initialData)
          .mockResolvedValueOnce(secondPageData);

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: fetchDataMock
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(dataService.state.context.results).toEqual(initialData.results);

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(dataService.state.context.results).toEqual([
          ...initialData.results,
          ...secondPageData.results
        ]);
      });

      test("should replace results when page is 1 or undefined", async () => {
        const initialData = {
          results: [{ id: 1 }, { id: 2 }],
          pageData: { page: 1, total: 2 }
        };

        const newData = {
          results: [{ id: 3 }, { id: 4 }],
          pageData: { page: 1, total: 2 }
        };

        const fetchDataMock = vi.fn()
          .mockResolvedValueOnce(initialData)
          .mockResolvedValueOnce(newData);

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: fetchDataMock
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(dataService.state.context.results).toEqual(initialData.results);

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(dataService.state.context.results).toEqual(newData.results);
      });

      test("should handle missing pageData", async () => {
        const mockData = {
          results: [{ id: 1 }],
          pageData: undefined
        };

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: vi.fn().mockResolvedValue(mockData)
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(dataService.state.context.results).toEqual(mockData.results);
      });
    });

    describe("setPageData", () => {
      test("should set pageData from event", async () => {
        const mockData = {
          results: [{ id: 1 }],
          pageData: { page: 1, total: 10, hasNext: true }
        };

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: vi.fn().mockResolvedValue(mockData)
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(dataService.state.context.pageData).toEqual(mockData.pageData);
      });

      test("should handle undefined pageData", async () => {
        const mockData = {
          results: [{ id: 1 }],
          pageData: undefined
        };

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: vi.fn().mockResolvedValue(mockData)
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(dataService.state.context.pageData).toBeUndefined();
      });
    });

    describe("setMessage", () => {
      test("should set error message on failure", async () => {
        const errorMessage = "Something went wrong";
        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: vi.fn().mockRejectedValue({ message: errorMessage })
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(dataService.state.context.message).toBe(errorMessage);
      });
    });
  });

  describe("guards", () => {
    describe("hasData", () => {
      test("should return true when results exist and have length > 0", async () => {
        const mockData = {
          results: [{ id: 1 }, { id: 2 }],
          pageData: { page: 1, total: 2 }
        };

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: vi.fn().mockResolvedValue(mockData)
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(dataService.state.matches("success.withData")).toBe(true);
      });

      test("should return false when results is empty array", async () => {
        const mockData = {
          results: [],
          pageData: { page: 1, total: 0 }
        };

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: vi.fn().mockResolvedValue(mockData)
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(dataService.state.matches("success.withoutData")).toBe(true);
      });

      test("should return false when results is undefined", async () => {
        const mockData = {
          results: undefined,
          pageData: { page: 1, total: 0 }
        };

        const machine = dataMachine("test").withConfig({
          services: {
            fetchData: vi.fn().mockResolvedValue(mockData)
          }
        });
        dataService = interpret(machine).start();

        dataService.send("FETCH");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(dataService.state.matches("success.withoutData")).toBe(true);
      });
    });
  });

  describe("machine configuration", () => {
    test("should have all required states", () => {
      const machine = dataMachine("test");
      const stateKeys = Object.keys(machine.states);

      expect(stateKeys).toContain("idle");
      expect(stateKeys).toContain("loading");
      expect(stateKeys).toContain("updating");
      expect(stateKeys).toContain("creating");
      expect(stateKeys).toContain("deleting");
      expect(stateKeys).toContain("success");
      expect(stateKeys).toContain("failure");
    });

    test("should have nested success states", () => {
      const machine = dataMachine("test");
      const successStates = machine.states.success.states;

      expect(Object.keys(successStates)).toContain("unknown");
      expect(Object.keys(successStates)).toContain("withData");
      expect(Object.keys(successStates)).toContain("withoutData");
    });

    test("should have all required actions", () => {
      const machine = dataMachine("test");
      const actions = machine.options?.actions;

      expect(actions).toBeDefined();
      expect(actions).toHaveProperty("setResults");
      expect(actions).toHaveProperty("setPageData");
      expect(actions).toHaveProperty("setMessage");
    });

    test("should have all required guards", () => {
      const machine = dataMachine("test");
      const guards = machine.options?.guards;

      expect(guards).toBeDefined();
      expect(guards).toHaveProperty("hasData");
    });

    test("should have correct initial state", () => {
      const machine = dataMachine("test");
      expect(machine.initial).toBe("idle");
    });

    test("should have correct success initial state", () => {
      const machine = dataMachine("test");
      expect(machine.states.success.initial).toBe("unknown");
    });
  });

  describe("complete workflows", () => {
    test("should handle successful CRUD workflow", async () => {
      const mockServices = {
        fetchData: vi.fn().mockResolvedValue({
          results: [{ id: 1, name: "test" }],
          pageData: { page: 1, total: 1 }
        }),
        createData: vi.fn().mockResolvedValue({ id: 2, name: "new" }),
        updateData: vi.fn().mockResolvedValue({ id: 1, name: "updated" }),
        deleteData: vi.fn().mockResolvedValue({ success: true })
      };

      const machine = dataMachine("test").withConfig({
        services: mockServices
      });
      dataService = interpret(machine).start();

      expect(dataService.state.matches("idle")).toBe(true);

      dataService.send("FETCH");
      expect(dataService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("success.withData")).toBe(true);

      dataService.send("CREATE");
      expect(dataService.state.matches("creating")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("success.withData")).toBe(true);

      dataService.send("UPDATE");
      expect(dataService.state.matches("updating")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("success.withData")).toBe(true);

      dataService.send("DELETE");
      expect(dataService.state.matches("deleting")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("loading")).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("success.withData")).toBe(true);

      expect(mockServices.fetchData).toHaveBeenCalledTimes(4); // Initial + after each operation
      expect(mockServices.createData).toHaveBeenCalledTimes(1);
      expect(mockServices.updateData).toHaveBeenCalledTimes(1);
      expect(mockServices.deleteData).toHaveBeenCalledTimes(1);
    });

    test("should handle error recovery workflow", async () => {
      const fetchDataMock = vi.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          results: [{ id: 1 }],
          pageData: { page: 1, total: 1 }
        });

      const machine = dataMachine("test").withConfig({
        services: {
          fetchData: fetchDataMock
        }
      });
      dataService = interpret(machine).start();

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("failure")).toBe(true);

      dataService.send("FETCH");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(dataService.state.matches("success.withData")).toBe(true);

      expect(fetchDataMock).toHaveBeenCalledTimes(2);
    });
  });
});
