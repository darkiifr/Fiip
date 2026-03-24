import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSupabaseClient } = vi.hoisted(() => {
    return {
        mockSupabaseClient: {
            auth: {
                getSession: vi.fn(),
                getUser: vi.fn(),
                signInWithPassword: vi.fn(),
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

import { authService, dataService, supabase } from './supabase';

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
        await authService.signIn('test@example.com', 'password123');
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    });

    it('signUp should call supabase.auth.signUp', async () => {
        supabase.auth.signUp.mockResolvedValueOnce({ data: {}, error: null });
        await authService.signUp('test@example.com', 'password123', 'testuser');
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
            options: {
                data: {
                    username: 'testuser',
                    subscription_level: 0
                }
            }
        });
    });

    it('signOut should call supabase.auth.signOut', async () => {
        supabase.auth.signOut.mockResolvedValueOnce({ error: null });
        await authService.signOut();
        expect(supabase.auth.signOut).toHaveBeenCalled();
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
        const mockEq2 = { 
            select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'note-1' }, error: null }) }) 
        };
        const mockEq1 = { eq: vi.fn().mockReturnValue(mockEq2) };
        supabase.from.mockReturnValueOnce({
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue(mockEq1)
            })
        });

        await dataService.publishNote('note-1');
        expect(supabase.from).toHaveBeenCalledWith('notes');
    });

    it('fetchProfile should fetch from profiles table', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { username: 'test' }, error: null });
        supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: mockSingle
                })
            })
        });

        const profile = await dataService.fetchProfile();
        expect(profile.data.username).toBe('test');
        expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
});
