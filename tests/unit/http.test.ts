import { HttpClient } from "../../src/utils/http";
import https from "https";
import { EventEmitter } from "events";

jest.mock("https");

describe("HttpClient", () => {
  it("should download file successfully", async () => {
    const mockResponse = new EventEmitter() as any;
    mockResponse.statusCode = 200;
    (https.get as jest.Mock).mockImplementation((url, callback) => {
      callback(mockResponse);
      mockResponse.emit("data", "file content");
      mockResponse.emit("end");
      return { on: jest.fn() };
    });

    const result = await HttpClient.downloadFile("http://example.com/file");
    expect(result).toBe("file content");
  });

  it("should handle redirects", async () => {
    const mockResponseRedirect = new EventEmitter() as any;
    mockResponseRedirect.statusCode = 301;
    mockResponseRedirect.headers = { location: "http://example.com/new" };

    const mockResponseSuccess = new EventEmitter() as any;
    mockResponseSuccess.statusCode = 200;

    (https.get as jest.Mock)
      .mockImplementationOnce((url, callback) => {
        callback(mockResponseRedirect);
        return { on: jest.fn() };
      })
      .mockImplementationOnce((url, callback) => {
        callback(mockResponseSuccess);
        mockResponseSuccess.emit("data", "redirected content");
        mockResponseSuccess.emit("end");
        return { on: jest.fn() };
      });

    const result = await HttpClient.downloadFile("http://example.com/old");
    expect(result).toBe("redirected content");
  });

  it("should reject on error status code", async () => {
    const mockResponse = new EventEmitter() as any;
    mockResponse.statusCode = 404;
    (https.get as jest.Mock).mockImplementation((url, callback) => {
      callback(mockResponse);
      return { on: jest.fn() };
    });

    await expect(
      HttpClient.downloadFile("http://example.com/404")
    ).rejects.toThrow("Failed to fetch");
  });

  it("should reject on network error", async () => {
    const mockReq = new EventEmitter();
    (https.get as jest.Mock).mockImplementation((url, callback) => {
        // simulate error immediately on request object if possible, 
        // but https.get returns a ClientRequest. 
        // The callback receives IncomingMessage.
        // Errors usually happen on the request object or response object.
        // Here we simulate response error for simplicity if the implementation handles it,
        // OR we simulate the request returning an object that emits error.
        
        // Looking at implementation:
        // res.on("error", (error) => { reject(error); });
        // So we need to trigger error on response object.
        const res = new EventEmitter();
        (res as any).statusCode = 200;
        callback(res);
        res.emit('error', new Error('Network error'));
        return mockReq;
    });

    await expect(
      HttpClient.downloadFile("http://example.com/error")
    ).rejects.toThrow("Network error");
  });
});
