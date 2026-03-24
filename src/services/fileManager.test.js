import { describe, it, expect, vi } from 'vitest';
import { calculateTotalUsage } from './fileManager';

// Mock Tauri fs and path plugins
vi.mock('@tauri-apps/plugin-fs', () => ({
    BaseDirectory: { AppData: 1, Document: 2 },
    mkdir: vi.fn(),
    exists: vi.fn(),
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    remove: vi.fn(),
    stat: vi.fn().mockResolvedValue({ size: 2048 })
}));

describe('fileManagerService', () => {
    it('calculates total size correctly', async () => {
        const notes = [
            {
                title: "Hello", // 5
                content: "World", // 5
                attachments: [
                    { data: "data:image/png;base64,AABBCCDD" } // 30 bytes * 0.75 = 23
                ]
            },
            {
                title: "Test", // 4
                content: "Local File", // 10
                attachments: [
                    { data: "/local/path/to/file.png" } // Uses stat() mock size 2048
                ]
            }
        ];

        const totalSize = await calculateTotalUsage(notes);
        // 5 + 5 + 23 = 33
        // 4 + 10 + 2048 = 2062
        // Total = 2095
        expect(totalSize).toBe(2095);
    });

    it('returns 0 for empty array or no notes', async () => {
        const size1 = await calculateTotalUsage(null);
        expect(size1).toBe(0);

        const size2 = await calculateTotalUsage([]);
        expect(size2).toBe(0);
    });
});
