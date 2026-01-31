import type { OpenClawConfig } from "../config/config.js";
import type { LarkAccountConfig, ResolvedLarkAccount } from "./types.js";

export function listLarkAccountIds(cfg: OpenClawConfig): string[] {
  return Object.keys((cfg.channels?.lark as any)?.accounts ?? {});
}

export function resolveDefaultLarkAccountId(cfg: OpenClawConfig): string {
  const accountIds = listLarkAccountIds(cfg);
  return accountIds[0] ?? "default";
}

export function resolveLarkAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedLarkAccount {
  const { cfg } = params;
  const accountId = params.accountId?.trim() || resolveDefaultLarkAccountId(cfg);
  const config = mergeLarkAccountConfig(cfg, accountId);

  // Resolve App ID
  let appId = config.appId ?? "";
  let appIdSource: "env" | "config" | "none" = "none";
  if (accountId === "default" && process.env.LARK_APP_ID) {
    appId = process.env.LARK_APP_ID;
    appIdSource = "env";
  } else if (config.appId) {
    appIdSource = "config";
  }

  // Resolve App Secret
  let appSecret = config.appSecret ?? "";
  let appSecretSource: "env" | "config" | "none" = "none";
  if (accountId === "default" && process.env.LARK_APP_SECRET) {
    appSecret = process.env.LARK_APP_SECRET;
    appSecretSource = "env";
  } else if (config.appSecret) {
    appSecretSource = "config";
  }

  return {
    accountId,
    enabled: config.enabled ?? true,
    name: config.name,
    appId,
    appSecret,
    encryptKey: config.encryptKey,
    verificationToken: config.verificationToken,
    config,
    appIdSource,
    appSecretSource,
  };
}

export function mergeLarkAccountConfig(cfg: OpenClawConfig, accountId: string): LarkAccountConfig {
  const larkConfig = (cfg.channels?.lark as any) ?? {};
  const globalConfig = larkConfig ?? {};
  const accountConfig = larkConfig?.accounts?.[accountId] ?? {};

  return {
    ...globalConfig,
    ...accountConfig,
    allowFrom: accountConfig.allowFrom ?? globalConfig.allowFrom,
    groupAllowFrom: accountConfig.groupAllowFrom ?? globalConfig.groupAllowFrom,
  };
}

export function isLarkAccountEnabled(account: ResolvedLarkAccount): boolean {
  return account.enabled && Boolean(account.appId) && Boolean(account.appSecret);
}

export function isLarkAccountConfigured(account: ResolvedLarkAccount): boolean {
  return Boolean(account.appId) && Boolean(account.appSecret);
}

export function listEnabledLarkAccounts(cfg: OpenClawConfig): ResolvedLarkAccount[] {
  return listLarkAccountIds(cfg)
    .map((accountId) => resolveLarkAccount({ cfg, accountId }))
    .filter((account) => isLarkAccountEnabled(account));
}
