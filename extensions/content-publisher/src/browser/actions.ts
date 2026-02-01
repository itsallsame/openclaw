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
 * Click element by text using evaluate (no ref dependency)
 */
export async function clickByText(
  ctx: BrowserContext,
  text: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const clicked = await ctx.evaluate<boolean>(`
        (() => {
          const text = ${JSON.stringify(text)};

          // Find all clickable elements
          const elements = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick], input[type="button"], input[type="submit"]'));

          // Also check all elements with text content
          const allElements = Array.from(document.querySelectorAll('*'));

          for (const el of [...elements, ...allElements]) {
            const textContent = el.textContent || '';
            const ariaLabel = el.getAttribute('aria-label') || '';
            const title = el.getAttribute('title') || '';

            if (textContent.includes(text) || ariaLabel.includes(text) || title.includes(text)) {
              el.click();
              return true;
            }
          }

          return false;
        })()
      `);

      if (clicked) {
        await ctx.sleep(500);
        return;
      }
    } catch (error) {
      // Continue trying
    }

    await ctx.sleep(500);
  }

  throw new Error(`Element with text "${text}" not found within ${timeout}ms`);
}

/**
 * Click element by role and optional name using evaluate
 */
export async function clickByRole(
  ctx: BrowserContext,
  role: string,
  name?: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const clicked = await ctx.evaluate<boolean>(`
        (() => {
          const role = ${JSON.stringify(role)};
          const name = ${JSON.stringify(name)};

          const elements = Array.from(document.querySelectorAll('[role="' + role + '"]'));

          for (const el of elements) {
            if (!name) {
              el.click();
              return true;
            }

            const ariaLabel = el.getAttribute('aria-label') || '';
            const textContent = el.textContent || '';

            if (ariaLabel.includes(name) || textContent.includes(name)) {
              el.click();
              return true;
            }
          }

          return false;
        })()
      `);

      if (clicked) {
        await ctx.sleep(500);
        return;
      }
    } catch (error) {
      // Continue trying
    }

    await ctx.sleep(500);
  }

  throw new Error(`Element with role "${role}"${name ? ` and name "${name}"` : ''} not found within ${timeout}ms`);
}

/**
 * Type text slowly to simulate human input (deprecated - use fillByPlaceholder instead)
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

/**
 * Fill input field by placeholder using evaluate
 */
export async function fillByPlaceholder(
  ctx: BrowserContext,
  placeholder: string,
  value: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const filled = await ctx.evaluate<boolean>(`
        (() => {
          const placeholder = ${JSON.stringify(placeholder)};
          const value = ${JSON.stringify(value)};

          const inputs = Array.from(document.querySelectorAll('input, textarea'));

          for (const input of inputs) {
            const placeholderAttr = input.getAttribute('placeholder') || '';
            if (placeholderAttr.includes(placeholder)) {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }

          return false;
        })()
      `);

      if (filled) {
        await ctx.sleep(300);
        return;
      }
    } catch (error) {
      // Continue trying
    }

    await ctx.sleep(500);
  }

  throw new Error(`Input with placeholder "${placeholder}" not found within ${timeout}ms`);
}

/**
 * Fill content editor (for rich text editors like TipTap, Quill) using evaluate
 */
export async function fillContentEditor(
  ctx: BrowserContext,
  content: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const filled = await ctx.evaluate<boolean>(`
        (() => {
          const content = ${JSON.stringify(content)};

          // Try to find TipTap editor (小红书使用)
          const tiptapEditor = document.querySelector('.tiptap.ProseMirror');
          if (tiptapEditor && tiptapEditor.contentEditable === 'true') {
            tiptapEditor.innerHTML = '<p>' + content.replace(/\\n/g, '</p><p>') + '</p>';
            tiptapEditor.dispatchEvent(new Event('input', { bubbles: true }));
            tiptapEditor.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }

          // Try to find Quill editor
          const quillEditor = document.querySelector('.ql-editor');
          if (quillEditor) {
            quillEditor.innerHTML = '<p>' + content.replace(/\\n/g, '</p><p>') + '</p>';
            quillEditor.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }

          // Try to find contenteditable
          const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
          for (const el of editables) {
            el.innerHTML = '<p>' + content.replace(/\\n/g, '</p><p>') + '</p>';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }

          // Try to find textarea with role=textbox
          const textboxes = Array.from(document.querySelectorAll('[role="textbox"]'));
          for (const el of textboxes) {
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
              el.value = content;
            } else {
              el.textContent = content;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }

          return false;
        })()
      `);

      if (filled) {
        await ctx.sleep(500);
        return;
      }
    } catch (error) {
      // Continue trying
    }

    await ctx.sleep(500);
  }

  throw new Error(`Content editor not found within ${timeout}ms`);
}

/**
 * Wait for element to exist using evaluate
 */
export async function waitForSelector(
  ctx: BrowserContext,
  selector: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const exists = await ctx.evaluate<boolean>(`
        (() => {
          const selector = ${JSON.stringify(selector)};
          return document.querySelector(selector) !== null;
        })()
      `);

      if (exists) {
        return;
      }
    } catch (error) {
      // Continue trying
    }

    await ctx.sleep(500);
  }

  throw new Error(`Selector "${selector}" not found within ${timeout}ms`);
}
