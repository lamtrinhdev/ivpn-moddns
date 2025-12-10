import { describe, it, expect, vi, beforeEach } from 'vitest';
// Ensure jsdom environment
// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangeEmailDialog from '@/pages/account_preferences/ChangeEmailDialog';
import type { ModelAccount, ModelCredential } from '@/api/client/api';
import { useAppStore } from '@/store/general';

vi.mock('@/api/api', () => {
    return {
        default: {
            Client: {
                accountsApi: {
                    apiV1AccountsPatch: vi.fn().mockResolvedValue({}),
                    apiV1AccountsCurrentGet: vi.fn().mockResolvedValue({ data: { email: 'new@example.com', email_verified: false } })
                }
            }
        }
    };
});

// simple helper to access store
const getAccount = () => useAppStore.getState().account;

describe('ChangeEmailDialog', () => {
    beforeEach(() => {
        useAppStore.getState().setAccount({ email: 'old@example.com', email_verified: true } as ModelAccount);
        useAppStore.getState().setPasskeys([]);
    });

    it('submits change and refreshes account', async () => {
        const onChanged = vi.fn();
        render(<ChangeEmailDialog open account={getAccount()} onOpenChange={() => { }} onChanged={onChanged} />);
        // Switch to password method (default is passkey now)
        fireEvent.click(screen.getByText('Password'));

        fireEvent.change(screen.getByPlaceholderText('new@example.com'), { target: { value: 'new@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

        fireEvent.click(screen.getByText('Update email'));

        await waitFor(() => expect(onChanged).toHaveBeenCalled());
        expect(getAccount()?.email).toBe('new@example.com');
        expect(getAccount()?.email_verified).toBe(false);
    });

    it('prefers passkey verification when available', () => {
        useAppStore.getState().setPasskeys([
            { id: 'cred-1' } as unknown as ModelCredential,
        ]);
        render(<ChangeEmailDialog open account={getAccount()} onOpenChange={() => { }} onChanged={() => { }} />);

        expect(screen.getByText('Verify with passkey')).toBeInTheDocument();
        expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    });
});
