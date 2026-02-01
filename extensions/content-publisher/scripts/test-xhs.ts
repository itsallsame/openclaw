#!/usr/bin/env node
/**
 * Test script for Xiaohongshu content publisher
 */

import { BrowserContext } from "../src/browser/context.js";
import {
  checkLogin,
  navigateToPublish,
  uploadImages,
  fillTitle,
  fillContent,
  addTags,
  submitPublish
} from "../src/platforms/xiaohongshu/workflows.js";

// Mock API for testing
const mockApi = {
  config: {
    gateway: {
      url: "ws://localhost:18800"
    }
  }
} as any;

async function testXhsPublish() {
  console.log("🧪 Starting Xiaohongshu publish test...\n");

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
    await navigateToPublish(ctx);
    console.log("   ✅ Navigation successful");

    // Step 3: Upload images (MUST be done first!)
    console.log("\n3️⃣ Uploading test image...");
    // Create a test image if it doesn't exist
    const testImagePath = "/tmp/test-xhs.jpg";
    const fs = await import("fs/promises");
    try {
      await fs.access(testImagePath);
    } catch {
      console.log("   ⚠️  Test image not found, skipping upload test");
      console.log("   Please create a test image at /tmp/test-xhs.jpg to test upload");
      return;
    }
    await uploadImages(ctx, [testImagePath]);
    console.log("   ✅ Image uploaded");

    // Wait for form to appear after upload
    await ctx.sleep(3000);

    // Step 4: Fill title
    console.log("\n4️⃣ Filling title...");
    await fillTitle(ctx, "测试标题 - OpenClaw自动发布");
    console.log("   ✅ Title filled");

    // Step 5: Fill content
    console.log("\n5️⃣ Filling content...");
    await fillContent(ctx, "这是测试内容\n\n使用OpenClaw自动发布到小红书");
    console.log("   ✅ Content filled");

    // Step 5: Add tags (optional)
    console.log("\n5️⃣ Adding tags...");
    await addTags(ctx, ["测试", "自动化"]);
    console.log("   ✅ Tags added");

    // Step 6: Submit (draft mode, don't actually publish)
    console.log("\n6️⃣ Saving as draft...");
    const result = await submitPublish(ctx, { draft: true, autoSubmit: false });
    console.log(`   Result: ${result.success ? "✅" : "❌"} ${result.message}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    console.log("\n✅ Test completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run test
testXhsPublish().catch(console.error);
