import type { BrowserContext } from "../browser/context.js";

/**
 * Media item for publishing
 */
export interface MediaItem {
  type: "url" | "path" | "base64";
  value: string;
  metadata?: {
    filename?: string;
    mimeType?: string;
    alt?: string;
  };
}

/**
 * Content to publish
 */
export interface PublishContent {
  title?: string;
  body: string;
  tags?: string[];
  media?: MediaItem[];
}

/**
 * Publish options
 */
export interface PublishOptions {
  draft?: boolean;
  schedule?: string; // ISO 8601
  autoSubmit?: boolean;
  timeout?: number;
}

/**
 * Login status result
 */
export interface LoginStatus {
  loggedIn: boolean;
  username?: string;
  userId?: string;
  error?: string;
}

/**
 * Publish result
 */
export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  message: string;
  error?: string;
}

/**
 * Platform capabilities
 */
export interface PlatformCapabilities {
  contentTypes: ("text" | "image" | "video" | "article")[];
  maxImages: number;
  maxVideoSizeMB: number;
  maxTitleLength: number;
  maxContentLength: number;
  supportsTags: boolean;
  supportsSchedule: boolean;
  supportsDraft: boolean;
}

/**
 * Platform adapter interface
 */
export interface PlatformAdapter {
  /** Platform identifier */
  id: string;

  /** Display name */
  name: string;

  /** Platform domains */
  domains: string[];

  /** Platform capabilities */
  capabilities: PlatformCapabilities;

  /** URLs */
  urls: {
    home: string;
    publish: string;
    login?: string;
  };

  /**
   * Check if user is logged in
   */
  checkLoginStatus(ctx: BrowserContext): Promise<LoginStatus>;

  /**
   * Navigate to publish page
   */
  navigateToPublish(ctx: BrowserContext, contentType?: string): Promise<void>;

  /**
   * Fill content into the publish form
   */
  fillContent(ctx: BrowserContext, content: PublishContent): Promise<void>;

  /**
   * Upload media files
   */
  uploadMedia(ctx: BrowserContext, media: MediaItem[]): Promise<void>;

  /**
   * Submit the publish form
   */
  submit(ctx: BrowserContext, options: PublishOptions): Promise<PublishResult>;

  /**
   * Validate content before publishing
   */
  validateContent(content: PublishContent): { valid: boolean; errors: string[] };
}
