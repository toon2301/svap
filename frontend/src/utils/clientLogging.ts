type SafeErrorMeta = {
  status?: number;
  code?: string;
  name?: string;
};

export function isClientDebugLoggingEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';
}

export function toSafeErrorMeta(error: unknown): SafeErrorMeta {
  const err = error as
    | {
        name?: unknown;
        code?: unknown;
        response?: {
          status?: unknown;
          data?: {
            code?: unknown;
          };
        };
      }
    | undefined;

  const status = typeof err?.response?.status === 'number' ? err.response.status : undefined;
  const rawCode = err?.response?.data?.code ?? err?.code;
  const code = typeof rawCode === 'string' ? rawCode : undefined;
  const name = typeof err?.name === 'string' ? err.name : undefined;

  return { status, code, name };
}

export function logClientDebug(message: string, meta?: Record<string, unknown>): void {
  if (!isClientDebugLoggingEnabled()) return;
  console.debug(message, meta ?? '');
}

export function logClientWarn(message: string, meta?: Record<string, unknown>): void {
  if (!isClientDebugLoggingEnabled()) return;
  console.warn(message, meta ?? '');
}

export function logClientError(message: string, error?: unknown): void {
  if (!isClientDebugLoggingEnabled()) return;
  console.error(message, toSafeErrorMeta(error));
}
