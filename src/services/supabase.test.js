import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSupabaseClient } = vi.hoisted(() => {
    return {
        mockSupabaseClient: {
            auth: {
                getSession: vi.fn(),
                getUser: vi.fn(),
                resetPasswordForEmail: vi.fn(),
                signInWithOAuth: vi.fn(),
                signInWithPasskey: vi.fn(),
                signInWithPassword: vi.fn(),
                verifyOtp: vi.fn(),
                registerPasskey: vi.fn(),
                signUp: vi.fn(),
                signOut: vi.fn(),
                onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
            },
            from: vi.fn()
        }
    };
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => mockSupabaseClient
}));

import { authService, dataService, getSyncedSettings, getOAuthRedirectUrl, supabase } from './supabase';

describe('Supabase authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getUser should return the user if successful', async () => {
        const mockUser = { id: 'test-user-123', email: 'test@example.com' };
        supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
        supabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

        const user = await authService.getUser();
        expect(user).toEqual(mockUser);
        expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    });

    it('getUser should return null and not throw if an error occurs', async () => {
        supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
        supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Network error' } });

        const user = await authService.getUser();
        expect(user).toBeNull();
    });

    it('validateSession should handle offline gracefully with a timeout', async () => {
        // Suppress console.warn for this expected error test
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock validateSession hanging timeout scenario by rejecting immediately or resolving slowly
        // Here we just test standard error handling.
        supabase.auth.getSession.mockRejectedValueOnce(new Error('Fetch failed'));

        const user = await authService.validateSession();
        expect(user).toBeFalsy();

        consoleSpy.mockRestore();
    });

    it('signIn should call supabase.auth.signInWithPassword', async () => {
        supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
        await authService.signIn('test@example.com', 'password123', 'captcha-login');
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123', options: { captchaToken: 'captcha-login' } });
    });

    it('does not require a captcha token in local development by default', async () => {
        supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

        const result = await authService.signIn('test@example.com', 'password123');

        expect(result.error).toBeNull();
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
            options: undefined,
        });
    });

    it('signIn and signUp pass captcha tokens to Supabase Auth', async () => {
        supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
        supabase.auth.signUp.mockResolvedValueOnce({ data: {}, error: null });

        await authService.signIn('test@example.com', 'password123', 'captcha-login');
        await authService.signUp('new@example.com', 'password123', 'newuser', 'captcha-register');

        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
            options: { captchaToken: 'captcha-login' },
        });
        expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
            email: 'new@example.com',
            password: 'password123',
            options: expect.objectContaining({ captchaToken: 'captcha-register' }),
        }));
    });

    it('sends password reset and verifies email OTP codes', async () => {
        supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
        supabase.auth.verifyOtp.mockResolvedValueOnce({ data: {}, error: null });

        await authService.sendPasswordReset('test@example.com', 'captcha-reset');
        await authService.verifyEmailOtp('test@example.com', '123456');

        expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
            redirectTo: 'http://localhost:3000/auth/callback',
            captchaToken: 'captcha-reset',
        });
        expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
            email: 'test@example.com',
            token: '123456',
            type: 'email',
        });
    });

    it('uses Supabase passkey helpers when WebAuthn is available', async () => {
        Object.defineProperty(window, 'PublicKeyCredential', {
            configurable: true,
            value: function PublicKeyCredential() {},
        });
        supabase.auth.signInWithPasskey.mockResolvedValueOnce({ data: {}, error: null });
        supabase.auth.registerPasskey.mockResolvedValueOnce({ data: {}, error: null });

        await authService.signInWithPasskey();
        await authService.registerPasskey();

        expect(supabase.auth.signInWithPasskey).toHaveBeenCalledTimes(1);
        expect(supabase.auth.registerPasskey).toHaveBeenCalledTimes(1);
    });

    it('does not call Supabase passkey helpers without WebAuthn support', async () => {
        Object.defineProperty(window, 'PublicKeyCredential', {
            configurable: true,
            value: undefined,
        });

        await expect(authService.signInWithPasskey()).resolves.toMatchObject({
            error: { message: expect.stringContaining('passkeys') },
        });
        await expect(authService.registerPasskey()).resolves.toMatchObject({
            error: { message: expect.stringContaining('passkeys') },
        });
        expect(supabase.auth.signInWithPasskey).not.toHaveBeenCalled();
        expect(supabase.auth.registerPasskey).not.toHaveBeenCalled();
    });

    it('signUp should call supabase.auth.signUp', async () => {
        supabase.auth.signUp.mockResolvedValueOnce({ data: {}, error: null });
        await authService.signUp('test@example.com', 'password123', 'testuser', 'captcha-register');
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
            options: { captchaToken: 'captcha-register', data: { username: 'testuser', nickname: 'testuser', subscription_level: 0 } }
        });
    });

    it('signOut should call supabase.auth.signOut', async () => {
        supabase.auth.signOut.mockResolvedValueOnce({ error: null });
        await authService.signOut();
        expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('signInWithOAuth uses the portal callback inside Tauri before returning to the app', async () => {
        window.__TAURI_INTERNALS__ = {};
        supabase.auth.signInWithOAuth.mockResolvedValueOnce({ data: { url: 'https://auth.example' }, error: null });

        await authService.signInWithOAuth('google');

        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
            provider: 'google',
            options: {
                redirectTo: 'https://portail.fiip.fr/auth/callback',
                skipBrowserRedirect: true,
            },
        });
        delete window.__TAURI_INTERNALS__;
    });

    it('getOAuthRedirectUrl keeps browser callbacks on the current origin', () => {
        delete window.__TAURI_INTERNALS__;
        expect(getOAuthRedirectUrl()).toBe('http://localhost:3000/auth/callback');
    });

    it('getPlanLevel should read the server-side profile plan before metadata', async () => {
        supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1', user_metadata: { subscription_level: 0 } } } } });
        const mockSingle = vi.fn().mockResolvedValue({ data: { plan_level: 2 }, error: null });
        supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: mockSingle
                })
            })
        });

        await expect(authService.getPlanLevel()).resolves.toBe(2);
    });

    it('updateSubscription writes the server profile plan before compatibility metadata', async () => {
        const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
        supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } });
        supabase.from.mockReturnValueOnce({ upsert });
        supabase.auth.updateUser = vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

        const result = await authService.updateSubscription(2, 'license-key');

        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
            id: 'user-1',
            plan_level: 2,
            plan_source: 'keyauth',
            plan_updated_at: expect.any(String),
        }), { onConflict: 'id' });
        expect(supabase.auth.updateUser).toHaveBeenCalledWith({
            data: {
                subscription_level: 2,
                license_key: 'license-key',
            }
        });
        expect(result.error).toBeNull();
    });
});

