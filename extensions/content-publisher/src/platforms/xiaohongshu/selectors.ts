/**
 * Xiaohongshu page element selectors
 * These are CSS selectors and text patterns used to locate elements
 */

export const XHS_SELECTORS = {
  // Login detection
  login: {
    userAvatar: ".user-avatar",
    loginButton: "登录",
    loginModal: ".login-modal",
  },

  // Publish page
  publish: {
    // Tab selection
    uploadContent: "div.upload-content",
    creatorTab: "div.creator-tab",
    uploadImageTab: "上传图文",
    uploadVideoTab: "上传视频",

    // Image upload
    uploadInput: ".upload-input",
    uploadArea: ".upload-wrapper",
    imagePreview: ".img-preview-area .pr",
    videoPreview: ".video-preview-area, .upload-video-preview",

    // Title input - 实际使用的选择器
    titleInput: "div.d-input input",
    titleInputClass: "d-input",
    titlePlaceholder: "填写标题",

    // Content editor - TipTap 编辑器（不是 Quill）
    contentEditor: ".tiptap.ProseMirror",
    contentEditorAlt: "div[contenteditable='true']",
    contentPlaceholder: "输入正文描述",
    textboxRole: '[role="textbox"]',

    // Tags
    tagContainer: "#creator-editor-topic-container",
    tagInput: ".topic-input",
    tagSuggestion: ".item",

    // Submit
    publishButtons: ["发布", "发布笔记", "立即发布"],
    draftButtons: ["暂存离开", "存草稿", "保存草稿", "草稿", "存为草稿"],

    // Status
    publishSuccess: "发布成功",
    publishFailed: "发布失败",
  },

  // Creator center
  creator: {
    dashboard: ".creator-dashboard",
    noteList: ".note-list",
    noteItem: ".note-item",
  },
};

/**
 * Xiaohongshu URLs
 */
export const XHS_URLS = {
  home: "https://www.xiaohongshu.com",
  creator: "https://creator.xiaohongshu.com",
  publish: "https://creator.xiaohongshu.com/publish/publish?source=official",
  login: "https://creator.xiaohongshu.com/login",
};

/**
 * Xiaohongshu content limits
 */
export const XHS_LIMITS = {
  maxTitleLength: 20,
  maxContentLength: 1000,
  maxImages: 18,
  maxVideoSizeMB: 500,
  maxImageSizeMB: 20,
  supportedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  supportedVideoTypes: ["video/mp4", "video/quicktime"],
};
