import { jsonResult, readStringParam } from "../../../agents/tools/common.js";
import { listEnabledLarkAccounts } from "../../../lark/accounts.js";
import type { ChannelMessageActionAdapter, ChannelMessageActionName } from "../types.js";

export const larkMessageActions: ChannelMessageActionAdapter = {
  listActions: ({ cfg }) => {
    const accounts = listEnabledLarkAccounts(cfg);
    if (accounts.length === 0) return [];
    const actions = new Set<ChannelMessageActionName>(["send"]);
    return Array.from(actions);
  },
  extractToolSend: ({ args }) => {
    const action = typeof args.action === "string" ? args.action.trim() : "";
    if (action === "send") {
      const to = typeof args.to === "string" ? args.to : undefined;
      return to ? { to } : null;
    }
    return null;
  },
  handleAction: async ({ action, params, cfg, accountId }) => {
    if (action === "send") {
      throw new Error("Send should be handled by outbound, not actions handler.");
    }
    throw new Error(`Action ${action} not supported for lark.`);
  },
};
