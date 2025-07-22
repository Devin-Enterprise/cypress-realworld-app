import { describe, expect, test, beforeEach, vi } from "vitest";
import { frontendPort, backendPort, getBackendPort } from "../portUtils";
import detect from "detect-port";
import chalk from "chalk";

vi.mock("detect-port");
vi.mock("chalk", () => ({
  default: {
    green: vi.fn().mockImplementation((text) => text),
    red: vi.fn().mockImplementation((text) => text),
  },
}));

const mockedDetect = vi.mocked(detect);
const mockedChalk = chalk as any;

describe("portUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("exported constants", () => {
    test("should export frontendPort from process.env.PORT", () => {
      expect(frontendPort).toBe(process.env.PORT);
    });

    test("should export backendPort from process.env.VITE_BACKEND_PORT", () => {
      expect(backendPort).toBe(process.env.VITE_BACKEND_PORT);
    });
  });

  describe("getBackendPort", () => {
    test("should return backend port when port is available", async () => {
      const expectedPort = 3001;
      process.env.VITE_BACKEND_PORT = expectedPort.toString();
      mockedDetect.mockResolvedValue(expectedPort);

      const result = await getBackendPort();

      expect(mockedDetect).toHaveBeenCalledWith(expectedPort);
      expect(mockedChalk.green).toHaveBeenCalledWith(
        `Backend server running at http://localhost:${expectedPort}`
      );
      expect(console.log).toHaveBeenCalledWith(
        `Backend server running at http://localhost:${expectedPort}`
      );
      expect(result).toBe(expectedPort);
    });

    test("should return alternative port when backend port is not available", async () => {
      const backendPortNum = 3001;
      const alternativePort = 3002;
      process.env.VITE_BACKEND_PORT = backendPortNum.toString();
      mockedDetect.mockResolvedValue(alternativePort);

      const result = await getBackendPort();

      expect(mockedDetect).toHaveBeenCalledWith(backendPortNum);
      expect(mockedChalk.red).toHaveBeenCalledWith(
        `Failed to start the backend server on port ${backendPortNum}. \n Starting the backend server on port ${alternativePort}. \n Please update VITE_BACKEND_PORT in the .env file and 'apiUrl' in cypress.json to ${alternativePort}.`
      );
      expect(console.log).toHaveBeenCalledWith(
        `Failed to start the backend server on port ${backendPortNum}. \n Starting the backend server on port ${alternativePort}. \n Please update VITE_BACKEND_PORT in the .env file and 'apiUrl' in cypress.json to ${alternativePort}.`
      );
      expect(result).toBe(alternativePort);
    });

    test("should handle detect-port errors and log them", async () => {
      const backendPortNum = 3001;
      const error = new Error("Port detection failed");
      process.env.VITE_BACKEND_PORT = backendPortNum.toString();
      mockedDetect.mockRejectedValue(error);

      const result = await getBackendPort();

      expect(mockedDetect).toHaveBeenCalledWith(backendPortNum);
      expect(mockedChalk.red).toHaveBeenCalledWith(error);
      expect(console.log).toHaveBeenCalledWith(error);
      expect(result).toBeUndefined();
    });

    test("should handle string backend port conversion to number", async () => {
      const backendPortString = "3001";
      const expectedPort = 3001;
      process.env.VITE_BACKEND_PORT = backendPortString;
      mockedDetect.mockResolvedValue(expectedPort);

      await getBackendPort();

      expect(mockedDetect).toHaveBeenCalledWith(expectedPort);
    });

    test("should handle undefined backend port", async () => {
      const originalPort = process.env.VITE_BACKEND_PORT;
      delete process.env.VITE_BACKEND_PORT;
      mockedDetect.mockResolvedValue(3000);

      const result = await getBackendPort();

      expect(mockedDetect).toHaveBeenCalledWith(NaN);
      expect(result).toBe(3000);
      
      if (originalPort) {
        process.env.VITE_BACKEND_PORT = originalPort;
      }
    });

    test("should handle non-numeric backend port", async () => {
      const originalPort = process.env.VITE_BACKEND_PORT;
      process.env.VITE_BACKEND_PORT = "invalid";
      mockedDetect.mockResolvedValue(3000);

      const result = await getBackendPort();

      expect(mockedDetect).toHaveBeenCalledWith(NaN);
      expect(result).toBe(3000);
      
      if (originalPort) {
        process.env.VITE_BACKEND_PORT = originalPort;
      } else {
        delete process.env.VITE_BACKEND_PORT;
      }
    });
  });
});
