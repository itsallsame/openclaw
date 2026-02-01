import { Type, type Static } from "@sinclair/typebox";

/**
 * Platform-specific configuration
 */
export const XiaohongshuConfigSchema = Type.Object({
  enabled: Type.Optional(Type.Boolean({ default: true })),
  autoSubmit: Type.Optional(Type.Boolean({ default: false, description: "Auto-click publish button" })),
  defaultTags: Type.Optional(Type.Array(Type.String(), { description: "Default tags to add" })),
}, { additionalProperties: false });

export type XiaohongshuConfig = Static<typeof XiaohongshuConfigSchema>;

/**
 * Platforms configuration
 */
export const PlatformsConfigSchema = Type.Object({
  xiaohongshu: Type.Optional(XiaohongshuConfigSchema),
}, { additionalProperties: false });

export type PlatformsConfig = Static<typeof PlatformsConfigSchema>;

/**
 * Media processing configuration
 */
export const MediaConfigSchema = Type.Object({
  maxImageSizeMB: Type.Optional(Type.Number({ default: 10, description: "Max image size in MB" })),
  autoResize: Type.Optional(Type.Boolean({ default: true, description: "Auto resize large images" })),
  imageQuality: Type.Optional(Type.Number({ default: 85, minimum: 1, maximum: 100 })),
}, { additionalProperties: false });

export type MediaConfig = Static<typeof MediaConfigSchema>;

/**
 * Content Publisher plugin configuration
 */
export const ContentPublisherConfigSchema = Type.Object({
  defaultProfile: Type.Optional(Type.String({ description: "Default browser profile to use" })),
  platforms: Type.Optional(PlatformsConfigSchema),
  media: Type.Optional(MediaConfigSchema),
  defaultTimeout: Type.Optional(Type.Number({ default: 120000, description: "Default timeout in ms" })),
}, { additionalProperties: false });

export type ContentPublisherConfig = Static<typeof ContentPublisherConfigSchema>;

/**
 * Config schema for plugin registration
 */
export const contentPublisherConfigSchema = {
  parse(value: unknown): ContentPublisherConfig {
    // Return empty config if value is not an object
    if (!value || typeof value !== "object") return {};

    // Cast to any to access properties
    const config = value as any;
    const result: ContentPublisherConfig = {};

    // Parse each field according to schema
    if (typeof config.defaultProfile === "string") {
      result.defaultProfile = config.defaultProfile;
    }

    if (typeof config.defaultTimeout === "number") {
      result.defaultTimeout = config.defaultTimeout;
    }

    if (config.platforms && typeof config.platforms === "object") {
      result.platforms = {};

      if (config.platforms.xiaohongshu && typeof config.platforms.xiaohongshu === "object") {
        const xhs = config.platforms.xiaohongshu;
        result.platforms.xiaohongshu = {};

        if (typeof xhs.enabled === "boolean") {
          result.platforms.xiaohongshu.enabled = xhs.enabled;
        }
        if (typeof xhs.autoSubmit === "boolean") {
          result.platforms.xiaohongshu.autoSubmit = xhs.autoSubmit;
        }
        if (Array.isArray(xhs.defaultTags)) {
          result.platforms.xiaohongshu.defaultTags = xhs.defaultTags.filter(
            (tag: unknown) => typeof tag === "string"
          );
        }
      }
    }

    if (config.media && typeof config.media === "object") {
      const media = config.media;
      result.media = {};

      if (typeof media.maxImageSizeMB === "number") {
        result.media.maxImageSizeMB = media.maxImageSizeMB;
      }
      if (typeof media.autoResize === "boolean") {
        result.media.autoResize = media.autoResize;
      }
      if (typeof media.imageQuality === "number") {
        result.media.imageQuality = media.imageQuality;
      }
    }

    return result;
  },
  uiHints: {
    defaultProfile: {
      label: "Default Browser Profile",
      placeholder: "openclaw",
    },
    defaultTimeout: {
      label: "Default Timeout (ms)",
      advanced: true,
    },
  },
};
