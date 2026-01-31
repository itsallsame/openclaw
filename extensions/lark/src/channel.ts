import {
  getChatChannelMeta,
  DEFAULT_ACCOUNT_ID,
  type ChannelPlugin,
  type ChannelMessageActionAdapter,
} from "openclaw/plugin-sdk";

import { getLarkRuntime } from "./runtime.js";

const meta = getChatChannelMeta("lark");

const larkMessageActions: ChannelMessageActionAdapter = {
  listActions: (ctx) => getLarkRuntime().channel.lark.messageActions.listActions(ctx),
  handleAction: async (ctx) => await getLarkRuntime().channel.lark.messageActions.handleAction(ctx),
};

export const larkPlugin: ChannelPlugin = {
  id: "lark",
  meta: {
    ...meta,
    quickstartAllowFrom: true,
  },
  capabilities: {
    chatTypes: ["direct", "group", "thread"],
    reactions: false,
    media: true,
    threads: true,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.lark"] },
  config: {
    listAccountIds: (cfg) => {
      const accounts = cfg.channels?.lark?.accounts;
      if (!accounts || typeof accounts !== "object") return [DEFAULT_ACCOUNT_ID];
      return [DEFAULT_ACCOUNT_ID, ...Object.keys(accounts)];
    },
    resolveAccount: (cfg, accountId) => {
      try {
        const runtime = getLarkRuntime();
        const account = runtime.channel.lark.resolveLarkAccount({ cfg, accountId });
        return { accountId, enabled: account.enabled ?? true, ...account };
      } catch {
        return { accountId, enabled: false };
      }
    },
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    isConfigured: (account) => true,
    describeAccount: (account) => ({
      accountId: account.accountId || DEFAULT_ACCOUNT_ID,
      enabled: true,
      configured: true,
    }),
  },
  messaging: {
    targetResolver: {
      looksLikeId: (raw: string) => {
        const trimmed = raw.trim();
        // Lark ID formats:
        // - Chat ID: oc_xxx
        // - Open ID: ou_xxx
        // - User ID: starts with letters/numbers
        // - Email: contains @
        return /^(oc|ou|om)_[a-zA-Z0-9]+$/.test(trimmed) || trimmed.includes("@");
      },
    },
  },
  outbound: {
    deliveryMode: "direct",
    chunker: null,
    chunkerMode: "text",
    textChunkLimit: 4000,
    sendText: async ({ to, text, accountId, replyToId }) => {
      const send = getLarkRuntime().channel.lark.sendMessageLark;
      await send(to, text, {
        accountId: accountId ?? undefined,
        replyMessageId: replyToId ?? undefined,
        verbose: false,
      });
      return {
        channel: "lark",
        messageId: replyToId || "sent",
        chatId: to,
      };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId, replyToId }) => {
      const send = getLarkRuntime().channel.lark.sendMessageLark;
      await send(to, text, {
        accountId: accountId ?? undefined,
        replyMessageId: replyToId ?? undefined,
        mediaUrl,
        msgType: mediaUrl ? "image" : "text",
        verbose: false,
      });
      return {
        channel: "lark",
        messageId: replyToId || "sent",
        chatId: to,
      };
    },
  },
  actions: larkMessageActions,
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    collectStatusIssues: () => [],
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
    }),
    probeAccount: async () => ({ ok: true }),
    buildAccountSnapshot: ({ account, runtime }) => ({
      accountId: account.accountId,
      enabled: account.enabled ?? true,
      configured: true,
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      ctx.log?.info(`[${account.accountId}] starting Lark provider`);

      return getLarkRuntime().channel.lark.monitorLarkProvider({
        accountId: account.accountId,
        config: ctx.cfg,
        abortSignal: ctx.abortSignal,
        runtime: {
          log: (msg: string) => ctx.log?.info(msg),
          error: (msg: string) => ctx.log?.error(msg),
          exit: (code: number) => {
            ctx.log?.error(`Lark provider exit with code ${code}`);
          },
        },
      });
    },
  },
};
