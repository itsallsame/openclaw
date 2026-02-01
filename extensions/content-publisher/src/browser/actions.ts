import type { BrowserContext, PageSnapshot } from "./context.js";

/**
 * Retry options
 */
export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = true } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error("Retry failed");
}

/**
 * Wait for an element to appear in snapshot
 */
export async function waitForElement(
  ctx: BrowserContext,
  predicate: (snapshot: PageSnapshot) => string | null,
  options: { timeout?: number; interval?: number } = {}
): Promise<string> {
  const { timeout = 30000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const snapshot = await ctx.snapshot();
    const ref = predicate(snapshot);
    if (ref) {
      return ref;
    }
    await ctx.sleep(interval);
  }

  throw new Error(`Element not found within ${timeout}ms`);
}

/**
 * Wait for text to appear on page
 */
export async function waitForText(
  ctx: BrowserContext,
  text: string,
  options: { timeout?: number } = {}
): Promise<void> {
  await waitForElement(
    ctx,
    (snapshot) => {
      for (const [ref, elem] of Object.entries(snapshot.elements)) {
        if (elem.text?.includes(text) || elem.name?.includes(text)) {
          return ref;
        }
      }
      return null;
    },
    options
  );
}

/**
 * Wait for URL to match pattern
 */
export async function waitForUrl(
  ctx: BrowserContext,
  pattern: string | RegExp,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 30000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const url = await ctx.getUrl();
    const matches = typeof pattern === "string" ? url.includes(pattern) : pattern.test(url);
    if (matches) {
      return;
    }
    await ctx.sleep(interval);
  }

  throw new Error(`URL did not match pattern within ${timeout}ms`);
}

/**
 * Click element by text
 */
export async function clickByText(
  ctx: BrowserContext,
  text: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const ref = await waitForElement(
    ctx,
    (snapshot) => {
      for (const [r, elem] of Object.entries(snapshot.elements)) {
        if (elem.text?.includes(text) || elem.name?.includes(text)) {
          return r;
        }
      }
      return null;
    },
    options
  );
  await ctx.click(ref);
}

/**
 * Click element by role and optional name
 */
export async function clickByRole(
  ctx: BrowserContext,
  role: string,
  name?: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const ref = await waitForElement(
    ctx,
    (snapshot) => {
      for (const [r, elem] of Object.entries(snapshot.elements)) {
        if (elem.role === role) {
          if (!name || elem.name?.includes(name)) {
            return r;
          }
        }
      }
      return null;
    },
    options
  );
  await ctx.click(ref);
}

/**
 * Type text slowly to simulate human input
 */
export async function typeSlowly(
  ctx: BrowserContext,
  text: string,
  options: { ref?: string; charDelay?: number } = {}
): Promise<void> {
  const { ref, charDelay = 50 } = options;

  if (ref) {
    await ctx.click(ref);
    await ctx.sleep(100);
  }

  for (const char of text) {
    await ctx.type(char);
    await ctx.sleep(charDelay);
  }
}

/**
 * Check if page contains text
 */
export async function hasText(ctx: BrowserContext, text: string): Promise<boolean> {
  const snapshot = await ctx.snapshot();
  for (const elem of Object.values(snapshot.elements)) {
    if (elem.text?.includes(text) || elem.name?.includes(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if URL contains pattern
 */
export async function urlContains(ctx: BrowserContext, pattern: string): Promise<boolean> {
  const url = await ctx.getUrl();
  return url.includes(pattern);
}
