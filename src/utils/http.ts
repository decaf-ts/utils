/* istanbul ignore file */
import https from "https";
import { Logging } from "@decaf-ts/logging";

/**
 * @description A simple HTTP client for downloading files.
 * @summary This class provides functionality to download files from HTTPS URLs.
 * It uses Node.js built-in https module to make requests.
 *
 * @class HttpClient
 */
export class HttpClient {
  protected static log = Logging.for(HttpClient);
  /**
   * @description Downloads a file from a given URL.
   * @summary This method sends a GET request to the specified URL and returns the response body as a string.
   * It handles different scenarios such as non-200 status codes and network errors.
   *
   * @param url - The URL of the file to download.
   * @return A promise that resolves with the file content as a string.
   *
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant HttpClient
   *   participant HTTPS
   *   participant Server
   *   Client->>HttpClient: downloadFile(url)
   *   HttpClient->>HTTPS: get(url)
   *   HTTPS->>Server: GET request
   *   Server-->>HTTPS: Response
   *   HTTPS-->>HttpClient: Response object
   *   alt Status code is 200
   *     loop For each data chunk
   *       HTTPS->>HttpClient: 'data' event
   *       HttpClient->>HttpClient: Accumulate data
   *     end
   *     HTTPS->>HttpClient: 'end' event
   *     HttpClient-->>Client: Resolve with data
   *   else Status code is not 200
   *     HttpClient-->>Client: Reject with error
   *   end
   */
  static async downloadFile(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      function request(url: string) {
        url = encodeURI(url);
        https.get(url, (res) => {
          if (res.statusCode === 301 || res.statusCode === 307)
            return request(res.headers.location as string);

          if (res.statusCode !== 200) {
            HttpClient.log.error(
              `Failed to fetch ${url} (status: ${res.statusCode})`
            );
            return reject(new Error(`Failed to fetch ${url}`));
          }
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("error", (error) => {
            reject(error);
          });

          res.on("end", () => {
            resolve(data);
          });
        });
      }
      request(url);
    });
  }
}
