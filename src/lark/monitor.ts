import type { OpenClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import { resolveLarkAccount } from "./accounts.js";
import { danger, info, logVerbose } from "../globals.js";
import { logInfo } from "../logger.js";
import { resolveAgentRoute } from "../routing/resolve-route.js";
import { resolveThreadSessionKeys } from "../routing/session-key.js";
import { dispatchInboundMessage } from "../auto-reply/dispatch.js";
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
import { createReplyDispatcherWithTyping } from "../auto-reply/reply/reply-dispatcher.js";
import { resolveHumanDelayConfig } from "../agents/identity.js";
import { createReplyPrefixContext } from "../channels/reply-prefix.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import { recordInboundSession } from "../channels/session.js";
import { resolveStorePath } from "../config/sessions.js";
import type { ReplyPayload } from "../auto-reply/types.js";

export type MonitorLarkOpts = {
  runtime?: RuntimeEnv;
  abortSignal?: AbortSignal;
  accountId?: string;
  config?: OpenClawConfig;
  autoStart?: boolean;
  allowFrom?: Array<string | number>;
  groupAllowFrom?: Array<string | number>;
};

function resolveRuntime(opts: MonitorLarkOpts): RuntimeEnv {
  return (
    opts.runtime ?? {
      log: console.log,
      error: console.error,
      exit: (code: number): never => {
        throw new Error(`exit ${code}`);
      },
    }
  );
}

export async function monitorLarkProvider(opts: MonitorLarkOpts = {}): Promise<void> {
  const runtime = resolveRuntime(opts);
  const cfg = opts.config ?? require("../config/config.js").loadConfig();
  const account = resolveLarkAccount({ cfg, accountId: opts.accountId });

  if (!account.appId || !account.appSecret) {
    runtime.error(danger("Lark App ID and App Secret are required"));
    runtime.exit(1);
    return;
  }

  logInfo(`Lark monitor configured for account: ${account.accountId}`, runtime);

  // Import Lark SDK dynamically
  const lark = await import("@larksuiteoapi/node-sdk");

  // Create event dispatcher
  const eventDispatcher = new lark.EventDispatcher({
    encryptKey: account.encryptKey || "",
    verificationToken: account.verificationToken || "",
    loggerLevel: lark.LoggerLevel.info,
  });

  // Register message handler
  eventDispatcher.register({
    "im.message.receive_v1": async (data: any) => {
      try {
        const message = data.message;
        const sender = data.sender;
        const chatId = message.chat_id;
        const senderId = sender.sender_id?.open_id;
        const messageType = message.message_type;
        const content = JSON.parse(message.content);
        const isGroup = message.chat_type === "group";

        logInfo(`Lark message from ${senderId} in ${chatId}: ${messageType}`, runtime);

        // Check allowlist
        const allowFrom = Array.isArray(account.config.allowFrom) ? account.config.allowFrom : [];
        const groupAllowFrom = Array.isArray(account.config.groupAllowFrom)
          ? account.config.groupAllowFrom
          : [];
        const allowList = isGroup ? groupAllowFrom : allowFrom;

        if (allowList.length > 0 && !allowList.includes("*") && !allowList.includes(senderId)) {
          logInfo(`Lark message from ${senderId} rejected (not in allowlist)`, runtime);
          return;
        }

        // Extract text content
        let text = "";
        if (messageType === "text") {
          text = content.text;
        } else if (messageType === "post") {
          // Rich text - extract text from post content
          const post = content.post;
          if (post && post.zh_cn) {
            text = post.zh_cn.content.map((block: any) => block.text).join("\n");
          }
        }

        if (!text) {
          logInfo(`Lark message type ${messageType} not supported yet`, runtime);
          return;
        }

        // Build message context for Agent
        const messageId = message.message_id;
        const timestamp = message.create_time ? parseInt(message.create_time) : Date.now();
        const senderName = sender.sender_id?.user_id || senderId;

        // Resolve session keys
        const threadKeys = resolveThreadSessionKeys({
          baseSessionKey: `lark:${account.accountId}:${chatId}`,
        });

        // Resolve agent route
        const route = resolveAgentRoute({
          cfg,
          channel: "lark",
          accountId: account.accountId,
          peer: {
            kind: isGroup ? "group" : "dm",
            id: chatId,
          },
        });

        // Resolve store path with agent ID
        const storePath = resolveStorePath(cfg.session?.store, {
          agentId: route.agentId,
        });

        // Record channel activity
        recordChannelActivity({
          channel: "lark",
          accountId: account.accountId,
          direction: "inbound",
          at: timestamp,
        });

        // Build inbound context using finalizeInboundContext
        const ctxPayload = finalizeInboundContext({
          Body: text,
          RawBody: text,
          CommandBody: text,
          From: `lark:${senderId}`,
          To: `lark:${chatId}`,
          SessionKey: threadKeys.sessionKey,
          AccountId: route.accountId,
          ChatType: isGroup ? "group" : "direct",
          ConversationLabel: isGroup ? `Lark Group ${chatId}` : `Lark DM`,
          SenderName: senderName,
          SenderId: senderId,
          Provider: "lark" as const,
          Surface: "lark" as const,
          MessageSid: messageId,
          ParentSessionKey: threadKeys.parentSessionKey,
          Timestamp: timestamp,
          CommandAuthorized: true, // TODO: Add proper command authorization
          CommandSource: "text" as const,
          OriginatingChannel: "lark" as const,
          OriginatingTo: `lark:${chatId}`,
        });

        // Record inbound session
        await recordInboundSession({
          storePath,
          sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
          ctx: ctxPayload,
          updateLastRoute: !isGroup
            ? {
                sessionKey: route.mainSessionKey,
                channel: "lark",
                to: `lark:${chatId}`,
                accountId: route.accountId,
              }
            : undefined,
          onRecordError: (err: unknown) => {
            logVerbose(`lark: failed updating session meta: ${String(err)}`);
          },
        });

        logVerbose(`Lark inbound: chat=${chatId} from=${senderId} text="${text.slice(0, 100)}..."`);

        // Create reply prefix context
        const prefixContext = createReplyPrefixContext({
          cfg,
          agentId: route.agentId,
        });

        // Create reply dispatcher with typing indicator support
        const { sendMessageLark } = await import("./send.js");

        const { dispatcher, replyOptions, markDispatchIdle } = createReplyDispatcherWithTyping({
          responsePrefix: prefixContext.responsePrefix,
          responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
          humanDelay: resolveHumanDelayConfig(cfg, route.agentId),
          deliver: async (payload: ReplyPayload) => {
            const replyText = payload.text || "";
            if (!replyText.trim()) {
              logVerbose("Skipping empty reply");
              return;
            }

            // Send reply to Lark
            await sendMessageLark(chatId, replyText, {
              accountId: account.accountId,
              replyMessageId: messageId,
            });

            logVerbose(`Lark reply sent to ${chatId}: ${replyText.slice(0, 100)}...`);
          },
          onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            runtime.error(danger(`Lark reply error: ${message}`));
          },
          // Lark doesn't have typing indicators in the same way
          onReplyStart: async () => {
            logVerbose(`Starting reply to Lark message ${messageId}`);
          },
        });

        // Dispatch to Agent system
        logVerbose(`Dispatching Lark message to agent: ${route.agentId}`);

        const { queuedFinal } = await dispatchInboundMessage({
          ctx: ctxPayload,
          cfg,
          dispatcher,
          replyOptions: {
            ...replyOptions,
            disableBlockStreaming: true, // Lark doesn't support draft streaming
          },
        });

        // Mark dispatch complete
        markDispatchIdle();

        if (queuedFinal) {
          logVerbose(`Lark message dispatch completed for ${messageId}`);
        }
      } catch (err: any) {
        runtime.error(danger(`Lark message handler error: ${err.message}`));
        if (err.stack) {
          logVerbose(err.stack);
        }
      }
    },
  });

  logInfo("[info]: [ 'event-dispatch is ready' ]", runtime);

  // Create WebSocket client
  const wsClient = new lark.WSClient({
    appId: account.appId,
    appSecret: account.appSecret,
    domain: lark.Domain.Feishu,
    loggerLevel: lark.LoggerLevel.info,
    autoReconnect: true,
  });

  logInfo("[info]: [ 'client ready' ]", runtime);

  // Start the WebSocket client with event dispatcher
  await wsClient.start({ eventDispatcher });

  console.log(info("✅ Lark channel ready (WebSocket connected with Agent system)"));
  console.log(info("📝 Send a message to the bot in Lark - it will respond using AI"));

  // Keep alive
  if (opts.abortSignal) {
    await new Promise<void>((resolve) => {
      opts.abortSignal?.addEventListener("abort", () => {
        resolve();
      });
    });
  } else {
    await new Promise(() => {});
  }
}
