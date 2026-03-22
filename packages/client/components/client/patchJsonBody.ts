/**
 * stoat-api's req() only JSON-encodes a body when the path matches its OpenAPI route map.
 * Custom /safety/* admin routes are unlisted, so api.patch() sends "{}" and the server returns 422.
 */
export async function patchJsonBody(
  api: { config: { baseURL: string; headers: Record<string, string> } },
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const { baseURL, headers } = api.config;
  const url = `${baseURL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }
  if (res.status === 204 || !text) return null;
  return JSON.parse(text) as unknown;
}
