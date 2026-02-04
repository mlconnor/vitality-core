/**
 * API Client
 * 
 * Simple fetch-based API client for tRPC backend.
 * This gives us working API calls while we sort out type sharing.
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

type ApiOptions = {
  token?: string | null;
};

/**
 * Call a tRPC query (GET)
 */
export async function trpcQuery<T = any>(
  procedure: string,
  input?: Record<string, any>,
  options: ApiOptions = {}
): Promise<T> {
  const url = new URL(`${API_URL}/trpc/${procedure}`);
  if (input) {
    url.searchParams.set('input', JSON.stringify({ json: input }));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(url.toString(), { headers });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'API Error');
  }

  return data.result?.data?.json;
}

/**
 * Call a tRPC mutation (POST)
 */
export async function trpcMutation<T = any>(
  procedure: string,
  input: Record<string, any>,
  options: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}/trpc/${procedure}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ json: input }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'API Error');
  }

  return data.result?.data?.json;
}

/**
 * React Query key generator for tRPC procedures
 */
export function queryKey(procedure: string, input?: any) {
  return [procedure, input];
}

