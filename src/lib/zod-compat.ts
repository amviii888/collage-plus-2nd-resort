import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toNestErrors } from '@hookform/resolvers';

/**
 * Polyfill for Zod 4+ to maintain full backward compatibility with @hookform/resolvers/zod.
 * 
 * In Zod 4+, validation errors are provided via `error.issues` instead of `error.errors`.
 * @hookform/resolvers/zod specifically checks `Array.isArray(error?.errors)`.
 * When this check fails, @hookform/resolvers re-throws the raw ZodError instead of returning
 * form validation errors to React Hook Form, causing uncaught exceptions.
 * 
 * This polyfill dynamically maps `ZodError.prototype.errors` to `this.issues`.
 */
try {
  const dummy = z.string().safeParse(123);
  if (!dummy.success && dummy.error) {
    const proto = Object.getPrototypeOf(dummy.error);
    if (proto && !Object.prototype.hasOwnProperty.call(proto, 'errors')) {
      Object.defineProperty(proto, 'errors', {
        get() {
          return this.issues;
        },
        configurable: true,
        enumerable: false,
      });
    }
  }

  // Also define on z.ZodError prototype if accessible
  if ((z as any).ZodError && (z as any).ZodError.prototype) {
    if (!Object.prototype.hasOwnProperty.call((z as any).ZodError.prototype, 'errors')) {
      Object.defineProperty((z as any).ZodError.prototype, 'errors', {
        get() {
          return this.issues;
        },
        configurable: true,
        enumerable: false,
      });
    }
  }
} catch {
  // Silent fallback
}

/**
 * A failsafe wrapper around zodResolver that catches any unhandled ZodError
 * re-thrown by @hookform/resolvers and converts it to nested form errors.
 */
export function safeZodResolver<T extends z.ZodTypeAny>(schema: T) {
  const base = zodResolver(schema);
  return async (values: any, context: any, options: any) => {
    try {
      return await base(values, context, options);
    } catch (err: any) {
      if (err && (err.issues || err.errors)) {
        const issues = err.issues || err.errors || [];
        const fieldErrors: Record<string, any> = {};
        for (const issue of issues) {
          const path = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || '');
          if (path && !fieldErrors[path]) {
            fieldErrors[path] = { type: issue.code || 'validation', message: issue.message || 'Invalid value' };
          }
        }
        return { values: {}, errors: toNestErrors(fieldErrors, options) };
      }
      throw err;
    }
  };
}

export default safeZodResolver;