describe('Supabase dataService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // setup getUser mock for dataService methods that need it
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
        supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    });

    it('deleteNote should call supabase from("notes").delete()', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        supabase.from.mockReturnValueOnce({
            delete: vi.fn().mockReturnValue({
                eq: mockEq
            })
        });

        await dataService.deleteNote('note-1');
        expect(supabase.from).toHaveBeenCalledWith('notes');
        expect(mockEq).toHaveBeenCalledWith('id', 'note-1');
    });

    it('publishNote should update is_public to true', async () => {
        const planSingle = vi.fn().mockResolvedValue({ data: { plan_level: 1 }, error: null });
        const planEq = vi.fn().mockReturnValue({ single: planSingle });
        const readSingle = vi.fn().mockResolvedValue({ data: { id: 'note-1', is_locked: false, encrypted_content: null }, error: null });
        const readOwnerEq = vi.fn().mockReturnValue({ single: readSingle });
        const readNoteEq = vi.fn().mockReturnValue({ eq: readOwnerEq });
        const ownerEq = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'note-1' }, error: null })
            })
        });
        const noteEq = vi.fn().mockReturnValue({ eq: ownerEq });
        const update = vi.fn().mockReturnValue({ eq: noteEq });
        supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: planEq
            })
        }).mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: readNoteEq
            })
        }).mockReturnValueOnce({
            update
        });

        await dataService.publishNote('note-1');
        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(supabase.from).toHaveBeenCalledWith('notes');
        expect(noteEq).toHaveBeenCalledWith('id', 'note-1');
        expect(ownerEq).toHaveBeenCalledWith('user_id', 'user-1');
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            public_slug: expect.any(String),
            updated_at: expect.any(String),
        }));
    });

    it('publishNote should reject protected notes', async () => {
        const planSingle = vi.fn().mockResolvedValue({ data: { plan_level: 1 }, error: null });
        const planEq = vi.fn().mockReturnValue({ single: planSingle });
        const readSingle = vi.fn().mockResolvedValue({ data: { id: 'note-1', is_locked: true, encrypted_content: 'ENC:value' }, error: null });
        const readOwnerEq = vi.fn().mockReturnValue({ single: readSingle });
        const readNoteEq = vi.fn().mockReturnValue({ eq: readOwnerEq });
        supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: planEq
            })
        }).mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: readNoteEq
            })
        });

        const result = await dataService.publishNote('note-1');

        expect(result.error).toMatch(/protegees/);
        expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    it('saveNote should block a free user at five cloud notes before upserting', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: { subscription_level: 0 } } } } });
        supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { plan_level: 0 }, error: null })
                })
            })
        }).mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: Array.from({ length: 5 }, (_, index) => ({ id: `note-${index}` })), error: null })
            })
        });

        const result = await dataService.saveNote({ id: 'new-note', title: 'New', content: '', updatedAt: Date.now() });

        expect(result.error).toBe('FREE_NOTE_LIMIT_EXCEEDED');
        expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    it('publishNote should block public shares on the free plan', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: { subscription_level: 0 } } } } });

        const result = await dataService.publishNote('note-1');

        expect(result.error).toBe('FREE_PUBLIC_SHARE_DISABLED');
        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(supabase.from).not.toHaveBeenCalledWith('notes');
    });

    it('getSyncedSettings strips device-local settings before cloud save', () => {
        expect(getSyncedSettings({
            theme: 'light',
            language: 'fr',
            windowEffect: 'vibrancy',
            titlebarStyle: 'macos',
            audioInputId: 'mic-1',
            audioOutputId: 'speaker-1',
            biometricLockEnabled: true,
        })).toEqual({
            theme: 'dark',
            language: 'fr',
        });
    });

    it('registerCurrentDevice upserts an owner-scoped device row', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ ip: '203.0.113.10' }),
        });
        const select = vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: expect.any(String) }, error: null }),
        });
        const upsert = vi.fn().mockReturnValue({ select });
        supabase.from.mockReturnValueOnce({ upsert });

        const result = await dataService.registerCurrentDevice();

        expect(result.error).toBeNull();
        expect(supabase.from).toHaveBeenCalledWith('user_devices');
        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
            user_id: 'user-1',
            name: expect.stringContaining('Fiip'),
            ip_address: '203.0.113.10',
            last_seen_at: expect.any(String),
            revoked_at: null,
        }), { onConflict: 'id' });
        fetchSpy.mockRestore();
    });

    it('fetchProfile should fetch from profiles table', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: '123', nickname: 'test' }, error: null });
        supabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: mockSingle
                })
            }),
            upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockReturnValue({
                        data: { id: '123', nickname: 'test' },
                        error: null
                    })
                })
            })
        });

        const profile = await dataService.fetchProfile();
        expect(profile.data.nickname).toBe('test');
        expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
});
