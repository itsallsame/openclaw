import type { OpenClawPluginApi } from "../../src/plugins/types.js";

import { createContentPublishTool } from "./src/tools/content-publish.js";
import { createPlatformStatusTool } from "./src/tools/platform-status.js";
import { contentPublisherConfigSchema } from "./src/config/schema.js";

const plugin = {
  id: "content-publisher",
  name: "Content Publisher",
  description: "Publish content to social media platforms (Xiaohongshu, etc.)",
  configSchema: contentPublisherConfigSchema,
  register(api: OpenClawPluginApi) {
    api.registerTool(createPlatformStatusTool(api), { optional: true });
    api.registerTool(createContentPublishTool(api), { optional: true });
  },
};

export default plugin;
