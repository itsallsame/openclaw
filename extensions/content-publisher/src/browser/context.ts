import type { OpenClawPluginApi } from "../../../../src/plugins/types.js";
import { callGateway } from "../../../../src/gateway/call.js";

/**
 * Snapshot element reference
 */
export interface ElementRef {
  ref: string;
  role?: string;
  name?: string;
  text?: string;
}

/**
 * Page snapshot result
 */
export interface PageSnapshot {
  url: string;
  title: string;
  elements: Record<string, ElementRef>;
  raw?: string;
}

/**
 * Browser action result
 */
export interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Fill field input
 */
export interface FillField {
  ref: string;
  type: string;
  value?: string | boolean | number;
}

/**
 * Wait condition
 */
export interface WaitCondition {
  text?: string;
  selector?: string;
  url?: string;
  timeoutMs?: number;
  timeMs?: number;
}

/**
 * Browser context for platform adapters
 * Wraps OpenClaw gateway browser.request API via WebSocket
 */
export class BrowserContext {
  private api: OpenClawPluginApi;
  private profile: string;
  private currentTabId: string | null = null;

  constructor(api: OpenClawPluginApi, profile: string = "openclaw") {
    this.api = api;
    this.profile = profile;
  }

  /**
   * Make a browser request through the gateway WebSocket API
   */
  private async browserRequest(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: Record<string, unknown>
  ): Promise<unknown> {
    const result = await callGateway({
      config: this.api.config,
      method: "browser.request",
      params: {
        method,
        path,
        query: { profile: this.profile },
        body,
      },
      timeoutMs: 30000,
    });

    return result;
  }

  /**
   * Get browser status
   */
  async status(): Promise<{ running: boolean; profile: string }> {
    const result = (await this.browserRequest("GET", "/")) as { running: boolean; profile: string };
    return result;
  }

  /**
   * Start browser if not running
   */
  async start(): Promise<void> {
    await this.browserRequest("POST", "/start");
  }

  /**
   * Stop browser
   */
  async stop(): Promise<void> {
    await this.browserRequest("POST", "/stop");
  }

  /**
   * List all tabs
   */
  async listTabs(): Promise<Array<{ targetId: string; url: string; title: string }>> {
    const result = (await this.browserRequest("GET", "/tabs")) as {
      running: boolean;
      tabs: Array<{ targetId: string; url: string; title: string }>;
    };
    return result.tabs ?? [];
  }

  /**
   * Open a new tab with URL
   */
  async open(url: string): Promise<string> {
    const result = (await this.browserRequest("POST", "/tabs/open", { url })) as { targetId: string };
    this.currentTabId = result.targetId;
    return result.targetId;
  }

  /**
   * Focus a tab by target ID
   */
  async focus(targetId: string): Promise<void> {
    await this.browserRequest("POST", "/tabs/focus", { targetId });
    this.currentTabId = targetId;
  }

  /**
   * Close a tab
   */
  async closeTab(targetId?: string): Promise<void> {
    const id = targetId ?? this.currentTabId;
    if (!id) throw new Error("No tab to close");
    await this.browserRequest("POST", "/tabs/action", { action: "close", targetId: id });
  }

  /**
   * Navigate current tab to URL
   */
  async navigate(url: string): Promise<void> {
    await this.browserRequest("POST", "/navigate", { url, targetId: this.currentTabId });
  }

  /**
   * Get current page URL
   */
  async getUrl(): Promise<string> {
    const tabs = await this.listTabs();
    if (this.currentTabId) {
      const tab = tabs.find((t) => t.targetId === this.currentTabId);
      if (tab) return tab.url;
    }
    return tabs[0]?.url ?? "";
  }

