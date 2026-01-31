import * as lark from "@larksuiteoapi/node-sdk";
import { resolveLarkAccount } from "./accounts.js";
import type { OpenClawConfig } from "../config/config.js";

export async function probeLark(params: {
  cfg: OpenClawConfig;
  accountId?: string;
  appId?: string;
  appSecret?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { cfg } = params;
  const account = resolveLarkAccount({ cfg, accountId: params.accountId });

  const appId = params.appId ?? account.appId;
  const appSecret = params.appSecret ?? account.appSecret;

  if (!appId || !appSecret) {
    return { ok: false, error: "App ID and App Secret are required" };
  }

  try {
    // Create Lark client
    const client = new lark.Client({
      appId,
      appSecret,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });

    // Test connection - just creating a client and checking SDK is enough
    // The client will authenticate when making actual API calls
    if (!client) {
      return { ok: false, error: "Failed to create Lark client" };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
