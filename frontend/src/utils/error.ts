const GLOBAL_ERROR_FLAG = Symbol('mia.globalMessageHandled');

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const markErrorHandled = (error: unknown) => {
  if (!isObjectLike(error)) return;
  Object.defineProperty(error, GLOBAL_ERROR_FLAG, {
    value: true,
    enumerable: false,
    configurable: true,
  });
};

export const isErrorHandled = (error: unknown) =>
  isObjectLike(error) && Boolean((error as Record<symbol, unknown>)[GLOBAL_ERROR_FLAG]);

export const extractServerMessage = (payload: unknown): string | undefined => {
  if (!isObjectLike(payload)) return undefined;
  if (typeof payload.message === 'string') return payload.message;
  if (typeof payload.error === 'string') return payload.error;
  return undefined;
};
