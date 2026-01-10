import { decode } from '@msgpack/msgpack';

/**
 * Structure of the decoded .mind file
 * Based on MindAR compiler-base.js exportData() method
 */
interface MindFileData {
    v: number;  // Version (currently 2)
    dataList: Array<{
        targetImage: { width: number; height: number };
        trackingData: unknown;
        matchingData: unknown;
    }>;
}

/**
 * Parse a .mind file buffer and extract metadata
 * @param buffer - ArrayBuffer of the .mind file
 * @returns Object containing target count and version
 */
export function parseMindFile(buffer: ArrayBuffer): { targetCount: number; version: number } {
    try {
        const data = decode(new Uint8Array(buffer)) as MindFileData;

        if (!data || !data.dataList) {
            console.warn('[mind-parser] Invalid .mind file structure');
            return { targetCount: 0, version: 0 };
        }

        return {
            targetCount: data.dataList.length,
            version: data.v || 0
        };
    } catch (error) {
        console.error('[mind-parser] Failed to parse .mind file:', error);
        return { targetCount: 0, version: 0 };
    }
}

/**
 * Fetch a .mind file from URL and parse it
 * @param url - URL of the .mind file
 * @returns Promise resolving to target count and version
 */
export async function parseMindFileFromUrl(url: string): Promise<{ targetCount: number; version: number }> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        return parseMindFile(buffer);
    } catch (error) {
        console.error('[mind-parser] Failed to fetch .mind file:', error);
        return { targetCount: 0, version: 0 };
    }
}
