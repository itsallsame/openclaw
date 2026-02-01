import type { BrowserContext } from "../../browser/context.js";
import type { MediaItem, PublishContent, LoginStatus, PublishResult, PublishOptions } from "../types.js";
import { XHS_SELECTORS, XHS_URLS, XHS_LIMITS } from "./selectors.js";
import { waitForElement, waitForText, clickByText, typeSlowly } from "../../browser/actions.js";

/**
 * Check if user is logged in to Xiaohongshu
 */
export async function checkLogin(ctx: BrowserContext): Promise<LoginStatus> {
  try {
    // Navigate to creator center
    await ctx.open(XHS_URLS.creator);
    await ctx.sleep(2000);

    // Check current URL - if redirected to login page, not logged in
    const url = await ctx.getUrl();
    if (url.includes("/login") || url.includes("passport")) {
      return { loggedIn: false, error: "Redirected to login page" };
    }

    // Take snapshot and look for user indicators
    const snapshot = await ctx.snapshot();

    // Look for user avatar or username
    for (const elem of Object.values(snapshot.elements)) {
      if (elem.role === "img" && elem.name?.includes("头像")) {
        return { loggedIn: true };
      }
      // Look for creator dashboard elements
      if (elem.text?.includes("创作中心") || elem.text?.includes("数据中心")) {
        return { loggedIn: true };
      }
    }

    // Check if login button is visible
    const loginRef = await ctx.findByText("登录", snapshot);
    if (loginRef) {
      return { loggedIn: false, error: "Login button found" };
    }

    // If we're on creator page without login redirect, assume logged in
    if (url.includes("creator.xiaohongshu.com")) {
      return { loggedIn: true };
    }

    return { loggedIn: false, error: "Could not determine login status" };
  } catch (error) {
    return {
      loggedIn: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Navigate to publish page and select image upload tab
 */
export async function navigateToPublish(ctx: BrowserContext): Promise<void> {
  // Navigate to publish page
  await ctx.navigate(`${XHS_URLS.publish}?source=official`);
  await ctx.sleep(2000);

  // Check if redirected to login
  const url = await ctx.getUrl();
  if (url.includes("/login") || !url.includes("/publish")) {
    throw new Error("Not logged in - please login to Xiaohongshu first");
  }

  // Wait for upload content area
  await waitForElement(
    ctx,
    (snapshot) => {
      for (const [ref, elem] of Object.entries(snapshot.elements)) {
        if (elem.text?.includes("上传") || elem.name?.includes("上传")) {
          return ref;
        }
      }
      return null;
    },
    { timeout: 10000 }
  );

  await ctx.sleep(1000);

  // Click "上传图文" tab
  try {
    await clickByText(ctx, XHS_SELECTORS.publish.uploadImageTab, { timeout: 5000 });
    await ctx.sleep(1000);
  } catch {
    // Tab might already be selected or not visible
  }
}

/**
 * Upload images to the publish form
 */
export async function uploadImages(ctx: BrowserContext, media: MediaItem[]): Promise<void> {
  if (!media || media.length === 0) {
    throw new Error("At least one image is required");
  }

  if (media.length > XHS_LIMITS.maxImages) {
    throw new Error(`Maximum ${XHS_LIMITS.maxImages} images allowed`);
  }

  // Prepare file paths
  const filePaths: string[] = [];
  for (const item of media) {
    if (item.type === "path") {
      filePaths.push(item.value);
    } else if (item.type === "url") {
      // For URL type, we need to download first
      // This should be handled by the tool layer before calling workflow
      throw new Error("URL media type should be converted to path before upload");
    } else if (item.type === "base64") {
      // For base64, we need to save to temp file first
      // This should be handled by the tool layer before calling workflow
      throw new Error("Base64 media type should be converted to path before upload");
    }
  }

  // Find upload input
  const uploadRef = await waitForElement(
    ctx,
    (snapshot) => {
      for (const [ref, elem] of Object.entries(snapshot.elements)) {
        if (elem.role === "button" && (elem.name?.includes("上传") || elem.text?.includes("上传"))) {
          return ref;
        }
      }
      return null;
    },
    { timeout: 10000 }
  );

  // Upload files
  await ctx.upload(filePaths, uploadRef);

  // Wait for upload to complete
  await ctx.sleep(3000);

  // Verify images are uploaded by checking for preview elements
  const snapshot = await ctx.snapshot();
  let uploadedCount = 0;
  for (const elem of Object.values(snapshot.elements)) {
    if (elem.role === "img" || elem.name?.includes("图片")) {
      uploadedCount++;
    }
  }

  if (uploadedCount < media.length) {
    // Wait more for slow uploads
    await ctx.sleep(3000);
  }
}

/**
 * Fill title into the form
 */
export async function fillTitle(ctx: BrowserContext, title: string): Promise<void> {
  if (!title) return;

  if (title.length > XHS_LIMITS.maxTitleLength) {
    throw new Error(`Title must be ${XHS_LIMITS.maxTitleLength} characters or less`);
  }

  // Find title input
  const titleRef = await waitForElement(
    ctx,
    (snapshot) => {
      for (const [ref, elem] of Object.entries(snapshot.elements)) {
        if (elem.role === "textbox" && (elem.name?.includes("标题") || elem.name?.includes("title"))) {
          return ref;
        }
      }
      return null;
    },
    { timeout: 10000 }
  );

  await ctx.click(titleRef);
  await ctx.sleep(200);
  await ctx.type(title);
  await ctx.sleep(500);
}

/**
 * Fill content into the editor
 */
export async function fillContent(ctx: BrowserContext, content: string): Promise<void> {
  if (!content) return;

  // Find content editor (Quill editor or textbox)
  const contentRef = await waitForElement(
    ctx,
    (snapshot) => {
      for (const [ref, elem] of Object.entries(snapshot.elements)) {
        // Look for textbox with content-related name
        if (elem.role === "textbox") {
          if (elem.name?.includes("正文") || elem.name?.includes("描述") || elem.name?.includes("内容")) {
            return ref;
          }
        }
      }
      // Fallback: find any textbox that's not the title
      for (const [ref, elem] of Object.entries(snapshot.elements)) {
        if (elem.role === "textbox" && !elem.name?.includes("标题")) {
          return ref;
        }
      }
      return null;
    },
    { timeout: 10000 }
  );

  await ctx.click(contentRef);
  await ctx.sleep(200);

  // Type content slowly to simulate human input
  await typeSlowly(ctx, content, { charDelay: 30 });
  await ctx.sleep(500);
}

/**
 * Add tags to the content
 */
export async function addTags(ctx: BrowserContext, tags: string[]): Promise<void> {
  if (!tags || tags.length === 0) return;

  // Get current snapshot to find content editor
  const snapshot = await ctx.snapshot();

  // Find content editor to add tags at the end
  let contentRef: string | null = null;
  for (const [ref, elem] of Object.entries(snapshot.elements)) {
    if (elem.role === "textbox" && !elem.name?.includes("标题")) {
      contentRef = ref;
      break;
    }
  }

  if (!contentRef) {
    throw new Error("Could not find content editor for tags");
  }

  // Click to focus
  await ctx.click(contentRef);
  await ctx.sleep(300);

  // Add newlines before tags
  await ctx.press("Enter");
  await ctx.press("Enter");
  await ctx.sleep(300);

  // Add each tag
  for (const tag of tags) {
    const cleanTag = tag.replace(/^#/, "");

    // Type # to trigger tag input
    await ctx.type("#");
    await ctx.sleep(200);

    // Type tag name slowly
    await typeSlowly(ctx, cleanTag, { charDelay: 50 });
    await ctx.sleep(1000);

    // Look for tag suggestion dropdown
    const tagSnapshot = await ctx.snapshot();
    let suggestionRef: string | null = null;

    for (const [ref, elem] of Object.entries(tagSnapshot.elements)) {
      if (elem.role === "option" || elem.role === "listitem" || elem.text?.includes(cleanTag)) {
        suggestionRef = ref;
        break;
      }
    }

    if (suggestionRef) {
      // Click the suggestion
      await ctx.click(suggestionRef);
      await ctx.sleep(300);
    } else {
      // No suggestion found, add space to complete tag
      await ctx.type(" ");
      await ctx.sleep(200);
    }
  }
}

/**
 * Submit the publish form
 */
export async function submitPublish(ctx: BrowserContext, options: PublishOptions): Promise<PublishResult> {
  if (options.draft) {
    // Click draft button
    try {
      await clickByText(ctx, XHS_SELECTORS.publish.draftButton, { timeout: 5000 });
      await ctx.sleep(2000);
      return {
        success: true,
        message: "Draft saved successfully",
      };
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
    await clickByText(ctx, XHS_SELECTORS.publish.publishButton, { timeout: 5000 });
    await ctx.sleep(3000);

    // Check for success message
    const snapshot = await ctx.snapshot();
    for (const elem of Object.values(snapshot.elements)) {
      if (elem.text?.includes("发布成功") || elem.text?.includes("成功")) {
        return {
          success: true,
          message: "Published successfully",
        };
      }
      if (elem.text?.includes("发布失败") || elem.text?.includes("失败")) {
        return {
          success: false,
          message: "Publish failed",
          error: elem.text,
        };
      }
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
