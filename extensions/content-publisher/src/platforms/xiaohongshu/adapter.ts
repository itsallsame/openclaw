import type { BrowserContext } from "../../browser/context.js";
import type {
  PlatformAdapter,
  PlatformCapabilities,
  LoginStatus,
  PublishContent,
  PublishResult,
  PublishOptions,
  MediaItem,
} from "../types.js";
import { XHS_URLS, XHS_LIMITS } from "./selectors.js";
import {
  checkLogin,
  navigateToPublish as navigateToPublishWorkflow,
  uploadImages,
  fillTitle,
  fillContent,
  addTags,
  submitPublish,
} from "./workflows.js";

/**
 * Xiaohongshu platform capabilities
 */
const capabilities: PlatformCapabilities = {
  contentTypes: ["image", "video"],
  maxImages: XHS_LIMITS.maxImages,
  maxVideoSizeMB: XHS_LIMITS.maxVideoSizeMB,
  maxTitleLength: XHS_LIMITS.maxTitleLength,
  maxContentLength: XHS_LIMITS.maxContentLength,
  supportsTags: true,
  supportsSchedule: false,
  supportsDraft: true,
};

/**
 * Xiaohongshu platform adapter
 */
export const xiaohongshuAdapter: PlatformAdapter = {
  id: "xiaohongshu",
  name: "小红书",
  domains: ["xiaohongshu.com", "www.xiaohongshu.com", "creator.xiaohongshu.com"],
  capabilities,
  urls: {
    home: XHS_URLS.home,
    publish: XHS_URLS.publish,
    login: XHS_URLS.login,
  },

  async checkLoginStatus(ctx: BrowserContext): Promise<LoginStatus> {
    return checkLogin(ctx);
  },

  async navigateToPublish(ctx: BrowserContext, contentType?: string): Promise<void> {
    // Determine if this is a video or image post
    const type = contentType === 'video' ? 'video' : 'image';
    await navigateToPublishWorkflow(ctx, type);
  },

  async fillContent(ctx: BrowserContext, content: PublishContent): Promise<void> {
    // Fill title
    if (content.title) {
      await fillTitle(ctx, content.title);
    }

    // Fill body content
    if (content.body) {
      await fillContent(ctx, content.body);
    }

    // Add tags
    if (content.tags && content.tags.length > 0) {
      await addTags(ctx, content.tags);
    }
  },

  async uploadMedia(ctx: BrowserContext, media: MediaItem[], contentType?: string): Promise<void> {
    const type = contentType === 'video' ? 'video' : 'image';
    await uploadImages(ctx, media, type);
  },

  async submit(ctx: BrowserContext, options: PublishOptions): Promise<PublishResult> {
    return submitPublish(ctx, options);
  },

  validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check title length
    if (content.title && content.title.length > XHS_LIMITS.maxTitleLength) {
      errors.push(`Title must be ${XHS_LIMITS.maxTitleLength} characters or less (got ${content.title.length})`);
    }

    // Check content length
    if (content.body && content.body.length > XHS_LIMITS.maxContentLength) {
      errors.push(`Content must be ${XHS_LIMITS.maxContentLength} characters or less (got ${content.body.length})`);
    }

    // Check media
    if (!content.media || content.media.length === 0) {
      errors.push("At least one image is required for Xiaohongshu");
    } else if (content.media.length > XHS_LIMITS.maxImages) {
      errors.push(`Maximum ${XHS_LIMITS.maxImages} images allowed (got ${content.media.length})`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
