import { auth } from './firebase';

/**
 * Returns request headers populated with the Firebase ID Bearer token if the user is authenticated.
 */
export async function getAuthHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.warn('[apiClient] Failed to acquire Firebase Auth ID token:', error);
  }

  return headers;
}

/**
 * Enhanced fetch wrapper that automatically injects the Firebase Authorization Bearer token.
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const customHeaders = (init.headers as Record<string, string>) || {};
  const authHeaders = await getAuthHeaders(customHeaders);

  return fetch(url, {
    ...init,
    headers: authHeaders
  });
}
