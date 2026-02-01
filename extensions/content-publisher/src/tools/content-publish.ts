import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../../src/plugins/types.js";

import { BrowserContext } from "../browser/context.js";
import { getPlatform, getPlatformIds } from "../platforms/registry.js";
import type { ContentPublisherConfig } from "../config/schema.js";
import type { MediaItem, PublishContent, PublishOptions } from "../platforms/types.js";

/**
 * Media item input schema
 */
const MediaItemSchema = Type.Object({
  type: Type.Union([Type.Literal("url"), Type.Literal("path"), Type.Literal("base64")], {
    description: "Media source type",
  }),
  value: Type.String({ description: "URL, file path, or base64 data" }),
  filename: Type.Optional(Type.String({ description: "Optional filename" })),
});

/**
 * Download image from URL to temp file
 */
async function downloadImage(url: string, filename?: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const ext = filename?.split(".").pop() ?? "jpg";
  const tempPath = path.join(os.tmpdir(), `content-publisher-${Date.now()}.${ext}`);

  await fs.writeFile(tempPath, Buffer.from(buffer));
  return tempPath;
}

/**
 * Save base64 image to temp file
 */
async function saveBase64Image(data: string, filename?: string): Promise<string> {
  // Parse data URL if present
  let base64Data = data;
  let ext = "jpg";

  const match = data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (match) {
    ext = match[1] === "jpeg" ? "jpg" : match[1];
    base64Data = match[2];
  }

  const buffer = Buffer.from(base64Data, "base64");
  const tempPath = path.join(
    os.tmpdir(),
    filename ?? `content-publisher-${Date.now()}.${ext}`
  );

  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

/**
 * Prepare media items - convert URLs and base64 to file paths
 */
async function prepareMedia(
  items: Array<{ type: string; value: string; filename?: string }>
): Promise<MediaItem[]> {
  const prepared: MediaItem[] = [];
  const tempFiles: string[] = [];

  try {
    for (const item of items) {
      if (item.type === "path") {
        // Verify file exists
        await fs.access(item.value);
        prepared.push({
          type: "path",
          value: item.value,
          metadata: { filename: item.filename ?? path.basename(item.value) },
        });
      } else if (item.type === "url") {
        // Download to temp file
        const tempPath = await downloadImage(item.value, item.filename);
        tempFiles.push(tempPath);
        prepared.push({
          type: "path",
          value: tempPath,
          metadata: { filename: item.filename ?? path.basename(tempPath) },
        });
      } else if (item.type === "base64") {
        // Save to temp file
        const tempPath = await saveBase64Image(item.value, item.filename);
        tempFiles.push(tempPath);
        prepared.push({
          type: "path",
          value: tempPath,
          metadata: { filename: item.filename ?? path.basename(tempPath) },
        });
      }
    }

    return prepared;
  } catch (error) {
    // Clean up temp files on error
    for (const tempFile of tempFiles) {
      await fs.unlink(tempFile).catch(() => {});
    }
    throw error;
  }
}

/**
 * Create the content_publish tool
 */
export function createContentPublishTool(api: OpenClawPluginApi) {
  return {
    name: "content_publish",
    label: "Content Publish",
    description: `Publish content to social media platforms. Supports: ${getPlatformIds().join(", ")}.
Use platform_status first to check login status. Images are required for Xiaohongshu.`,
    parameters: Type.Object({
      platform: Type.String({
        description: `Target platform. Available: ${getPlatformIds().join(", ")}`,
      }),
      title: Type.Optional(
        Type.String({
          description: "Content title (required for some platforms, max 20 chars for Xiaohongshu)",
        })
      ),
      content: Type.String({
        description: "Main content/body text",
      }),
      images: Type.Optional(
        Type.Array(MediaItemSchema, {
          description: "Images to upload. Each item needs type (url/path/base64) and value",
        })
      ),
      tags: Type.Optional(
        Type.Array(Type.String(), {
          description: "Tags/topics to add (without # prefix)",
        })
      ),
      profile: Type.Optional(
        Type.String({
          description: "Browser profile to use (default: from config or 'openclaw')",
        })
      ),
      autoSubmit: Type.Optional(
        Type.Boolean({
          description: "Auto-click publish button (default: false, user clicks manually)",
        })
      ),
      draft: Type.Optional(
        Type.Boolean({
          description: "Save as draft instead of publishing",
        })
      ),
    }),

    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const platform = String(params.platform ?? "").toLowerCase();
      const pluginConfig = (api.pluginConfig ?? {}) as ContentPublisherConfig;
      const profile = String(params.profile ?? pluginConfig.defaultProfile ?? "openclaw");

      // Validate platform
      const adapter = getPlatform(platform);
      if (!adapter) {
        const available = getPlatformIds().join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: `Unknown platform: ${platform}. Available platforms: ${available}`,
              }),
            },
          ],
          isError: true,
          details: {},
        };
      }

      // Build content object
      const content: PublishContent = {
        title: params.title as string | undefined,
        body: String(params.content ?? ""),
        tags: params.tags as string[] | undefined,
        media: [],
      };

      // Prepare media
      const rawImages = params.images as Array<{ type: string; value: string; filename?: string }> | undefined;
      if (rawImages && rawImages.length > 0) {
        try {
          content.media = await prepareMedia(rawImages);
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: `Failed to prepare media: ${error instanceof Error ? error.message : String(error)}`,
                }),
              },
            ],
            isError: true,
            details: {},
          };
        }
      }

      // Validate content
      const validation = adapter.validateContent(content);
      if (!validation.valid) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: "Content validation failed",
                validationErrors: validation.errors,
              }),
            },
          ],
          isError: true,
          details: {},
        };
      }

      // Build options
      const platformConfig = pluginConfig.platforms?.[platform as keyof typeof pluginConfig.platforms];
      const options: PublishOptions = {
        draft: params.draft as boolean | undefined,
        autoSubmit: (params.autoSubmit as boolean | undefined) ??
                    (platformConfig as { autoSubmit?: boolean } | undefined)?.autoSubmit ??
                    false,
        timeout: pluginConfig.defaultTimeout ?? 120000,
      };

      try {
        // Create browser context
        const ctx = new BrowserContext(api, profile);

        // Start browser if needed
        try {
          await ctx.start();
        } catch {
          // Browser might already be running
        }

        // Check login status first
        const loginStatus = await adapter.checkLoginStatus(ctx);
        if (!loginStatus.loggedIn) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: `Not logged in to ${adapter.name}. Please login first using the browser.`,
                  loginUrl: adapter.urls.login,
                }),
              },
            ],
            isError: true,
            details: {},
          };
        }

        // Navigate to publish page
        await adapter.navigateToPublish(ctx);

        // Upload media first (for platforms that require it)
        if (content.media && content.media.length > 0) {
          await adapter.uploadMedia(ctx, content.media);
        }

        // Fill content
        await adapter.fillContent(ctx, content);

        // Submit
        const result = await adapter.submit(ctx, options);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: result.success,
                platform: adapter.id,
                platformName: adapter.name,
                message: result.message,
                postId: result.postId,
                postUrl: result.postUrl,
                error: result.error,
                autoSubmit: options.autoSubmit,
                draft: options.draft,
              }),
            },
          ],
          details: {
            platform: adapter.id,
            success: result.success,
            postId: result.postId,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                platform: adapter.id,
                error: message,
              }),
            },
          ],
          isError: true,
          details: {},
        };
      }
    },
  };
}
