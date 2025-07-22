import { describe, expect, test, vi } from "vitest";
import { history } from "../historyUtils";
import { createBrowserHistory } from "history";

const mockHistoryInstance = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  goBack: vi.fn(),
  goForward: vi.fn(),
  listen: vi.fn(),
  location: { pathname: "/", search: "", hash: "", state: null },
  length: 1,
  action: "POP",
  block: vi.fn(),
  createHref: vi.fn(),
};

vi.mock("history", () => ({
  createBrowserHistory: vi.fn(() => mockHistoryInstance),
}));
const mockedCreateBrowserHistory = vi.mocked(createBrowserHistory);

describe("historyUtils", () => {
  test("should export history instance created by createBrowserHistory", () => {
    expect(mockedCreateBrowserHistory).toHaveBeenCalled();
    expect(history).toBeDefined();
  });

  test("should create browser history without any arguments", () => {
    expect(mockedCreateBrowserHistory).toHaveBeenCalledWith();
  });

  test("should export the same history instance", async () => {
    const newMockInstance = {
      push: vi.fn(),
      replace: vi.fn(),
      go: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      listen: vi.fn(),
      location: { pathname: "/test", search: "", hash: "", state: null },
      length: 1,
      action: "POP",
      block: vi.fn(),
      createHref: vi.fn(),
    };
    mockedCreateBrowserHistory.mockReturnValue(newMockInstance as any);
    
    vi.resetModules();
    const { history: reimportedHistory } = await import("../historyUtils");
    
    expect(reimportedHistory).toBe(newMockInstance);
  });
});
