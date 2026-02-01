import type { BrowserContext } from "./context.js";

/**
 * Wait for element using MutationObserver (runs in page context)
 * Similar to news_room's approach
 */
export async function waitForSelector(
  ctx: BrowserContext,
  selector: string,
  options: { timeout?: number } = {}
): Promise<boolean> {
  const { timeout = 30000 } = options;

  return await ctx.evaluate<boolean>(`
    (async () => {
      const selector = ${JSON.stringify(selector)};
      const timeout = ${timeout};

      const root = document.body || document.documentElement;
      if (!root) {
        return false;
      }

      // Check if element already exists
      const existing = root.querySelector(selector);
      if (existing) {
        return true;
      }

      // Wait for element using MutationObserver
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          reject(new Error(\`Timeout waiting for selector: \${selector}\`));
        }, timeout);

        const observer = new MutationObserver(() => {
          const element = root.querySelector(selector);
          if (element) {
            clearTimeout(timeoutId);
            observer.disconnect();
            resolve(true);
          }
        });

        observer.observe(root, {
          childList: true,
          subtree: true,
          attributes: true
        });
      });
    })()
  `);
}

/**
 * Wait for text to appear on page
 */
export async function waitForText(
  ctx: BrowserContext,
  text: string,
  options: { timeout?: number } = {}
): Promise<boolean> {
  const { timeout = 30000 } = options;

  return await ctx.evaluate<boolean>(`
    (async () => {
      const text = ${JSON.stringify(text)};
      const timeout = ${timeout};

      const root = document.body || document.documentElement;
      if (!root) {
        return false;
      }

      // Check if text already exists
      if (root.textContent?.includes(text)) {
        return true;
      }

      // Wait for text using MutationObserver
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          reject(new Error(\`Timeout waiting for text: \${text}\`));
        }, timeout);

        const observer = new MutationObserver(() => {
          if (root.textContent?.includes(text)) {
            clearTimeout(timeoutId);
            observer.disconnect();
            resolve(true);
          }
        });

        observer.observe(root, {
          childList: true,
          subtree: true
        });
      });
    })()
  `);
}

/**
 * Click element by text content
 */
export async function clickByText(
  ctx: BrowserContext,
  text: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  const clicked = await ctx.evaluate<boolean>(`
    (async () => {
      const text = ${JSON.stringify(text)};
      const timeout = ${timeout};

      const root = document.body || document.documentElement;
      if (!root) {
        return false;
      }

      const findAndClick = () => {
        const elements = Array.from(root.querySelectorAll('*'));
        for (const el of elements) {
          if (el.textContent?.trim() === text || el.textContent?.includes(text)) {
            if (el instanceof HTMLElement) {
              el.click();
              return true;
            }
          }
        }
        return false;
      };

      // Try immediately
      if (findAndClick()) {
        return true;
      }

      // Wait and retry
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          reject(new Error(\`Element with text "\${text}" not found\`));
        }, timeout);

        const observer = new MutationObserver(() => {
          if (findAndClick()) {
            clearTimeout(timeoutId);
            observer.disconnect();
            resolve(true);
          }
        });

        observer.observe(root, {
          childList: true,
          subtree: true
        });
      });
    })()
  `);

  if (!clicked) {
    throw new Error(`Failed to click element with text: ${text}`);
  }
}

/**
 * Fill input by placeholder
 */
