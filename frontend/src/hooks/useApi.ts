import { useCallback } from 'react';
import { useAuth } from './useAuth';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000';

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('No se pudo parsear la respuesta JSON', error);
    return text;
  }
}

export function useApi() {
  const { accessToken, refreshToken, setTokens, logout } = useAuth();

  const request = useCallback(
    async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
      const { skipAuth, headers, body, ...rest } = options;
      const requestInit: RequestInit = {
        ...rest,
        headers: {
          ...(headers ?? {}),
        },
      };

      if (body && typeof body === 'object' && !(body instanceof FormData)) {
        requestInit.headers = {
          'Content-Type': 'application/json',
          ...(requestInit.headers as Record<string, string>),
        };
        requestInit.body = JSON.stringify(body);
      } else if (body instanceof FormData) {
        requestInit.body = body;
        delete (requestInit.headers as Record<string, string>)['Content-Type'];
      } else if (typeof body === 'string') {
        requestInit.headers = {
          'Content-Type': 'application/json',
          ...(requestInit.headers as Record<string, string>),
        };
        requestInit.body = body;
      }

      const withToken = (token: string | null) => ({
        ...(requestInit.headers ?? {}),
        ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
      });

      let currentToken = accessToken;
      let response = await fetch(`${API_BASE_URL}${path}`, {
        ...requestInit,
        headers: withToken(currentToken),
      });

      if (response.status === 401 && !skipAuth && refreshToken) {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await parseResponse(refreshResponse);
          const newAccessToken = refreshData?.accessToken;
          if (typeof newAccessToken === 'string') {
            currentToken = newAccessToken;
            setTokens({ accessToken: newAccessToken });
            response = await fetch(`${API_BASE_URL}${path}`, {
              ...requestInit,
              headers: withToken(currentToken),
            });
          } else {
            logout();
            throw new Error('Sesión expirada');
          }
        } else {
          logout();
          throw new Error('Sesión expirada');
        }
      }

      if (!response.ok) {
        const errorPayload = await parseResponse(response);
        const message =
          typeof errorPayload?.message === 'string'
            ? errorPayload.message
            : Array.isArray(errorPayload?.message)
            ? errorPayload.message.join(', ')
            : response.statusText;
        throw new Error(message || 'Error inesperado en la API');
      }

      return parseResponse(response) as Promise<T>;
    },
    [accessToken, logout, refreshToken, setTokens],
  );

  const get = useCallback(
    <T>(path: string, init?: RequestOptions) => request<T>(path, { method: 'GET', ...(init ?? {}) }),
    [request],
  );

  const post = useCallback(
    <T>(path: string, body?: unknown, init?: RequestOptions) =>
      request<T>(path, { method: 'POST', body, ...(init ?? {}) }),
    [request],
  );

  const patch = useCallback(
    <T>(path: string, body?: unknown, init?: RequestOptions) =>
      request<T>(path, { method: 'PATCH', body, ...(init ?? {}) }),
    [request],
  );

  const put = useCallback(
    <T>(path: string, body?: unknown, init?: RequestOptions) =>
      request<T>(path, { method: 'PUT', body, ...(init ?? {}) }),
    [request],
  );

  const del = useCallback(
    <T>(path: string, init?: RequestOptions) => request<T>(path, { method: 'DELETE', ...(init ?? {}) }),
    [request],
  );

  return { request, get, post, patch, put, del };
}
