import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/api/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { ModelAccount } from '@/api/client/api';
import { ModelAccountUpdateOperationEnum, ModelAccountUpdatePathEnum } from '@/api/client/api';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/general';
import { DialogActions } from '@/components/dialogs/DialogLayout';
import { beginEmailChangeReauth } from '@/lib/webauthn';
import { useAccountVerificationMethod } from '@/hooks/useAccountVerificationMethod';

interface ChangeEmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account: ModelAccount | null;
    onChanged: () => void; // callback after successful change
}

export default function ChangeEmailDialog({ open, onOpenChange, account, onChanged }: ChangeEmailDialogProps) {
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [reauthToken, setReauthToken] = useState<string | null>(null);
    const [reauthStatus, setReauthStatus] = useState<'idle' | 'in-progress' | 'verified' | 'error'>('idle');
    const [otp, setOtp] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const setAccount = useAppStore(s => s.setAccount);
    const handleMethodChange = useCallback(() => {
        setCurrentPassword('');
        setReauthToken(null);
        setReauthStatus('idle');
        setOtp('');
    }, []);

    const {
        method,
        hasPasskeys,
        passwordAvailable,
        showOtp,
        switchMethod,
        resetMethod,
    } = useAccountVerificationMethod({ account: account ?? null, open, onMethodChange: handleMethodChange });

    interface EmailChangeValuePassword {
        current_password: string;
        new_email: string;
    }
    interface EmailChangeValueReauth {
        reauth_token: string;
        new_email: string;
    }
    useEffect(() => {
        if (!open) {
            setOtp('');
            setCurrentPassword('');
            setReauthToken(null);
            setReauthStatus('idle');
        }
    }, [open]);

    const beginPasskeyReauth = async () => {
        if (!account) return;
        setReauthStatus('in-progress');
        // cleared state
        try {
            const token = await beginEmailChangeReauth();
            setReauthToken(token);
            setReauthStatus('verified');
            toast.success('Identity verified via passkey');
            setCurrentPassword('');
        } catch (e) {
            const err = e as { message?: string };
            const msg = err?.message || 'Passkey verification failed';
            // error surfaced via toast
            setReauthStatus('error');
            toast.error(msg);
        }
    };

    // Handle email change with optional 2FA
    const handleSubmit = async () => {
        if (!account) return;
        if (!newEmail.includes('@')) {
            toast.error('Please enter a valid email.');
            return;
        }
        if (method === 'password' && !currentPassword) {
            toast.error('Current password is required.');
            return;
        }
        if (method === 'passkey' && !reauthToken) {
            toast.error('Passkey verification is required.');
            return;
        }
        // OTP required only for password method
        if (showOtp && !otp) {
            toast.error('2FA code is required.');
            return;
        }

        setSubmitting(true);
        try {
            let value: EmailChangeValuePassword | EmailChangeValueReauth;
            if (method === 'passkey') {
                value = { reauth_token: reauthToken!, new_email: newEmail };
            } else {
                value = { current_password: currentPassword, new_email: newEmail };
            }
            const req = {
                updates: [
                    {
                        operation: ModelAccountUpdateOperationEnum.Replace,
                        path: ModelAccountUpdatePathEnum.Email,
                        value
                    }
                ]
            };

            // Send OTP only when password flow uses 2FA
            if (showOtp) {
                await api.Client.accountsApi.apiV1AccountsPatch(req, otp, ['totp']);
            } else {
                await api.Client.accountsApi.apiV1AccountsPatch(req);
            }

            const refreshed = await api.Client.accountsApi.apiV1AccountsCurrentGet();
            setAccount(refreshed.data);
            toast.success('Email updated. Please verify your new address.');
            handleOpenChange(false);
            onChanged();
        } catch (e) {
            const err = e as { response?: { data?: { error?: string } } };
            const msg = err.response?.data?.error || 'Failed to update email';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            // Reset state when closing
            setOtp('');
            setNewEmail('');
            setCurrentPassword('');
            setReauthToken(null);
            setReauthStatus('idle');
            resetMethod();
        } else {
            resetMethod();
        }
        onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className={`dialog-shell bg-[var(--shadcn-ui-app-background)] border-[var(--tailwind-colors-slate-600)] p-0 px-4 sm:px-0
                [&_[data-slot=dialog-close]_svg]:text-[var(--tailwind-colors-rdns-600)] transition-opacity duration-200 ease-out`}
            >
                <DialogHeader className="p-6 space-y-1.5">
                    <DialogTitle className="text-lg font-semibold text-[var(--tailwind-colors-slate-50)] tracking-[-0.45px] leading-[18px] font-['Roboto_Flex-SemiBold',Helvetica] mt-[-1px]">
                        Change email
                    </DialogTitle>
                    <DialogDescription className="text-sm font-normal text-[var(--tailwind-colors-slate-400)] font-['Roboto_Flex-Regular',Helvetica] leading-5">
                        Enter your new email address below.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 px-6 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="inline-flex text-[11px] rounded-md bg-[var(--tailwind-colors-slate-800)] p-1 shadow-sm w-full sm:w-auto">
                            <Button
                                type="button"
                                variant={method === 'password' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => switchMethod('password')}
                                disabled={!passwordAvailable}
                                className={cn(
                                    'flex-1 px-4 py-2 rounded-sm',
                                    method === 'password'
                                        ? 'bg-[var(--tailwind-colors-rdns-600)] text-[var(--tailwind-colors-slate-900)] hover:bg-[var(--tailwind-colors-rdns-600)]'
                                        : 'text-[var(--tailwind-colors-slate-400)] hover:text-[var(--tailwind-colors-slate-200)]',
                                    !passwordAvailable && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                Password
                            </Button>
                            <Button
                                type="button"
                                variant={method === 'passkey' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => switchMethod('passkey')}
                                disabled={!hasPasskeys}
                                className={cn(
                                    'flex-1 px-4 py-2 rounded-sm',
                                    method === 'passkey'
                                        ? 'bg-[var(--tailwind-colors-rdns-600)] text-[var(--tailwind-colors-slate-900)] hover:bg-[var(--tailwind-colors-rdns-600)]'
                                        : 'text-[var(--tailwind-colors-slate-400)] hover:text-[var(--tailwind-colors-slate-200)]',
                                    !hasPasskeys && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                Passkey
                            </Button>
                        </div>
                        <span className="text-[11px] text-[var(--tailwind-colors-slate-400)]">Choose verification method</span>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-[var(--tailwind-colors-slate-50)] font-medium">New email</label>
                        <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" autoFocus className="border-[var(--tailwind-colors-slate-700)] bg-[var(--tailwind-colors-slate-800)] text-[var(--tailwind-colors-slate-50)] h-10" />
                    </div>
                    {method === 'password' && (
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--tailwind-colors-slate-50)] font-medium">Current password</label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className="border-[var(--tailwind-colors-slate-700)] bg-[var(--tailwind-colors-slate-800)] text-[var(--tailwind-colors-slate-50)] h-10"
                            />
                        </div>
                    )}
                    {method === 'passkey' && (
                        <div className="space-y-5">
                            <label className="text-sm text-[var(--tailwind-colors-slate-50)] font-medium">Passkey verification</label>
                            <div className="flex items-center gap-3 mt-3">
                                <Button
                                    type="button"
                                    variant={reauthStatus === 'verified' ? 'default' : 'cancel'}
                                    size="lg"
                                    className={cn('flex-1 min-h-11 w-full sm:w-auto font-medium transition-colors',
                                        reauthStatus === 'verified'
                                            ? 'bg-[var(--tailwind-colors-rdns-600)] text-[var(--tailwind-colors-slate-900)] hover:bg-[var(--tailwind-colors-rdns-800)]'
                                            : 'border-[var(--tailwind-colors-slate-600)] text-[var(--tailwind-colors-rdns-600)] hover:border-[var(--tailwind-colors-slate-400)]')}
                                    onClick={beginPasskeyReauth}
                                    disabled={reauthStatus === 'in-progress' || submitting || reauthStatus === 'verified'}
                                >
                                    {reauthStatus === 'idle' && 'Verify with passkey'}
                                    {reauthStatus === 'in-progress' && 'Verifying...'}
                                    {reauthStatus === 'verified' && 'Passkey verified'}
                                    {reauthStatus === 'error' && 'Retry passkey'}
                                </Button>
                            </div>
                            {method === 'passkey' && reauthStatus !== 'verified' && (
                                <p className="text-xs text-[var(--tailwind-colors-slate-400)]">Authenticate with a stored passkey to confirm identity.</p>
                            )}
                        </div>
                    )}
                    {showOtp && (
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--tailwind-colors-slate-50)] font-medium">2FA code</label>
                            <Input
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        handleSubmit();
                                    }
                                }}
                                className="border-[var(--tailwind-colors-slate-700)] bg-[var(--tailwind-colors-slate-800)] text-[var(--tailwind-colors-slate-50)] h-10"
                            />
                            <p className="text-xs text-[var(--tailwind-colors-slate-400)]">6-digit code</p>
                        </div>
                    )}
                    <p className="text-xs text-[var(--tailwind-colors-slate-400)]">After changing your email it will be unverified until you complete the new verification OTP process.</p>
                </div>

                <DialogActions>
                    <Button
                        variant="cancel"
                        size="lg"
                        className="flex-1 min-w-32 font-medium"
                        onClick={() => handleOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="default"
                        size="lg"
                        className="flex-1 min-w-32 bg-[var(--tailwind-colors-rdns-600)] text-[var(--tailwind-colors-slate-900)] hover:!bg-[var(--tailwind-colors-rdns-800)]"
                        onClick={handleSubmit}
                        disabled={submitting || (method === 'passkey' && reauthStatus !== 'verified') || (showOtp && !otp)}
                    >
                        {submitting
                            ? 'Updating...'
                            : method === 'passkey'
                                ? (reauthStatus === 'verified'
                                    ? (showOtp ? 'Update email' : 'Update email')
                                    : 'Verify passkey first')
                                : 'Update email'}
                    </Button>
                </DialogActions>
            </DialogContent>
        </Dialog>
    );
}