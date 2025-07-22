import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { interpret } from "xstate";
import { snackbarMachine, Severities, SnackbarContext, SnackbarEvents } from "../snackbarMachine";

describe("snackbarMachine", () => {
  let snackbarService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    snackbarService = interpret(snackbarMachine).start();
  });

  afterEach(() => {
    snackbarService?.stop();
  });

  describe("initial state", () => {
    test("should start in invisible state", () => {
      expect(snackbarService.state.matches("invisible")).toBe(true);
    });

    test("should have undefined severity and message in initial context", () => {
      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBeUndefined();
    });

    test("should have correct machine id", () => {
      expect(snackbarMachine.id).toBe("snackbar");
    });

    test("should have correct initial state configuration", () => {
      expect(snackbarMachine.initial).toBe("invisible");
    });
  });

  describe("state transitions", () => {
    test("should transition from invisible to visible on SHOW event", () => {
      expect(snackbarService.state.matches("invisible")).toBe(true);

      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);
    });

    test("should transition from visible to invisible on HIDE event", () => {
      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      snackbarService.send("HIDE");
      expect(snackbarService.state.matches("invisible")).toBe(true);
    });

    test("should ignore HIDE event when in invisible state", () => {
      expect(snackbarService.state.matches("invisible")).toBe(true);

      snackbarService.send("HIDE");
      expect(snackbarService.state.matches("invisible")).toBe(true);
    });

    test("should ignore SHOW event when in visible state", () => {
      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);
    });

    test("should handle multiple transitions correctly", () => {
      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      snackbarService.send("HIDE");
      expect(snackbarService.state.matches("invisible")).toBe(true);

      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);
    });
  });

  describe("automatic timeout", () => {
    test("should automatically transition from visible to invisible after 3 seconds", async () => {
      vi.useFakeTimers();

      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      vi.advanceTimersByTime(3000);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(snackbarService.state.matches("invisible")).toBe(true);

      vi.useRealTimers();
    });

    test("should not timeout if manually hidden before 3 seconds", async () => {
      vi.useFakeTimers();

      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      vi.advanceTimersByTime(1000);
      snackbarService.send("HIDE");
      expect(snackbarService.state.matches("invisible")).toBe(true);

      vi.advanceTimersByTime(3000);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(snackbarService.state.matches("invisible")).toBe(true);

      vi.useRealTimers();
    });

    test("should reset timeout on new SHOW event", async () => {
      vi.useFakeTimers();

      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(snackbarService.state.matches("visible")).toBe(true);

      snackbarService.send("HIDE");
      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(snackbarService.state.matches("visible")).toBe(true);

      vi.advanceTimersByTime(1000);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(snackbarService.state.matches("invisible")).toBe(true);

      vi.useRealTimers();
    });
  });

  describe("context management", () => {
    test("should set severity and message on SHOW event", () => {
      const showEvent = {
        type: "SHOW" as const,
        severity: Severities.success,
        message: "Operation completed successfully"
      };

      snackbarService.send(showEvent);

      expect(snackbarService.state.context.severity).toBe(Severities.success);
      expect(snackbarService.state.context.message).toBe("Operation completed successfully");
    });

    test("should reset severity and message when transitioning to invisible", () => {
      const showEvent = {
        type: "SHOW" as const,
        severity: Severities.error,
        message: "An error occurred"
      };

      snackbarService.send(showEvent);
      expect(snackbarService.state.context.severity).toBe(Severities.error);
      expect(snackbarService.state.context.message).toBe("An error occurred");

      snackbarService.send("HIDE");
      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBeUndefined();
    });

    test("should reset context on automatic timeout", async () => {
      vi.useFakeTimers();

      const showEvent = {
        type: "SHOW" as const,
        severity: Severities.warning,
        message: "Warning message"
      };

      snackbarService.send(showEvent);
      expect(snackbarService.state.context.severity).toBe(Severities.warning);
      expect(snackbarService.state.context.message).toBe("Warning message");

      vi.advanceTimersByTime(3000);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBeUndefined();

      vi.useRealTimers();
    });

    test("should handle SHOW event without severity or message", () => {
      snackbarService.send("SHOW");

      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBeUndefined();
      expect(snackbarService.state.matches("visible")).toBe(true);
    });

    test("should handle partial context updates", () => {
      const showEventWithOnlySeverity = {
        type: "SHOW" as const,
        severity: Severities.info
      };

      snackbarService.send(showEventWithOnlySeverity);

      expect(snackbarService.state.context.severity).toBe(Severities.info);
      expect(snackbarService.state.context.message).toBeUndefined();
    });

    test("should handle context updates with only message", () => {
      const showEventWithOnlyMessage = {
        type: "SHOW" as const,
        message: "Just a message"
      };

      snackbarService.send(showEventWithOnlyMessage);

      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBe("Just a message");
    });
  });

  describe("Severities enum", () => {
    test("should have all expected severity values", () => {
      expect(Severities.success).toBe("success");
      expect(Severities.info).toBe("info");
      expect(Severities.warning).toBe("warning");
      expect(Severities.error).toBe("error");
    });

    test("should work with all severity types", () => {
      const severityTests = [
        { severity: Severities.success, expected: "success" },
        { severity: Severities.info, expected: "info" },
        { severity: Severities.warning, expected: "warning" },
        { severity: Severities.error, expected: "error" }
      ];

      severityTests.forEach(({ severity, expected }) => {
        snackbarService.send({
          type: "SHOW",
          severity,
          message: `Test ${expected} message`
        });

        expect(snackbarService.state.context.severity).toBe(expected);
        expect(snackbarService.state.context.message).toBe(`Test ${expected} message`);

        snackbarService.send("HIDE");
      });
    });
  });

  describe("actions", () => {
    test("should execute setSnackbar action on entering visible state", () => {
      const showEvent = {
        type: "SHOW" as const,
        severity: Severities.success,
        message: "Success message"
      };

      snackbarService.send(showEvent);

      expect(snackbarService.state.context.severity).toBe(Severities.success);
      expect(snackbarService.state.context.message).toBe("Success message");
    });

    test("should execute resetSnackbar action on entering invisible state", () => {
      snackbarService.send({
        type: "SHOW",
        severity: Severities.error,
        message: "Error message"
      });

      expect(snackbarService.state.context.severity).toBe(Severities.error);
      expect(snackbarService.state.context.message).toBe("Error message");

      snackbarService.send("HIDE");

      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBeUndefined();
    });

    test("should execute resetSnackbar action on initial entry to invisible state", () => {
      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBeUndefined();
    });
  });

  describe("machine configuration", () => {
    test("should have correct state definitions", () => {
      const stateKeys = Object.keys(snackbarMachine.states);
      expect(stateKeys).toContain("invisible");
      expect(stateKeys).toContain("visible");
      expect(stateKeys).toHaveLength(2);
    });

    test("should have correct actions defined", () => {
      const actions = snackbarMachine.options?.actions;
      expect(actions).toBeDefined();
      expect(actions).toHaveProperty("setSnackbar");
      expect(actions).toHaveProperty("resetSnackbar");
    });

    test("should have correct invisible state configuration", () => {
      const invisibleState = snackbarMachine.states.invisible;
      expect(invisibleState.on).toHaveProperty("SHOW");
      expect(invisibleState.on?.SHOW).toBe("visible");
    });

    test("should have correct visible state configuration", () => {
      const visibleState = snackbarMachine.states.visible;
      expect(visibleState.on).toHaveProperty("HIDE");
      expect(visibleState.on?.HIDE).toBe("invisible");
      expect(visibleState.after).toHaveProperty("3000");
      expect(visibleState.after?.[3000]).toBe("invisible");
    });

    test("should have correct context type structure", () => {
      const initialContext = snackbarMachine.context;
      expect(initialContext).toHaveProperty("severity");
      expect(initialContext).toHaveProperty("message");
      expect(initialContext.severity).toBeUndefined();
      expect(initialContext.message).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    test("should handle rapid SHOW/HIDE transitions", () => {
      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      snackbarService.send("HIDE");
      expect(snackbarService.state.matches("invisible")).toBe(true);

      snackbarService.send("SHOW");
      expect(snackbarService.state.matches("visible")).toBe(true);

      snackbarService.send("HIDE");
      expect(snackbarService.state.matches("invisible")).toBe(true);
    });

    test("should handle empty string values", () => {
      snackbarService.send({
        type: "SHOW",
        severity: Severities.info,
        message: ""
      });

      expect(snackbarService.state.context.severity).toBe(Severities.info);
      expect(snackbarService.state.context.message).toBe("");
    });

    test("should handle very long messages", () => {
      const longMessage = "A".repeat(1000);
      
      snackbarService.send({
        type: "SHOW",
        severity: Severities.warning,
        message: longMessage
      });

      expect(snackbarService.state.context.message).toBe(longMessage);
    });

    test("should handle special characters in message", () => {
      const specialMessage = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      
      snackbarService.send({
        type: "SHOW",
        severity: Severities.error,
        message: specialMessage
      });

      expect(snackbarService.state.context.message).toBe(specialMessage);
    });

    test("should handle unicode characters in message", () => {
      const unicodeMessage = "Unicode: 🎉 ✅ ❌ ⚠️ 中文 العربية";
      
      snackbarService.send({
        type: "SHOW",
        severity: Severities.success,
        message: unicodeMessage
      });

      expect(snackbarService.state.context.message).toBe(unicodeMessage);
    });
  });

  describe("complete workflows", () => {
    test("should handle complete success notification workflow", async () => {
      vi.useFakeTimers();

      snackbarService.send({
        type: "SHOW",
        severity: Severities.success,
        message: "Data saved successfully"
      });

      expect(snackbarService.state.matches("visible")).toBe(true);
      expect(snackbarService.state.context.severity).toBe(Severities.success);
      expect(snackbarService.state.context.message).toBe("Data saved successfully");

      vi.advanceTimersByTime(3000);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(snackbarService.state.matches("invisible")).toBe(true);
      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBeUndefined();

      vi.useRealTimers();
    });

    test("should handle error notification with manual dismissal", () => {
      snackbarService.send({
        type: "SHOW",
        severity: Severities.error,
        message: "Failed to save data"
      });

      expect(snackbarService.state.matches("visible")).toBe(true);
      expect(snackbarService.state.context.severity).toBe(Severities.error);
      expect(snackbarService.state.context.message).toBe("Failed to save data");

      snackbarService.send("HIDE");

      expect(snackbarService.state.matches("invisible")).toBe(true);
      expect(snackbarService.state.context.severity).toBeUndefined();
      expect(snackbarService.state.context.message).toBeUndefined();
    });

    test("should handle sequential notifications", async () => {
      vi.useFakeTimers();

      snackbarService.send({
        type: "SHOW",
        severity: Severities.info,
        message: "Loading data..."
      });

      expect(snackbarService.state.context.message).toBe("Loading data...");

      snackbarService.send("HIDE");

      snackbarService.send({
        type: "SHOW",
        severity: Severities.success,
        message: "Data loaded successfully"
      });

      expect(snackbarService.state.context.severity).toBe(Severities.success);
      expect(snackbarService.state.context.message).toBe("Data loaded successfully");

      vi.advanceTimersByTime(3000);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(snackbarService.state.matches("invisible")).toBe(true);

      vi.useRealTimers();
    });

    test("should handle notification replacement workflow", () => {
      snackbarService.send({
        type: "SHOW",
        severity: Severities.warning,
        message: "First message"
      });

      expect(snackbarService.state.context.message).toBe("First message");

      snackbarService.send("HIDE");
      snackbarService.send({
        type: "SHOW",
        severity: Severities.error,
        message: "Second message"
      });

      expect(snackbarService.state.context.severity).toBe(Severities.error);
      expect(snackbarService.state.context.message).toBe("Second message");
    });
  });
});