export async function fillByPlaceholder(
  ctx: BrowserContext,
  placeholder: string,
  value: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  const result = await ctx.evaluate<{ filled: boolean; debug?: unknown }>(`
    (async () => {
      const placeholder = ${JSON.stringify(placeholder)};
      const value = ${JSON.stringify(value)};
      const timeout = ${timeout};

      const root = document.body || document.documentElement;
      if (!root) {
        return { filled: false, debug: { reason: 'no-root' } };
      }

      const normalize = (text) => (text || '').toString().trim();
      const matchText = (text) => {
        const hay = normalize(text);
        if (!hay) return false;
        return hay.includes(placeholder) || hay.toLowerCase().includes(placeholder.toLowerCase());
      };

      const describe = (el) => {
        const tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
        return {
          tag,
          type: el instanceof HTMLInputElement ? el.type : undefined,
          id: el.id || '',
          name: el.getAttribute('name') || '',
          className: typeof el.className === 'string' ? el.className : '',
          role: el.getAttribute('role') || '',
          placeholder: el.getAttribute('placeholder') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          dataPlaceholder: el.getAttribute('data-placeholder') || '',
          contenteditable: el.getAttribute('contenteditable') || '',
        };
      };

      const findAndFill = () => {
        const inputs = Array.from(root.querySelectorAll('input, textarea'));
        for (const input of inputs) {
          const placeholderAttr = input.getAttribute('placeholder') || '';
          const ariaLabel = input.getAttribute('aria-label') || '';
          const dataPlaceholder = input.getAttribute('data-placeholder') || '';
          if (matchText(placeholderAttr) || matchText(ariaLabel) || matchText(dataPlaceholder)) {
            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }

        const editables = Array.from(root.querySelectorAll('[contenteditable="true"], [role="textbox"]'));
        for (const el of editables) {
          const placeholderAttr = el.getAttribute('placeholder') || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const dataPlaceholder = el.getAttribute('data-placeholder') || '';
          if (matchText(placeholderAttr) || matchText(ariaLabel) || matchText(dataPlaceholder)) {
            if (el instanceof HTMLElement) {
              el.textContent = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }

        return false;
      };

      // Try immediately
      if (findAndFill()) {
        return { filled: true };
      }

      // Wait and retry
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          const debug = {
            inputs: Array.from(root.querySelectorAll('input')).map(describe),
            textareas: Array.from(root.querySelectorAll('textarea')).map(describe),
            contenteditables: Array.from(root.querySelectorAll('[contenteditable="true"]')).map(describe),
            textboxes: Array.from(root.querySelectorAll('[role="textbox"]')).map(describe),
          };
          reject(new Error(\`Input with placeholder "\${placeholder}" not found. Debug: \${JSON.stringify(debug)}\`));
        }, timeout);

        const observer = new MutationObserver(() => {
          if (findAndFill()) {
            clearTimeout(timeoutId);
            observer.disconnect();
            resolve({ filled: true });
          }
        });

        observer.observe(root, {
          childList: true,
          subtree: true
        });
      });
    })()
  `);

  if (!result?.filled) {
    const debug = result?.debug ? ` Debug: ${JSON.stringify(result.debug)}` : '';
    throw new Error(`Failed to fill input with placeholder: ${placeholder}.${debug}`);
  }
}

/**
 * Fill content editor (supports Quill, TipTap, and contenteditable)
 */
export async function fillContentEditor(
  ctx: BrowserContext,
  content: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  const filled = await ctx.evaluate<boolean>(`
    (async () => {
      const content = ${JSON.stringify(content)};
      const timeout = ${timeout};

      const root = document.body || document.documentElement;
      if (!root) {
        return false;
      }

      const findAndFill = () => {
        // Try TipTap editor first (小红书使用)
        const tiptapEditor = document.querySelector('.tiptap.ProseMirror');
        if (tiptapEditor && tiptapEditor.contentEditable === 'true') {
          tiptapEditor.innerHTML = '<p>' + content.replace(/\\n/g, '</p><p>') + '</p>';
          tiptapEditor.dispatchEvent(new Event('input', { bubbles: true }));
          tiptapEditor.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        // Try Quill editor
        const quillEditor = document.querySelector('.ql-editor');
        if (quillEditor && quillEditor.contentEditable === 'true') {
          quillEditor.innerHTML = '<p>' + content.replace(/\\n/g, '</p><p>') + '</p>';
          quillEditor.dispatchEvent(new Event('text-change', { bubbles: true }));
          quillEditor.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }

        // Try generic contenteditable
        const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        for (const el of editables) {
          // Skip if it's a title input (usually single line)
          const placeholder = el.getAttribute('placeholder') || '';
          if (placeholder.includes('标题') || placeholder.includes('title')) {
            continue;
          }

          el.innerHTML = '<p>' + content.replace(/\\n/g, '</p><p>') + '</p>';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        // Try textarea with role=textbox
        const textboxes = Array.from(document.querySelectorAll('[role="textbox"]'));
        for (const el of textboxes) {
          if (el instanceof HTMLTextAreaElement) {
            el.value = content;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }

        return false;
      };

      // Try immediately
      if (findAndFill()) {
        return true;
      }

      // Wait and retry
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          reject(new Error('Content editor not found'));
        }, timeout);

        const observer = new MutationObserver(() => {
          if (findAndFill()) {
            clearTimeout(timeoutId);
            observer.disconnect();
            resolve(true);
          }
        });

        observer.observe(root, {
          childList: true,
          subtree: true
        });
      });
    })()
  `);

  if (!filled) {
    throw new Error('Failed to fill content editor');
  }
}
