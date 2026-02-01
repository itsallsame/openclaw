import type { PlatformAdapter } from "./types.js";
import { xiaohongshuAdapter } from "./xiaohongshu/adapter.js";

/**
 * Registry of all platform adapters
 */
const adapters = new Map<string, PlatformAdapter>();

/**
 * Register a platform adapter
 */
export function registerPlatform(adapter: PlatformAdapter): void {
  adapters.set(adapter.id, adapter);
}

/**
 * Get a platform adapter by ID
 */
export function getPlatform(id: string): PlatformAdapter | undefined {
  return adapters.get(id);
}

/**
 * Get all registered platforms
 */
export function getAllPlatforms(): PlatformAdapter[] {
  return Array.from(adapters.values());
}

/**
 * Get platform IDs
 */
export function getPlatformIds(): string[] {
  return Array.from(adapters.keys());
}

/**
 * Check if a platform is registered
 */
export function hasPlatform(id: string): boolean {
  return adapters.has(id);
}

/**
 * Initialize all built-in platforms
 */
export function initializePlatforms(): void {
  registerPlatform(xiaohongshuAdapter);
}

// Auto-initialize on import
initializePlatforms();
