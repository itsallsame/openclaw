// Test using evaluate to click
import { callGateway } from "../../../src/gateway/call.js";

const TARGET_ID = "DA96BC82EA7EC58397B85BD384684CD7";

async function testEvaluate() {
  console.log("=== 使用 evaluate 点击 ===\n");

  try {
    // 使用 evaluate 查找并点击"上传图文"
    const result = await callGateway({
      method: "browser.request",
      params: {
        method: "POST",
        path: "/act",
        query: { profile: "openclaw" },
        body: {
          kind: "evaluate",
          targetId: TARGET_ID,
          fn: `() => {
            // 查找包含"上传图文"文本的元素
            const elements = Array.from(document.querySelectorAll('*'));
            const target = elements.find(el =>
              el.textContent?.trim() === '上传图文' &&
              el.offsetParent !== null
            );
            if (target) {
              target.click();
              return { success: true, clicked: true };
            }
            return { success: false, reason: 'element not found' };
          }`,
        },
      },
      timeoutMs: 30000,
    });
    console.log("执行结果:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("错误:", (err as Error).message);
  }
}

testEvaluate().catch(console.error);
