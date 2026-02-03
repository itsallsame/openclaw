import type { BrowserContext } from "../../browser/context.js";
import type { MediaItem, PublishContent, LoginStatus, PublishResult, PublishOptions } from "../types.js";
import { XHS_SELECTORS, XHS_URLS, XHS_LIMITS } from "./selectors.js";
import { waitForSelector, clickByText } from "../../browser/actions-new.js";

/**
 * Check if user is logged in to Xiaohongshu
 */
export async function checkLogin(ctx: BrowserContext): Promise<LoginStatus> {
  try {
    // Navigate to creator center
    await ctx.open(XHS_URLS.creator);
    await ctx.sleep(2000);

    const result = await ctx.evaluate<{ loggedIn: boolean; reason?: string }>(`
      (() => {
        const url = location.href;
        if (url.includes('/login') || url.includes('passport')) {
          return { loggedIn: false, reason: 'Redirected to login page' };
        }

        const text = document.body?.innerText || '';
        if (text.includes('退出登录') || text.includes('创作中心') || text.includes('数据中心')) {
          return { loggedIn: true };
        }

        const hasLoginButton = Array.from(document.querySelectorAll('button, a'))
          .some((el) => (el.textContent || '').trim() === '登录');
        if (hasLoginButton) {
          return { loggedIn: false, reason: 'Login button found' };
        }

        if (url.includes('creator.xiaohongshu.com')) {
          return { loggedIn: true };
        }

        return { loggedIn: false, reason: 'Could not determine login status' };
      })()
    `);

    return result.loggedIn ? { loggedIn: true } : { loggedIn: false, error: result.reason };
  } catch (error) {
    return {
      loggedIn: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Navigate to publish page and select upload tab
 * @param contentType - 'image' for 图文, 'video' for 视频
 */
export async function navigateToPublish(ctx: BrowserContext, contentType: 'image' | 'video' = 'image'): Promise<void> {
  const log = (message: string) => {
    console.log(`[xhs] ${message}`);
  };

  const dumpClickableElements = async (label: string) => {
    const data = await ctx.evaluate<{
      url: string;
      title: string;
      items: Array<{ text: string; tag: string; href?: string; role?: string }>;
    }>(`
      (() => {
        const elements = Array.from(document.querySelectorAll('a, button, [role="button"], [role="link"]'));
        const seen = new Set();
        const items = [];

        for (const el of elements) {
          const text = (el.textContent || '').trim();
          if (!text || seen.has(text)) continue;
          seen.add(text);
          const tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
          const href = el instanceof HTMLAnchorElement ? el.href : undefined;
          const role = el.getAttribute('role') || undefined;
          items.push({ text, tag, href, role });
          if (items.length >= 50) break;
        }

        return {
          url: location.href,
          title: document.title || '',
          items,
        };
      })()
    `);

    const summary = data.items.map((item) => {
      const meta = [item.tag, item.role].filter(Boolean).join("/");
      return `${item.text}${meta ? ` (${meta})` : ""}`;
    }).join("; ");

    log(`${label} url=${data.url} title=${data.title}`);
    log(`${label} clickable elements (${data.items.length}): ${summary || "none"}`);
  };

  log(`navigate: ${XHS_URLS.publish}`);
  await ctx.navigate(XHS_URLS.publish);
  await ctx.sleep(3000);

  let url = await ctx.getUrl();
  log(`after publish load url=${url}`);

  if (url.includes("/login") || url.includes("passport")) {
    throw new Error("Not logged in - please login to Xiaohongshu first");
  }

  const tabText = contentType === 'video' ? XHS_SELECTORS.publish.uploadVideoTab : XHS_SELECTORS.publish.uploadImageTab;

  const clickedUploadTab = await ctx.evaluate<boolean>(`
    (() => {
      const text = ${JSON.stringify(tabText)};
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        if ((el.textContent || '').trim() === text) {
          if (el instanceof HTMLElement) {
            el.click();
            return true;
          }
        }
      }
      return false;
    })()
  `);

  if (!clickedUploadTab) {
    await dumpClickableElements("upload-tab-missing");
    throw new Error(`Could not find exact tab text: ${tabText}`);
  }

  await ctx.sleep(2000);

  // Wait for file input to appear (indicates page is ready)
  try {
    await waitForSelector(ctx, 'input[type="file"]', { timeout: 30000 });
  } catch (error) {
    await dumpClickableElements("publish-page-not-ready");
    throw new Error("Publish page did not load properly");
  }

  log("navigateToPublish complete");
}

/**
 * Upload images or video to the publish form (file-chooser hook with DataTransfer fallback)
 */
export async function uploadImages(
  ctx: BrowserContext,
  media: Array<MediaItem | string>,
  contentType: 'image' | 'video' = 'image'
): Promise<void> {
  if (!media || media.length === 0) {
    throw new Error("At least one image is required");
  }

  if (media.length > XHS_LIMITS.maxImages) {
    throw new Error(`Maximum ${XHS_LIMITS.maxImages} images allowed`);
  }

  const log = (message: string) => {
    console.log(`[xhs] ${message}`);
  };

  const debugUploadInputs = async (label: string) => {
    const data = await ctx.evaluate<{
      url: string;
      uploadInputs: number;
      fileInputs: number;
      uploadSelectors: string[];
    }>(`
      (() => {
        const uploadInputs = document.querySelectorAll(${JSON.stringify(XHS_SELECTORS.publish.uploadInput)}).length;
        const fileInputs = document.querySelectorAll('input[type="file"]').length;
        const uploadSelectors = Array.from(document.querySelectorAll(${JSON.stringify(XHS_SELECTORS.publish.uploadInput)}))
          .map((el) => el instanceof HTMLElement ? el.tagName.toLowerCase() + "." + (el.className || "") : "unknown");

        return {
          url: location.href,
          uploadInputs,
          fileInputs,
          uploadSelectors,
        };
      })()
    `);

    log(`${label} url=${data.url} uploadInputs=${data.uploadInputs} fileInputs=${data.fileInputs}`);
    if (data.uploadSelectors.length > 0) {
      log(`${label} upload-input elements: ${data.uploadSelectors.join(" | ")}`);
    }
  };

  const debugPreviewElements = async (label: string) => {
    const data = await ctx.evaluate<{
      previewSelector: string;
      previewCount: number;
      previewSamples: string[];
      classMatches: Array<{ tag: string; className: string }>;
    }>(`
      (() => {
        const previewSelector = ${JSON.stringify(XHS_SELECTORS.publish.imagePreview)};
        const previewNodes = previewSelector ? Array.from(document.querySelectorAll(previewSelector)) : [];
        const previewSamples = previewNodes.slice(0, 10).map((el) => {
          const tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
          const cls = el instanceof HTMLElement && typeof el.className === 'string' ? el.className : '';
          return cls ? \`\${tag}.\${cls}\` : tag;
        });

        const classMatches = Array.from(document.querySelectorAll('*')).filter((el) => {
          if (!(el instanceof HTMLElement)) return false;
          const cls = (el.className || '').toString().toLowerCase();
          return cls.includes('preview') || cls.includes('img');
        }).slice(0, 50).map((el) => ({
          tag: el.tagName ? el.tagName.toLowerCase() : 'unknown',
          className: (el.className || '').toString(),
        }));

        return {
          previewSelector: previewSelector || '',
          previewCount: previewNodes.length,
          previewSamples,
          classMatches,
        };
      })()
    `);

    log(`${label} preview selector="${data.previewSelector}" count=${data.previewCount}`);
    if (data.previewSamples.length > 0) {
      log(`${label} preview samples: ${data.previewSamples.join(" | ")}`);
    }
    if (data.classMatches.length > 0) {
      const sample = data.classMatches
        .slice(0, 15)
        .map((item) => `${item.tag}.${item.className}`)
        .join(" | ");
      log(`${label} class matches (preview/img): ${sample}`);
    } else {
      log(`${label} class matches (preview/img): none`);
    }
  };

  // Ensure upload tab is active if upload input is missing
  const hasUploadInput = await ctx.evaluate<boolean>(`
    (() => {
      return document.querySelector(${JSON.stringify(XHS_SELECTORS.publish.uploadInput)}) != null ||
        document.querySelector('input[type="file"]') != null;
    })()
  `);

  if (!hasUploadInput) {
    log("upload input missing before upload; attempting to click upload tab");
    try {
      await clickByText(ctx, XHS_SELECTORS.publish.uploadImageTab, { timeout: 10000 });
      await ctx.sleep(1500);
    } catch (error) {
      log(`failed to click upload tab: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await debugUploadInputs("before-upload");

  // Prepare file paths
  const filePaths: string[] = [];
  for (const item of media) {
    if (typeof item === "string") {
      if (item) {
        filePaths.push(item);
      }
      continue;
    }

    const itemType = (item as { type?: unknown }).type;
    if (itemType === "path") {
      if (item.value) {
        filePaths.push(item.value);
      }
      continue;
    }
    if (itemType === "url") {
      throw new Error("URL media type should be converted to path before upload");
    }
    if (itemType === "base64") {
      throw new Error("Base64 media type should be converted to path before upload");
    }

    if (item && typeof item.value === "string" && item.value) {
      filePaths.push(item.value);
      continue;
    }

    throw new Error(`Unsupported media type: ${String(itemType)}`);
  }

  if (!filePaths.length) {
    throw new Error("No file paths resolved for upload (expected MediaItem.type='path')");
  }
  log(`resolved ${filePaths.length} file path(s) for upload`);

  // Prefer Playwright setInputFiles via file-chooser hook for reliability
  try {
    const uploadSelector = `${XHS_SELECTORS.publish.uploadInput} input[type="file"], input[type="file"]`;
    await ctx.uploadToSelector(filePaths, uploadSelector, { timeoutMs: 30000 });
    log(`uploaded ${filePaths.length} file(s) via file-chooser hook`);
  } catch (error) {
    log(`file-chooser upload failed, falling back to DataTransfer: ${error instanceof Error ? error.message : String(error)}`);

    // Read files and convert to base64
    const fs = await import("fs/promises");
    const fileDataList: Array<{ base64: string; name: string; type: string }> = [];

    for (const filePath of filePaths) {
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString("base64");
      const fileName = filePath.split("/").pop() || "image.jpg";
      const normalizedName = fileName.toLowerCase();
      const mimeType = normalizedName.endsWith(".png") ? "image/png" :
                       normalizedName.endsWith(".webp") ? "image/webp" :
                       normalizedName.endsWith(".jpg") || normalizedName.endsWith(".jpeg") ? "image/jpeg" :
                       "image/jpeg";

      fileDataList.push({
        base64: `data:${mimeType};base64,${base64}`,
        name: fileName,
        type: mimeType
      });
    }

    // Wait for file input and upload using DataTransfer API
    const timeout = 30000;
    const startTime = Date.now();
    let uploaded = false;

    while (Date.now() - startTime < timeout && !uploaded) {
      try {
        // Upload files using DataTransfer API (no ref needed!)
        const result = await ctx.evaluate<boolean>(`
          (async () => {
            const fileDataList = ${JSON.stringify(fileDataList)};

            // Find file input
            const inputSelector = ${JSON.stringify(`${XHS_SELECTORS.publish.uploadInput} input[type="file"], input[type="file"]`)};
            const input = document.querySelector(inputSelector);
            if (!input || !(input instanceof HTMLInputElement)) {
              return false;
            }

            // Create DataTransfer and add files
            const dataTransfer = new DataTransfer();

            for (const fileData of fileDataList) {
              // Convert base64 to Blob
              const base64String = fileData.base64.replace(/^data:[^;]+;base64,/, '');
              const binaryString = atob(base64String);
              const bytes = new Uint8Array(binaryString.length);

              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              const blob = new Blob([bytes], { type: fileData.type });
              const file = new File([blob], fileData.name, { type: fileData.type });

              dataTransfer.items.add(file);
            }

            // Set files to input
            input.files = dataTransfer.files;

            // Trigger events
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));

            return true;
          })()
        `);

        if (result) {
          uploaded = true;
          break;
        }
      } catch (error) {
        // Continue trying
      }

      await ctx.sleep(500);
    }

    if (!uploaded) {
      throw new Error("Failed to upload images: file input not found");
    }
  }

  await debugPreviewElements("after-upload");

  // For video uploads, wait for video processing instead of checking preview count
  if (contentType === 'video') {
    log("waiting for video processing...");
    // Wait for title input to appear (indicates video is processed)
    try {
      await waitForSelector(ctx, XHS_SELECTORS.publish.titleInput, { timeout: 120000 });
      log("video processing complete - title input appeared");
      return;
    } catch (error) {
      throw new Error("Video processing timeout - title input did not appear");
    }
  }

  // For images, verify preview count
  const previewTimeout = 60000 + media.length * 30000;
  const verifyStart = Date.now();
  let finalCount = 0;
  while (Date.now() - verifyStart < previewTimeout) {
    const uploadedCount = await ctx.evaluate<number>(`
      (() => {
        const previewSelector = ${JSON.stringify(XHS_SELECTORS.publish.imagePreview)};
        if (!previewSelector) return 0;
        return document.querySelectorAll(previewSelector).length;
      })()
    `);

    if (uploadedCount === media.length) {
      finalCount = uploadedCount;
      break;
    }

    finalCount = uploadedCount;
    await ctx.sleep(500);
  }

  if (finalCount !== media.length) {
    await debugPreviewElements("preview-mismatch");
    throw new Error(`Image preview count mismatch: expected ${media.length}, got ${finalCount}`);
  }

  // Wait for title input to appear after image processing
  await waitForSelector(ctx, XHS_SELECTORS.publish.titleInput, { timeout: 60000 });
}

/**
 * Fill title into the form
 */
export async function fillTitle(ctx: BrowserContext, title: string): Promise<void> {
  if (!title) return;

  if (title.length > XHS_LIMITS.maxTitleLength) {
    throw new Error(`Title must be ${XHS_LIMITS.maxTitleLength} characters or less`);
  }

  await waitForSelector(ctx, XHS_SELECTORS.publish.titleInput, { timeout: 10000 });

  const filled = await ctx.evaluate<boolean>(`
    (() => {
      const selector = ${JSON.stringify(XHS_SELECTORS.publish.titleInput)};
      const title = ${JSON.stringify(title)};
      const input = document.querySelector(selector);
      if (!input || !(input instanceof HTMLInputElement)) {
        return false;
      }
      input.focus();
      input.value = title;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);

  if (!filled) {
    throw new Error(`Failed to fill title with selector: ${XHS_SELECTORS.publish.titleInput}`);
  }
  await ctx.sleep(500);
}

/**
 * Fill content into the editor
 */
export async function fillContent(ctx: BrowserContext, content: string): Promise<void> {
  if (!content) return;

  const log = (message: string) => {
    console.log(`[xhs] ${message}`);
  };

  log(`fillContent: start length=${content.length}`);

  const result = await ctx.evaluate<{ filled: boolean; debug: Record<string, unknown> }>(`
    (() => {
      const content = ${JSON.stringify(content)};

      const describe = (el) => {
        if (!el) return null;
        return {
          tag: el.tagName,
          className: el.getAttribute ? el.getAttribute('class') : '',
          role: el.getAttribute ? el.getAttribute('role') : '',
          contentEditable: el.isContentEditable === true,
          placeholder: el.getAttribute ? el.getAttribute('data-placeholder') : '',
        };
      };

      const debug = {
        tiptap: [],
        quill: [],
        contentEditable: [],
        textboxes: [],
        placeholder: null,
        chosen: null,
      };

      const tiptapEditors = Array.from(document.querySelectorAll(${JSON.stringify(XHS_SELECTORS.publish.contentEditor)}));
      tiptapEditors.forEach((el) => debug.tiptap.push(describe(el)));

      const quillEditors = Array.from(document.querySelectorAll('.ql-editor'));
      quillEditors.forEach((el) => debug.quill.push(describe(el)));

      const editables = Array.from(document.querySelectorAll(${JSON.stringify(XHS_SELECTORS.publish.contentEditorAlt)}));
      editables.forEach((el) => debug.contentEditable.push(describe(el)));

      const textboxes = Array.from(document.querySelectorAll(${JSON.stringify(XHS_SELECTORS.publish.textboxRole)}));
      textboxes.forEach((el) => debug.textboxes.push(describe(el)));

      const placeholderCandidates = Array.from(document.querySelectorAll('p[data-placeholder]'));
      let placeholderElem = null;
      for (const elem of placeholderCandidates) {
        const placeholder = elem.getAttribute('data-placeholder') || '';
        if (placeholder.includes(${JSON.stringify(XHS_SELECTORS.publish.contentPlaceholder)})) {
          placeholderElem = elem;
          break;
        }
      }
      debug.placeholder = describe(placeholderElem);

      let contentElement = null;

      if (tiptapEditors.length > 0) {
        contentElement = tiptapEditors[0];
      } else if (quillEditors.length > 0) {
        contentElement = quillEditors[0];
      } else if (placeholderElem) {
        let current = placeholderElem;
        for (let i = 0; i < 6; i++) {
          if (!current) break;
          if (current.getAttribute && current.getAttribute('role') === 'textbox') {
            contentElement = current;
            break;
          }
          current = current.parentElement;
        }
      } else if (editables.length > 0) {
        contentElement = editables[0];
      } else if (textboxes.length > 0) {
        contentElement = textboxes[0];
      }

      debug.chosen = describe(contentElement);

      const setContent = (el) => {
        if (!el) return false;
        el.focus();

        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          el.value = content;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        if (el.isContentEditable) {
          el.textContent = '';
          document.execCommand('insertText', false, content);
          return true;
        }

        if (el.getAttribute && el.getAttribute('role') === 'textbox') {
          el.textContent = '';
          el.textContent = content;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }

        if (el instanceof HTMLElement) {
          el.innerHTML = '<p>' + content.replace(/\\n/g, '</p><p>') + '</p>';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        return false;
      };

      const filled = contentElement ? setContent(contentElement) : false;
      return { filled, debug };
    })()
  `);

  const debug = result?.debug ?? {};
  const summarize = (items: unknown) => {
    if (!Array.isArray(items) || items.length === 0) return "none";
    return items
      .slice(0, 3)
      .map((item) => JSON.stringify(item))
      .join(" | ");
  };

  log(
    `fillContent: found tiptap=${Array.isArray(debug.tiptap) ? debug.tiptap.length : 0} quill=${
      Array.isArray(debug.quill) ? debug.quill.length : 0
    } contentEditable=${Array.isArray(debug.contentEditable) ? debug.contentEditable.length : 0} textboxes=${
      Array.isArray(debug.textboxes) ? debug.textboxes.length : 0
    } placeholder=${debug.placeholder ? "yes" : "no"}`
  );
  log(`fillContent: tiptap samples=${summarize(debug.tiptap)}`);
  log(`fillContent: quill samples=${summarize(debug.quill)}`);
  log(`fillContent: contentEditable samples=${summarize(debug.contentEditable)}`);
  log(`fillContent: textbox samples=${summarize(debug.textboxes)}`);
  log(`fillContent: placeholder=${debug.placeholder ? JSON.stringify(debug.placeholder) : "none"}`);
  log(`fillContent: chosen=${debug.chosen ? JSON.stringify(debug.chosen) : "none"}`);

  if (!result?.filled) {
    throw new Error("Failed to fill content editor");
  }
  await ctx.sleep(500);
}

/**
 * Add tags to the content
 */
export async function addTags(ctx: BrowserContext, tags: string[]): Promise<void> {
  if (!tags || tags.length === 0) return;

  // Focus content editor and add tags using evaluate
  const success = await ctx.evaluate<boolean>(`
    (async () => {
      const tags = ${JSON.stringify(tags)};

      // Find and focus content editor
      const tiptapEditor = document.querySelector('.tiptap.ProseMirror');
      const quillEditor = document.querySelector('.ql-editor');
      const editor = tiptapEditor || quillEditor || document.querySelector('[contenteditable="true"]');

      if (!editor) {
        return false;
      }

      editor.focus();

      // Wait a bit for focus
      await new Promise(resolve => setTimeout(resolve, 300));

      // Add newlines before tags
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      editor.dispatchEvent(enterEvent);
      await new Promise(resolve => setTimeout(resolve, 100));
      editor.dispatchEvent(enterEvent);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Add each tag
      for (const tag of tags) {
        const cleanTag = tag.replace(/^#/, '');

        // Type # to trigger tag input
        const hashEvent = new KeyboardEvent('keydown', { key: '#', bubbles: true });
        editor.dispatchEvent(hashEvent);
        document.execCommand('insertText', false, '#');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Type tag name
        for (const char of cleanTag) {
          const charEvent = new KeyboardEvent('keydown', { key: char, bubbles: true });
          editor.dispatchEvent(charEvent);
          document.execCommand('insertText', false, char);
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to click tag suggestion
        const options = Array.from(document.querySelectorAll('[role="option"], [role="listitem"], .tag-option, .suggestion-item'));
        let clicked = false;

        for (const option of options) {
          const text = option.textContent || '';
          if (text.includes(cleanTag)) {
            option.click();
            clicked = true;
            break;
          }
        }

        if (!clicked) {
          // No suggestion found, add space to complete tag
          document.execCommand('insertText', false, ' ');
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      return true;
    })()
  `);

  if (!success) {
    throw new Error("Could not find content editor for tags");
  }
}

/**
 * Submit the publish form
 */
export async function submitPublish(ctx: BrowserContext, options: PublishOptions): Promise<PublishResult> {
  const log = (message: string) => {
    console.log(`[xhs] ${message}`);
  };

  const logPublishButtons = async () => {
    const matches = await ctx.evaluate<
      Array<{ text: string; tag: string; role?: string; ariaLabel?: string; title?: string }>
    >(`
      (() => {
        const targets = Array.from(
          document.querySelectorAll(
            'button, a, [role="button"], [onclick], input[type="button"], input[type="submit"]'
          )
        );
        const items = [];
        for (const el of targets) {
          const text = (el.textContent || '').trim();
          const ariaLabel = el.getAttribute('aria-label') || '';
          const title = el.getAttribute('title') || '';
          const combined = [text, ariaLabel, title].join(' ');
          if (combined.includes('草稿') || combined.includes('发布')) {
            items.push({
              text,
              tag: el.tagName ? el.tagName.toLowerCase() : 'unknown',
              role: el.getAttribute('role') || undefined,
              ariaLabel: ariaLabel || undefined,
              title: title || undefined
            });
          }
        }
        return items;
      })()
    `);

    if (!matches.length) {
      log("no buttons found containing 草稿/发布");
      return;
    }

    const summary = matches
      .map((item) => {
        const meta = [item.tag, item.role].filter(Boolean).join("/");
        const labels = [item.text, item.ariaLabel, item.title].filter(Boolean).join(" | ");
        return `${labels}${meta ? ` (${meta})` : ""}`;
      })
      .join("; ");

    log(`buttons containing 草稿/发布 (${matches.length}): ${summary}`);
  };

  try {
    await logPublishButtons();
  } catch (error) {
    log(`failed to log buttons: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (options.draft) {
    // Click draft button
    try {
      let lastError: Error | undefined;
      for (const label of XHS_SELECTORS.publish.draftButtons) {
        try {
          await clickByText(ctx, label, { timeout: 3000 });
          await ctx.sleep(2000);
          return {
            success: true,
            message: "Draft saved successfully",
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }
      if (lastError) {
        throw lastError;
      }
      throw new Error("Draft button not found");
    } catch (error) {
      return {
        success: false,
        message: "Failed to save draft",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (!options.autoSubmit) {
    // Don't auto-submit, just return success for form filling
    return {
      success: true,
      message: "Content filled successfully. Please click publish button manually.",
    };
  }

  // Click publish button
  try {
    let lastError: Error | undefined;
    for (const label of XHS_SELECTORS.publish.publishButtons) {
      try {
        await clickByText(ctx, label, { timeout: 3000 });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    if (lastError) {
      throw lastError;
    }
    await ctx.sleep(3000);

    // Check for success/failure message using evaluate
    const result = await ctx.evaluate<{ success: boolean; message?: string }>(`
      (() => {
        const bodyText = document.body.textContent || '';

        if (bodyText.includes('发布成功') || bodyText.includes('成功')) {
          return { success: true, message: '发布成功' };
        }

        if (bodyText.includes('发布失败') || bodyText.includes('失败')) {
          return { success: false, message: '发布失败' };
        }

        return { success: true };
      })()
    `);

    if (result.message) {
      return {
        success: result.success,
        message: result.success ? "Published successfully" : "Publish failed",
        error: result.success ? undefined : result.message,
      };
    }

    // Check URL for success indication
    const url = await ctx.getUrl();
    if (url.includes("/success") || !url.includes("/publish")) {
      return {
        success: true,
        message: "Published successfully",
      };
    }

    return {
      success: true,
      message: "Publish button clicked. Please verify the result.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to click publish button",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
