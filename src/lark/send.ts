import * as lark from "@larksuiteoapi/node-sdk";
import { loadConfig } from "../config/config.js";
import { resolveLarkAccount } from "./accounts.js";
import type { LarkSendOpts } from "./types.js";
import { danger, info, success } from "../globals.js";
import { chunkTextWithMode } from "../auto-reply/chunk.js";

const LARK_TEXT_CHUNK_LIMIT = 4000;

export async function sendMessageLark(
  to: string,
  text: string,
  opts: LarkSendOpts = {},
): Promise<void> {
  if (!text.trim()) {
    if (opts.verbose) {
      console.log(info("Skipping empty message"));
    }
    return;
  }

  const cfg = loadConfig();
  const account = resolveLarkAccount({
    cfg,
    accountId: opts.accountId,
  });

  const appId = opts.appId ?? account.appId;
  const appSecret = opts.appSecret ?? account.appSecret;

  if (!appId || !appSecret) {
    throw new Error("Lark App ID and App Secret are required");
  }

  // Create Lark client
  const client = new lark.Client({
    appId,
    appSecret,
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Feishu,
  });

  // Normalize target
  const chatId = normalizeLarkTarget(to);
  if (!chatId) {
    throw new Error(`Invalid Lark target: ${to}`);
  }

  // Chunk text if needed
  const chunks = chunkTextWithMode(text, LARK_TEXT_CHUNK_LIMIT, "length");

  // Send each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const msgType = opts.msgType ?? "text";

    try {
      if (msgType === "text") {
        await client.im.message.create({
          params: {
            receive_id_type: "chat_id",
          },
          data: {
            receive_id: chatId,
            msg_type: "text",
            content: JSON.stringify({ text: chunk }),
            ...(opts.replyMessageId && i === 0
              ? { reply_in_thread: true, root_id: opts.replyMessageId }
              : {}),
          },
        });
      } else if (msgType === "post") {
        // Send as rich text post
        await client.im.message.create({
          params: {
            receive_id_type: "chat_id",
          },
          data: {
            receive_id: chatId,
            msg_type: "post",
            content: JSON.stringify({
              zh_cn: {
                title: "",
                content: [
                  [
                    {
                      tag: "text",
                      text: chunk,
                    },
                  ],
                ],
              },
            }),
            ...(opts.replyMessageId && i === 0
              ? { reply_in_thread: true, root_id: opts.replyMessageId }
              : {}),
          },
        });
      } else if (msgType === "image" && opts.mediaUrl) {
        // Send image
        const imageKey = await uploadImageToLark(client, opts.mediaUrl);
        await client.im.message.create({
          params: {
            receive_id_type: "chat_id",
          },
          data: {
            receive_id: chatId,
            msg_type: "image",
            content: JSON.stringify({ image_key: imageKey }),
          },
        });
      }

      if (opts.verbose) {
        console.log(success(`✅ Sent message to ${chatId} (chunk ${i + 1}/${chunks.length})`));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(danger(`Failed to send message to ${chatId}: ${errMsg}`));
      throw err;
    }

    // Small delay between chunks to avoid rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

function normalizeLarkTarget(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip "lark:" prefix if present (from session context)
  const withoutPrefix = trimmed.startsWith("lark:") ? trimmed.slice(5) : trimmed;

  // Support various formats:
  // - chat_id: oc_xxx
  // - open_id: ou_xxx
  // - user_id: direct user ID
  // - email: user@example.com
  return withoutPrefix;
}

async function uploadImageToLark(client: lark.Client, mediaUrl: string): Promise<string> {
  // Download image
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const formData = new FormData();
  formData.append("image_type", "message");
  formData.append("image", new Blob([buffer]));

  // Upload to Lark
  const result: any = await client.im.v1.image.create({
    data: formData as any,
  });

  if (!result || !result.data) {
    throw new Error("Failed to upload image to Lark");
  }

  const imageKey = result.data?.image_key;
  if (!imageKey) {
    throw new Error("No image key returned from Lark");
  }

  return imageKey;
}

export function chunkLarkText(text: string, limit: number): string[] {
  return chunkTextWithMode(text, limit, "length");
}
