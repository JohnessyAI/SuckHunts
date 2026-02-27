/**
 * Wrapper around fetch that auto-injects x-owner-id header for mods.
 * Use this for all authenticated API calls from the frontend.
 */
export function apiFetch(
  url: string,
  init?: RequestInit,
  selectedOwnerId?: string | null
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (selectedOwnerId) {
    headers.set("x-owner-id", selectedOwnerId);
  }
  return fetch(url, { ...init, headers });
}
