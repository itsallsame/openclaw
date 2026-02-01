#!/usr/bin/env node
/**
 * Test script for Xiaohongshu video publisher
 */

import { BrowserContext } from "../src/browser/context.js";
import {
  checkLogin,
} from "../src/platforms/xiaohongshu/workflows.js";

// Mock API for testing
const mockApi = {
  config: {
    gateway: {
      url: "ws://localhost:18800"
    }
  }
} as any;

async function testXhsVideoPublish() {
  console.log("🧪 Starting Xiaohongshu video publish test...\n");

  const ctx = new BrowserContext(mockApi, "openclaw");

  try {
    // Step 1: Check login status
    console.log("1️⃣ Checking login status...");
    const loginStatus = await checkLogin(ctx);
    console.log(`   Login status: ${loginStatus.loggedIn ? "✅ Logged in" : "❌ Not logged in"}`);

    if (!loginStatus.loggedIn) {
      console.log("   Please login to Xiaohongshu first!");
      return;
    }

    // Step 2: Navigate to publish page
    console.log("\n2️⃣ Navigating to publish page...");
    await ctx.navigate("https://creator.xiaohongshu.com/publish/publish?source=official");
    await ctx.sleep(3000);
    console.log("   ✅ Navigation successful");

    // Step 3: Click "上传视频" tab
    console.log("\n3️⃣ Clicking '上传视频' tab...");
    const tabClicked = await ctx.evaluate<boolean>(`
      (() => {
        const tabs = document.querySelectorAll('div.creator-tab');
        for (const tab of tabs) {
          const text = (tab.textContent || '').trim();
          if (text === '上传视频') {
            tab.click();
            return true;
          }
        }
        return false;
      })()
    `);

    if (!tabClicked) {
      console.log("   ❌ Failed to find '上传视频' tab");
      return;
    }

    await ctx.sleep(2000);
    console.log("   ✅ Tab clicked");

    // Step 4: Upload video
    console.log("\n4️⃣ Uploading video...");
    const videoPath = "/Users/ahaha/Downloads/highlights-01.mp4";

    // Try to upload using file-chooser hook
    try {
      await ctx.uploadToSelector([videoPath], "input[type='file']", { timeoutMs: 10000 });
      console.log("   ✅ Video uploaded via file-chooser");
    } catch (error) {
      console.log(`   ⚠️  File-chooser failed: ${error instanceof Error ? error.message : String(error)}`);
      console.log("   Trying DataTransfer fallback...");

      // Fallback to DataTransfer
      const fs = await import("fs/promises");
      const buffer = await fs.readFile(videoPath);
      const base64 = buffer.toString("base64");

      const uploaded = await ctx.evaluate<boolean>(`
        (async () => {
          const base64Data = ${JSON.stringify(base64)};
          const fileName = "highlights-01.mp4";

          // Convert base64 to blob
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'video/mp4' });

          // Create File object
          const file = new File([blob], fileName, { type: 'video/mp4' });

          // Find file input
          const input = document.querySelector('input[type="file"]');
          if (!input) {
            throw new Error('File input not found');
          }

          // Set files using DataTransfer
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;

          // Trigger events
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));

          return true;
        })()
      `);

      if (uploaded) {
        console.log("   ✅ Video uploaded via DataTransfer");
      } else {
        console.log("   ❌ Upload failed");
        return;
      }
    }

    // Step 5: Wait for video processing
    console.log("\n5️⃣ Waiting for video processing...");
    console.log("   (This may take a while for a 10MB video...)");

    // Wait up to 2 minutes for video to be processed
    const maxWait = 120000; // 2 minutes
    const startTime = Date.now();
    let processed = false;

    while (Date.now() - startTime < maxWait) {
      await ctx.sleep(5000);

      // Check if title input appeared (indicates video is processed)
      const titleVisible = await ctx.evaluate<boolean>(`
        (() => {
          const titleInput = document.querySelector('div.d-input input');
          return titleInput !== null;
        })()
      `);

      if (titleVisible) {
        processed = true;
        break;
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`   ⏳ Waiting... (${elapsed}s elapsed)`);
    }

    if (!processed) {
      console.log("   ⚠️  Video processing timeout (2 minutes)");
      console.log("   The video might still be processing. Please check manually.");
      return;
    }

    console.log("   ✅ Video processed");

    // Step 6: Fill title
    console.log("\n6️⃣ Filling title...");
    const titleFilled = await ctx.evaluate<boolean>(`
      (() => {
        const input = document.querySelector('div.d-input input');
        if (!input) return false;

        input.value = '测试视频 - OpenClaw自动发布';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);

    if (titleFilled) {
      console.log("   ✅ Title filled");
    } else {
      console.log("   ❌ Failed to fill title");
    }

    // Step 7: Fill content
    console.log("\n7️⃣ Filling content...");
    const contentFilled = await ctx.evaluate<boolean>(`
      (() => {
        const editor = document.querySelector('.tiptap.ProseMirror');
        if (!editor) return false;

        editor.innerHTML = '<p>这是测试视频内容</p><p>使用OpenClaw自动发布到小红书</p>';
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);

    if (contentFilled) {
      console.log("   ✅ Content filled");
    } else {
      console.log("   ❌ Failed to fill content");
    }

    console.log("\n✅ Video upload test completed!");
    console.log("   Please manually check the page and click publish button if needed.");

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run test
testXhsVideoPublish().catch(console.error);
