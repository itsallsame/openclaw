// Test click action
import { callGateway } from "../../../src/gateway/call.js";

const TARGET_ID = "DA96BC82EA7EC58397B85BD384684CD7";

async function testClick() {
  console.log("=== 测试点击操作 ===\n");

  // 直接点击 e105
  console.log("尝试点击 e105 (上传图文)...");
  try {
    const result = await callGateway({
      method: "browser.request",
      params: {
        method: "POST",
        path: "/act",
        query: { profile: "openclaw" },
        body: {
          kind: "click",
          ref: "e105",
          targetId: TARGET_ID,
        },
      },
      timeoutMs: 30000,
    });
    console.log("点击成功:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("点击失败:", (err as Error).message);
  }
}

testClick().catch(console.error);
