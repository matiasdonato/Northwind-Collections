const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con la API. ¿Está levantado el backend?');
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body: { message?: string | string[] } = await response.json();
      if (Array.isArray(body.message)) message = body.message.join('. ');
      else if (body.message) message = body.message;
    } catch {
      // sin cuerpo JSON: se conserva el mensaje genérico
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}