  /**
   * Take a snapshot of the page
   */
  async snapshot(options?: { format?: "ai" | "aria"; selector?: string }): Promise<PageSnapshot> {
    // Snapshot uses GET with query params
    const result = await callGateway({
      config: this.api.config,
      method: "browser.request",
      params: {
        method: "GET",
        path: "/snapshot",
        query: {
          profile: this.profile,
          targetId: this.currentTabId ?? undefined,
          format: options?.format ?? "ai",
          selector: options?.selector,
        },
      },
      timeoutMs: 30000,
    }) as { snapshot: string; url: string; title: string };

    // Parse the snapshot text into elements
    const elements: Record<string, ElementRef> = {};
    const lines = (result.snapshot ?? "").split("\n");
    for (const line of lines) {
      const match = line.match(/\[ref=(\w+)\]/);
      if (match) {
        const ref = match[1];
        elements[ref] = {
          ref,
          text: line.replace(/\[ref=\w+\]/, "").trim(),
        };
      }
    }

    return {
      url: result.url ?? "",
      title: result.title ?? "",
      elements,
      raw: result.snapshot,
    };
  }

  /**
   * Take a screenshot
   */
  async screenshot(options?: { fullPage?: boolean; path?: string }): Promise<string> {
    const result = (await this.browserRequest("POST", "/screenshot", {
      targetId: this.currentTabId,
      fullPage: options?.fullPage,
      path: options?.path,
    })) as { path?: string };
    return result.path ?? "";
  }

  /**
   * Click an element
   */
  async click(ref: string, options?: { double?: boolean }): Promise<void> {
    await this.browserRequest("POST", "/act", {
      kind: "click",
      targetId: this.currentTabId,
      ref,
      doubleClick: options?.double,
    });
  }

  /**
   * Type text into focused element or specified element
   */
  async type(text: string, options?: { ref?: string; slowly?: boolean; submit?: boolean }): Promise<void> {
    if (!options?.ref) {
      // If no ref, use press for each character
      for (const char of text) {
        await this.press(char);
      }
      return;
    }

    await this.browserRequest("POST", "/act", {
      kind: "type",
      targetId: this.currentTabId,
      ref: options.ref,
      text,
      slowly: options?.slowly,
      submit: options?.submit,
    });
  }

  /**
   * Fill multiple form fields
   */
  async fill(fields: FillField[]): Promise<void> {
    await this.browserRequest("POST", "/act", {
      kind: "fill",
      targetId: this.currentTabId,
      fields,
    });
  }

  /**
   * Press a key
   */
  async press(key: string): Promise<void> {
    await this.browserRequest("POST", "/act", {
      kind: "press",
      targetId: this.currentTabId,
      key,
    });
  }

  /**
   * Upload files
   */
  async upload(paths: string[], ref?: string): Promise<void> {
    await this.browserRequest("POST", "/hooks/file-chooser", {
      targetId: this.currentTabId,
      paths,
      ref,
    });
  }

  /**
   * Wait for a condition
   */
  async wait(condition: WaitCondition): Promise<void> {
    await this.browserRequest("POST", "/act", {
      kind: "wait",
      targetId: this.currentTabId,
      text: condition.text,
      selector: condition.selector,
      url: condition.url,
      timeoutMs: condition.timeoutMs,
      timeMs: condition.timeMs,
    });
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T>(fn: string, ref?: string): Promise<T> {
    const result = (await this.browserRequest("POST", "/act", {
      kind: "evaluate",
      targetId: this.currentTabId,
      fn,
      ref,
    })) as { result: T };
    return result.result;
  }

  /**
   * Find element by text content in snapshot
   */
  findByText(text: string, snapshot: PageSnapshot): string | null {
    for (const [ref, elem] of Object.entries(snapshot.elements)) {
      if (elem.text?.includes(text)) {
        return ref;
      }
    }
    return null;
  }

  /**
   * Find element by role in snapshot
   */
  findByRole(role: string, name: string | undefined, snapshot: PageSnapshot): string | null {
    for (const [ref, elem] of Object.entries(snapshot.elements)) {
      if (elem.role === role) {
        if (!name || elem.text?.includes(name)) {
          return ref;
        }
      }
    }
    return null;
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current tab ID
   */
  getTabId(): string | null {
    return this.currentTabId;
  }

  /**
   * Set current tab ID
   */
  setTabId(tabId: string): void {
    this.currentTabId = tabId;
  }
}
