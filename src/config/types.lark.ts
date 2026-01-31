export type LarkConfig = {
  accounts?: Record<string, LarkAccountConfig>;
  allowFrom?: Array<string | number>;
  groupAllowFrom?: Array<string | number>;
};

export type LarkAccountConfig = {
  enabled?: boolean;
  name?: string;
  appId?: string;
  appSecret?: string;
  encryptKey?: string;
  verificationToken?: string;
  allowFrom?: Array<string | number>;
  groupAllowFrom?: Array<string | number>;
};
