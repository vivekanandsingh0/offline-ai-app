import { ToolId } from "../constants/ToolDefinitions";
import { UserClass } from "../store/useUserStore";

interface CacheKeyParams {
    userClass: UserClass | null;
    tool: ToolId | null;
    input: string;
}

// Simple in-memory cache for the session
const cache = new Map<string, string>();

// simple hash function for cache keys
const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
};

export const getCacheKey = ({ userClass, tool, input }: CacheKeyParams): string => {
    // Normalize input: lowercase, trim
    const normalizedInput = input.trim().toLowerCase();
    const key = `${userClass || 'none'}:${tool || 'chat'}:${simpleHash(normalizedInput)}`;
    return key;
};

export const getCachedResponse = (params: CacheKeyParams): string | null => {
    const key = getCacheKey(params);
    return cache.get(key) || null;
};

export const cacheResponse = (params: CacheKeyParams, response: string): void => {
    const key = getCacheKey(params);
    cache.set(key, response);
};

export const clearCache = () => {
    cache.clear();
};
