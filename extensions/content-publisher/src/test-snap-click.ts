// Test snapshot then click
import { callGateway } from "../../../src/gateway/call.js";

const TARGET_ID = "DA96BC82EA7EC58397B85BD384684CD7";

async function test() {
  console.log("=== 获取快照后立即点击 ===\n");

  // 1. 获取新快照
  console.log("1. 获取快照...");
  const snapshot = (await callGateway({
    method: "browser.request",
    params: {
      method: "GET",
      path: "/snapshot",
      query: { profile: "openclaw", targetId: TARGET_ID, format: "ai" },
    },
    timeoutMs: 30000,
  })) as { snapshot: string; url: string };

  console.log(`   URL: ${snapshot.url}`);

  // 查找上传图文
  const lines = snapshot.snapshot.split("\n");
  let ref: string | null = null;
  for (const line of lines) {
    if (line.includes("上传图文") && line.includes("[ref=")) {
      const match = line.match(/\[ref=(\w+)\]/);
      if (match) {
        ref = match[1];
        console.log(`   找到: ${ref} - ${line.trim().slice(0, 60)}`);
        break;
      }
    }
  }

  if (!ref) {
    console.log("   未找到上传图文元素");
    return;
  }

  // 2. 立即点击
  console.log(`\n2. 点击 ${ref}...`);
  const result = await callGateway({
    method: "browser.request",
    params: {
      method: "POST",
      path: "/act",
      query: { profile: "openclaw" },
      body: { kind: "click", ref, targetId: TARGET_ID },
    },
    timeoutMs: 30000,
  });
  console.log("   成功:", JSON.stringify(result));
}

test().catch((err) => console.error("错误:", err.message));
