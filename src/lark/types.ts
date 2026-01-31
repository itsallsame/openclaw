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

export type ResolvedLarkAccount = {
  accountId: string;
  enabled: boolean;
  name?: string;
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
  config: LarkAccountConfig;
  appIdSource: "env" | "config" | "none";
  appSecretSource: "env" | "config" | "none";
};

export type LarkMessageEvent = {
  sender: {
    sender_id: {
      open_id?: string;
      user_id?: string;
      union_id?: string;
    };
    sender_type?: string;
    tenant_key?: string;
  };
  message: {
    message_id: string;
    chat_id: string;
    chat_type: "p2p" | "group";
    message_type:
      | "text"
      | "post"
      | "image"
      | "file"
      | "audio"
      | "media"
      | "sticker"
      | "interactive";
    content: string;
    mentions?: Array<{
      key: string;
      id: {
        open_id?: string;
        user_id?: string;
        union_id?: string;
      };
      name: string;
      tenant_key: string;
    }>;
  };
};

export type LarkSendOpts = {
  appId?: string;
  appSecret?: string;
  accountId?: string;
  verbose?: boolean;
  mediaUrl?: string;
  msgType?: "text" | "post" | "image" | "interactive";
  replyMessageId?: string;
  silent?: boolean;
};
