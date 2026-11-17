import { PaperbackInterceptor, type Request, type Response } from "@paperback/types";
import { readSettings } from "./config";

/** Adds the user's Komga credentials to requests aimed at their own server. */
export class AuthInterceptor extends PaperbackInterceptor {
  override async interceptRequest(request: Request): Promise<Request> {
    const s = readSettings();
    if (!s.linkLibrary || !s.serverUrl || !request.url.toLowerCase().startsWith(s.serverUrl.toLowerCase())) {
      return request;
    }
    const headers = { ...(request.headers ?? {}) };
    if (s.useApiKey && s.apiKey) {
      headers["X-API-Key"] = s.apiKey;
    } else if (!s.useApiKey && s.username) {
      headers["Authorization"] = `Basic ${Application.base64Encode(`${s.username}:${s.password}`) as string}`;
    }
    return { ...request, headers };
  }

  override async interceptResponse(
    request: Request,
    response: Response,
    data: ArrayBuffer,
  ): Promise<ArrayBuffer> {
    void request;
    void response;
    return data;
  }
}

export async function httpGetJson(url: string): Promise<unknown> {
  const [response, data] = await Application.scheduleRequest({
    url,
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(response.status === 401 || response.status === 403 ? "Brak autoryzacji (HTTP " + response.status + ")" : `HTTP ${response.status}`);
  }
  return JSON.parse(Application.arrayBufferToUTF8String(data));
}
