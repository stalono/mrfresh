export function safely<T>(fn: () => T): T | null;
export function safely<T>(fn: () => Promise<T>): Promise<T | null>;
export function safely<T>(fn: () => T | Promise<T>): T | Promise<T | null> {
  try {
    const result = fn();
    return result instanceof Promise
      ? result.then(res => res).catch(() => null)
      : result;
  } catch {
    return null as T;
  }
}