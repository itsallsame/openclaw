// Test publishing to Xiaohongshu using evaluate method
import { callGateway } from "../../../src/gateway/call.js";

const PROFILE = "openclaw";
let currentTargetId: string | null = null;

async function browserRequest(method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
  const query: Record<string, unknown> = { profile: PROFILE };
  if (currentTargetId) {
    query.targetId = currentTargetId;
  }
  return await callGateway({
    method: "browser.request",
    params: {
      method,
      path,
      query,
      body: body ? { ...body, targetId: currentTargetId } : undefined,
    },
    timeoutMs: 30000,
  });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function evaluate(fn: string): Promise<unknown> {
  const result = (await browserRequest("POST", "/act", {
    kind: "evaluate",
    targetId: currentTargetId,
    fn,
  })) as { result: unknown };
  return result.result;
}

async function testPublish() {
  console.log("=== 小红书发布测试 (Evaluate 方式) ===\n");

  try {
    // 1. 检查当前页面
    console.log("1. 检查浏览器状态...");
    const tabs = (await browserRequest("GET", "/tabs")) as {
      tabs: Array<{ targetId: string; url: string; title: string }>;
    };
    console.log(`   当前有 ${tabs.tabs.length} 个标签页`);

    const xhsTab = tabs.tabs.find((t) => t.url.includes("xiaohongshu.com"));
    if (!xhsTab) {
      console.log("   未找到小红书页面，正在打开...");
      const result = (await browserRequest("POST", "/tabs/open", {
        url: "https://creator.xiaohongshu.com/publish/publish?source=official",
      })) as { targetId: string };
      currentTargetId = result.targetId;
      await sleep(5000);
    } else {
      console.log(`   找到小红书页面: ${xhsTab.title}`);
      currentTargetId = xhsTab.targetId;
      await browserRequest("POST", "/tabs/focus", { targetId: currentTargetId });
    }

    console.log(`   当前 targetId: ${currentTargetId}`);

    // 2. 点击"上传图文"标签
    console.log("\n2. 切换到图文上传模式...");
    const clickResult = (await evaluate(`() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const target = elements.find(el =>
        el.textContent?.trim() === '上传图文' &&
        el.offsetParent !== null
      );
      if (target) {
        target.click();
        return { success: true };
      }
      return { success: false, reason: 'element not found' };
    }`)) as { success: boolean; reason?: string };

    if (!clickResult.success) {
      console.log(`   ⚠️ 未找到上传图文按钮: ${clickResult.reason}`);
      return;
    }
    console.log("   已点击上传图文标签");
    await sleep(1500);

    // 3. 上传图片
    console.log("\n3. 上传图片...");
    const imagePath = "/tmp/test-moltbook.jpg";

    // 使用 evaluate 找到文件输入框并触发点击
    const uploadResult = (await evaluate(`() => {
      const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
      if (inputs.length > 0) {
        return { success: true, count: inputs.length };
      }
      return { success: false, reason: 'no file input found' };
    }`)) as { success: boolean; count?: number; reason?: string };

    if (!uploadResult.success) {
      console.log(`   ⚠️ 未找到文件输入框: ${uploadResult.reason}`);
      return;
    }
    console.log(`   找到 ${uploadResult.count} 个文件输入框`);

    // 使用 file-chooser hook 上传文件
    await browserRequest("POST", "/hooks/file-chooser", {
      paths: [imagePath],
      element: "input[type=file]",
      targetId: currentTargetId,
    });
    console.log("   图片上传请求已发送");
    await sleep(3000);

    // 4. 填写标题
    console.log("\n4. 填写标题...");
    const title = "Moltbook 好用";
    const titleResult = (await evaluate(`(title) => {
      // 查找标题输入框
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      const titleInput = inputs.find(el => {
        const placeholder = el.getAttribute('placeholder') || '';
        return placeholder.includes('标题') || placeholder.includes('title');
      });
      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      }
      return { success: false, reason: 'title input not found' };
    }`)) as { success: boolean; reason?: string };

    if (!titleResult.success) {
      console.log(`   ⚠️ 未找到标题输入框: ${titleResult.reason}`);
    } else {
      console.log(`   已填写标题: "${title}"`);
    }
    await sleep(500);

    // 5. 填写正文内容
    console.log("\n5. 填写正文内容...");
    const content = "发现一个超棒的工具 Moltbook，效率提升神器！";
    const contentResult = (await evaluate(`(content) => {
      // 查找正文输入框（通常是 textarea 或 contenteditable）
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const contentInput = textareas.find(el => {
        const placeholder = el.getAttribute('placeholder') || '';
        return placeholder.includes('正文') || placeholder.includes('内容') || placeholder.includes('描述');
      });

      if (contentInput) {
        contentInput.value = content;
        contentInput.dispatchEvent(new Event('input', { bubbles: true }));
        contentInput.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, type: 'textarea' };
      }

      // 尝试查找 contenteditable 元素
      const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
      if (editables.length > 0) {
        const target = editables[0];
        target.textContent = content;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return { success: true, type: 'contenteditable' };
      }

      return { success: false, reason: 'content input not found' };
    }`)) as { success: boolean; type?: string; reason?: string };

    if (!contentResult.success) {
      console.log(`   ⚠️ 未找到内容输入框: ${contentResult.reason}`);
    } else {
      console.log(`   已填写内容 (${contentResult.type}): "${content}"`);
    }
    await sleep(500);

    // 6. 截图保存
    console.log("\n6. 完成！");
    console.log("   内容已填写，请在浏览器中检查并手动点击发布按钮。");

    const screenshot = (await browserRequest("POST", "/screenshot", { targetId: currentTargetId })) as {
      path: string;
    };
    console.log(`   截图已保存: ${screenshot.path}`);
  } catch (err) {
    console.error("\n错误:", (err as Error).message);
    console.error((err as Error).stack);
    process.exit(1);
  }
}

testPublish();

