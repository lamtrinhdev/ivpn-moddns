import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDnsConnectionStatus } from '@/hooks/useDnsConnectionStatus';
import { useAppStore } from '@/store/general';
import axios from 'axios';

vi.mock('axios');

// Helper to advance timers and flush pending promises
async function advance(ms: number) {
    vi.advanceTimersByTime(ms);
    // wait microtasks
    await Promise.resolve();
}

describe('useDnsConnectionStatus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        // reset store
        const { setActiveProfile, setProfiles } = useAppStore.getState();
        setProfiles([] as any);
        setActiveProfile(null as any);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initially shows checking placeholder with resolver placeholder', async () => {
        // prevent immediate resolution causing state update outside act
        (axios.get as any).mockImplementationOnce(() => new Promise(() => { }));
        let resultRef: any;
        await act(async () => {
            const { result } = renderHook(() => useDnsConnectionStatus(5000));
            resultRef = result;
            // allow microtask queue flush
            await Promise.resolve();
        });
        const status = resultRef.current.status;
        expect(status.badge.text).toBe('Checking...');
        expect(status.resolver).toBe('Determining DNS resolver...');
    });

    it('handles successful ok response with current active profile', async () => {
        const profile = { profile_id: 'p1', id: 'p1', name: 'Profile One' } as any;
        const { setActiveProfile, setProfiles } = useAppStore.getState();
        setProfiles([profile]);
        setActiveProfile(profile);

        (axios.get as any).mockResolvedValueOnce({ status: 200, data: { status: 'ok', profile_id: 'p1', asn: '', asn_organization: 'Org', ip: '1.1.1.1' } });

        const { result } = renderHook(() => useDnsConnectionStatus(5000));

        await act(async () => {
            await advance(0); // allow first request promise to resolve
        });

        const status = result.current.status;
        expect(status.badge.text).toBe('Connected');
        expect(status.resolver).toContain('currently using modDNS with this profile');
        expect(status.resolver.length).toBeGreaterThan(0);
    });

    it('handles successful ok response with different profile', async () => {
        const active = { profile_id: 'p1', id: 'p1', name: 'Profile One' } as any;
        const other = { profile_id: 'p2', id: 'p2', name: 'Other Profile' } as any;
        const { setActiveProfile, setProfiles } = useAppStore.getState();
        setProfiles([active, other]);
        setActiveProfile(active);

        (axios.get as any).mockResolvedValueOnce({ status: 200, data: { status: 'ok', profile_id: 'p2', asn: '', asn_organization: 'Org', ip: '1.1.1.1' } });

        const { result } = renderHook(() => useDnsConnectionStatus(5000));

        await act(async () => { await advance(0); });

        const status = result.current.status;
        expect(status.badge.text).toBe('Different Profile');
        expect(status.resolver).toContain('Other Profile');
    });

    it('handles disconnected 404 case', async () => {
        (axios.get as any).mockRejectedValueOnce({ response: { status: 404, data: { error: 'disconnected' } } });

        const { result } = renderHook(() => useDnsConnectionStatus(5000));

        await act(async () => {
            await advance(0);
        });

        const status = result.current.status;
        expect(status.badge.text).toBe('Disconnected');
        expect(status.resolver).toBe('This device is not configured to use modDNS.');
    });

    it('handles generic error and keeps resolver stable', async () => {
        (axios.get as any).mockResolvedValueOnce({ status: 200, data: { status: 'ok', profile_id: 'p1', asn: '', asn_organization: 'Org', ip: '1.1.1.1' } });
        // second poll triggers error
        (axios.get as any).mockRejectedValueOnce(new Error('network'));

        const profile = { profile_id: 'p1', id: 'p1', name: 'Profile One' } as any;
        const { setActiveProfile, setProfiles } = useAppStore.getState();
        setProfiles([profile]);
        setActiveProfile(profile);

        const { result } = renderHook(() => useDnsConnectionStatus(10));

        await act(async () => {
            await advance(0); // first success
        });

        const firstResolver = result.current.status.resolver;
        expect(firstResolver.length).toBeGreaterThan(0);

        await act(async () => {
            await advance(15); // second poll triggers error
        });

        const status = result.current.status;
        expect(status.badge.text).toBe('Error');
        expect(status.resolver).toBe(firstResolver); // stable
    });

    it('keeps previous resolver during loading between polls', async () => {
        // first success
        (axios.get as any).mockResolvedValueOnce({ status: 200, data: { status: 'ok', profile_id: 'p1', asn: '', asn_organization: 'Org', ip: '1.1.1.1' } });
        // second pending: we'll not resolve yet
        let secondResolve: any;
        (axios.get as any).mockImplementationOnce(() => new Promise(res => { secondResolve = res; }));

        const profile = { profile_id: 'p1', id: 'p1', name: 'Profile One' } as any;
        const { setActiveProfile, setProfiles } = useAppStore.getState();
        setProfiles([profile]);
        setActiveProfile(profile);

        const { result } = renderHook(() => useDnsConnectionStatus(10));

        await act(async () => { await advance(0); }); // first resolves

        const stableResolver = result.current.status.resolver;
        expect(stableResolver.length).toBeGreaterThan(0);

        // advance to trigger second poll (pending)
        await act(async () => { await advance(12); });

        // still shows stable resolver while loading
        expect(result.current.status.resolver).toBe(stableResolver);

        // complete second poll with different profile id to simulate change
        secondResolve({ status: 200, data: { status: 'ok', profile_id: 'p1', asn: '', asn_organization: 'Org2', ip: '2.2.2.2' } });
        await act(async () => { await advance(0); });

        expect(result.current.status.resolver).toContain('modDNS with this profile');
    });

    it('does not send requests when disabled', () => {
        const spy = axios.get as any;
        renderHook(() => useDnsConnectionStatus(50, { enabled: false }));
        // Advance time well beyond one interval
        vi.advanceTimersByTime(500);
        expect(spy).not.toHaveBeenCalled();
    });
});
