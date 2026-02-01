// Debug browser state
import { callGateway } from "../../../src/gateway/call.js";

async function debug() {
  console.log("=== 调试浏览器状态 ===\n");

  // 1. 获取标签页
  const tabs = (await callGateway({
    method: "browser.request",
    params: { method: "GET", path: "/tabs", query: { profile: "openclaw" } },
    timeoutMs: 30000,
  })) as { tabs: Array<{ targetId: string; url: string; title: string }> };

  console.log("标签页列表:");
  for (const tab of tabs.tabs) {
    console.log(`  - ${tab.targetId.slice(0, 8)}... : ${tab.title} (${tab.url.slice(0, 50)})`);
  }

  // 2. 找到小红书标签页
  const xhsTab = tabs.tabs.find((t) => t.url.includes("xiaohongshu.com"));
  if (!xhsTab) {
    console.log("\n未找到小红书标签页");
    return;
  }

  console.log(`\n小红书标签页: ${xhsTab.targetId}`);

  // 3. 获取快照
  const snapshot = (await callGateway({
    method: "browser.request",
    params: {
      method: "GET",
      path: "/snapshot",
      query: { profile: "openclaw", targetId: xhsTab.targetId, format: "ai" },
    },
    timeoutMs: 30000,
  })) as { snapshot: string; url: string; title: string };

  console.log(`\n快照 URL: ${snapshot.url}`);
  console.log(`快照标题: ${snapshot.title}`);
  console.log("\n快照内容 (前2000字符):");
  console.log(snapshot.snapshot?.slice(0, 2000));
}

debug().catch(console.error);
