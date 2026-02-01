import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../../src/plugins/types.js";

import { BrowserContext } from "../browser/context.js";
import { getPlatform, getPlatformIds } from "../platforms/registry.js";
import type { ContentPublisherConfig } from "../config/schema.js";

/**
 * Create the platform_status tool
 */
export function createPlatformStatusTool(api: OpenClawPluginApi) {
  return {
    name: "platform_status",
    label: "Platform Status",
    description:
      "Check login status for a social media platform. Use this before publishing to verify the user is logged in.",
    parameters: Type.Object({
      platform: Type.String({
        description: `Platform to check. Available: ${getPlatformIds().join(", ")}`,
      }),
      profile: Type.Optional(
        Type.String({
          description: "Browser profile to use (default: from config or 'openclaw')",
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

      try {
        // Create browser context
        const ctx = new BrowserContext(api, profile);

        // Check if browser is running, start if needed
        try {
          await ctx.start();
        } catch {
          // Browser might already be running
        }

        // Check login status
        const status = await adapter.checkLoginStatus(ctx);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                platform: adapter.id,
                platformName: adapter.name,
                loggedIn: status.loggedIn,
                username: status.username,
                userId: status.userId,
                error: status.error,
                capabilities: adapter.capabilities,
              }),
            },
          ],
          details: {
            platform: adapter.id,
            loggedIn: status.loggedIn,
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
