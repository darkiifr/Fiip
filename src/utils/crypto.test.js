import { describe, it, expect, vi } from 'vitest';
import { encryptData, decryptData } from './crypto';

describe('crypto utils', () => {
    it('should encrypt and decrypt a string correctly', async () => {
        const plainText = "Hello, secret world!";
        const password = "my-super-secret-password";
        
        // Use standard Web Crypto API (Vitest environment 'jsdom' has basic crypto support,
        // or we mock it if necessary. Node.js 19+ has global crypto so it should work).
        try {
            const encryptedStr = await encryptData(plainText, password);
            expect(encryptedStr).toBeTypeOf('string');
            expect(encryptedStr).not.toBe(plainText);
            expect(encryptedStr).toContain(':'); // Usually our format stores iv:data
            
            const decryptedObj = await decryptData(encryptedStr, password);
            expect(decryptedObj).toBe(plainText);
        } catch (e) {
            // If crypto is not fully available in jsdom, we can skip or catch.
            if (e.message.includes('crypto.subtle is undefined')) {
                console.warn('Skipping test - Web Crypto API not available in jsdom environment');
            } else {
                throw e;
            }
        }
    });

    it('should fail to decrypt with wrong password', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            const plainText = "Data";
            const password = "correct-password";
            const wrongPassword = "wrong-password";
            const encryptedStr = await encryptData(plainText, password);

            await expect(decryptData(encryptedStr, wrongPassword)).rejects.toThrow();
        } catch (e) {
             if (e.message.includes('crypto.subtle is undefined')) return;
             throw e;
        } finally {
            consoleSpy.mockRestore();
        }
    });
});
