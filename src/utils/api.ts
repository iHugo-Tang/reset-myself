const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getErrorMessage(json: unknown): string | null {
  if (!isRecord(json)) return null;

  const message = json.message;
  if (typeof message === 'string' && message.trim()) return message;

  const error = json.error;
  if (typeof error === 'string' && error.trim()) return error;

  return null;
}

