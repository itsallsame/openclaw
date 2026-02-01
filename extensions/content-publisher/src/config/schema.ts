import { Type, type Static } from "@sinclair/typebox";

/**
 * Platform-specific configuration
 */
export const XiaohongshuConfigSchema = Type.Object({
  enabled: Type.Optional(Type.Boolean({ default: true })),
  autoSubmit: Type.Optional(Type.Boolean({ default: false, description: "Auto-click publish button" })),
  defaultTags: Type.Optional(Type.Array(Type.String(), { description: "Default tags to add" })),
});

export type XiaohongshuConfig = Static<typeof XiaohongshuConfigSchema>;

/**
 * Platforms configuration
 */
export const PlatformsConfigSchema = Type.Object({
  xiaohongshu: Type.Optional(XiaohongshuConfigSchema),
});

export type PlatformsConfig = Static<typeof PlatformsConfigSchema>;

/**
 * Media processing configuration
 */
export const MediaConfigSchema = Type.Object({
  maxImageSizeMB: Type.Optional(Type.Number({ default: 10, description: "Max image size in MB" })),
  autoResize: Type.Optional(Type.Boolean({ default: true, description: "Auto resize large images" })),
  imageQuality: Type.Optional(Type.Number({ default: 85, minimum: 1, maximum: 100 })),
});

export type MediaConfig = Static<typeof MediaConfigSchema>;

/**
 * Content Publisher plugin configuration
 */
export const ContentPublisherConfigSchema = Type.Object({
  defaultProfile: Type.Optional(Type.String({ description: "Default browser profile to use" })),
  platforms: Type.Optional(PlatformsConfigSchema),
  media: Type.Optional(MediaConfigSchema),
  defaultTimeout: Type.Optional(Type.Number({ default: 120000, description: "Default timeout in ms" })),
});

export type ContentPublisherConfig = Static<typeof ContentPublisherConfigSchema>;

/**
 * Config schema for plugin registration
 */
export const contentPublisherConfigSchema = {
  parse(value: unknown): ContentPublisherConfig {
    if (!value || typeof value !== "object") return {};
    return value as ContentPublisherConfig;
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
