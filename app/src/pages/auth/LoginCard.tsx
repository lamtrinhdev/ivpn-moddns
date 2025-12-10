import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock } from "lucide-react";
import React, { type JSX, useState } from "react";
import modDNSLogo from "@/assets/logos/modDNS.svg";

interface LoginCardProps {
    onLogin?: (email: string, password: string, otp?: string) => void | Promise<void>;
    onPasskeyLogin?: (email: string) => void | Promise<void>;
    loading?: boolean;
    showOtp?: boolean;
    initialPasskeyMode?: boolean;
}

const LoginCard = ({ onLogin, onPasskeyLogin, loading = false, showOtp = false, initialPasskeyMode = false }: LoginCardProps): JSX.Element => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [isPasskeyMode, setIsPasskeyMode] = useState(initialPasskeyMode);
    const navigate = useNavigate();

    const handlePasskeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (onPasskeyLogin && email) {
            await onPasskeyLogin(email);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (onLogin) {
            if (showOtp) {
                await onLogin(email, password, otp);
            } else {
                await onLogin(email, password);
            }
        }
    };

    return (
        <Card className="flex flex-col items-center gap-[33px] p-11 bg-[var(--shadcn-ui-app-popover)] rounded-[var(--primitives-radius-radius-md)] border border-solid border-[var(--shadcn-ui-app-border)] w-full">
            <CardContent className="flex flex-col items-center gap-8 w-full p-0">
                {/* Logo and Description */}
                <div className="flex flex-col items-center w-full">
                    <div className="inline-flex items-center gap-[var(--spacing-spacing-16)] flex-col">
                        {/* Logo */}
                        <img
                            className="mb-8 w-[200px] h-10 mx-auto"
                            alt="modDNS logo"
                            src={modDNSLogo}
                            style={{ display: "block" }}
                        />
                    </div>

                    <div className="text-center max-w-[316px]">
                        <span className="text-[var(--tailwind-colors-slate-200)] font-normal text-sm leading-7">
                            The{" "}
                        </span>
                        <span className="font-semibold text-[var(--tailwind-colors-slate-50)] text-sm leading-7">
                            privacy-first
                        </span>
                        <span className="text-[var(--tailwind-colors-slate-200)] font-normal text-sm leading-7">
                            {" "}
                            DNS resolver in beta, developed by the team behind IVPN.
                        </span>
                    </div>
                </div>

                {/* Authentication Forms */}
                <div className="flex flex-col items-center gap-8 w-full">
                    <div className="flex flex-col items-start gap-6 w-full">
                        {isPasskeyMode ? (
                            /* Passkey Authentication */
                            <form data-testid="login-passkey-form" onSubmit={handlePasskeySubmit} className="flex flex-col items-start gap-4 w-full">
                                <div className="relative w-full">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--tailwind-colors-slate-100)]" />
                                    <Input
                                        data-testid="input-email-passkey"
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 bg-[var(--shadcn-ui-app-background)] border border-[var(--tailwind-colors-slate-700)] text-[var(--tailwind-colors-slate-100)] placeholder:text-[var(--tailwind-colors-slate-400)] font-normal text-sm rounded-md"
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                <Button
                                    data-testid="btn-login-passkey-submit"
                                    type="submit"
                                    className="w-full bg-[var(--tailwind-colors-rdns-600)] hover:bg-[var(--tailwind-colors-rdns-600)]/90 text-[var(--shadcn-ui-app-background)] font-medium text-sm rounded-md h-auto py-2 min-h-11 lg:min-h-0"
                                    disabled={loading || !email}
                                >
                                    {loading ? "Authenticating..." : "Login with passkey"}
                                </Button>
                            </form>
                        ) : (
                            /* Password Authentication */
                            <form data-testid="login-password-form" onSubmit={handlePasswordSubmit} className="flex flex-col items-start gap-4 w-full">
                                <div className="relative w-full">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--tailwind-colors-slate-100)]" />
                                    <Input
                                        data-testid="input-email"
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 bg-[var(--shadcn-ui-app-background)] border border-[var(--tailwind-colors-slate-700)] text-[var(--tailwind-colors-slate-100)] placeholder:text-[var(--tailwind-colors-slate-400)] font-normal text-sm rounded-md"
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-2 w-full">
                                    <div className="relative w-full">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--tailwind-colors-slate-100)]" />
                                        <Input
                                            data-testid="input-password"
                                            type="password"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 bg-[var(--shadcn-ui-app-background)] border border-[var(--tailwind-colors-slate-700)] text-[var(--tailwind-colors-slate-100)] placeholder:text-[var(--tailwind-colors-slate-400)] font-normal text-sm rounded-md"
                                            disabled={loading}
                                            required
                                        />
                                    </div>

                                    <button
                                        className="text-xs text-[var(--tailwind-colors-slate-200)] font-medium transition-colors duration-150 hover:text-[var(--tailwind-colors-rdns-600)] self-end inline-flex items-center min-h-11 lg:min-h-0"
                                        type="button"
                                        onClick={() => navigate("/reset-password")}
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* OTP input if 2FA is required */}
                                {showOtp && (
                                    <div className="relative w-full">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--tailwind-colors-slate-100)]" />
                                        <Input
                                            data-testid="input-otp"
                                            type="text"
                                            placeholder="2FA code"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            maxLength={16}
                                            className="pl-10 bg-[var(--shadcn-ui-app-background)] border border-[var(--tailwind-colors-slate-700)] text-[var(--tailwind-colors-slate-100)] placeholder:text-[var(--tailwind-colors-slate-400)] font-normal text-sm rounded-md"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                )}

                                <Button
                                    data-testid="btn-login-password-submit"
                                    type="submit"
                                    className="w-full bg-[var(--tailwind-colors-rdns-600)] hover:bg-[var(--tailwind-colors-rdns-600)]/90 text-[var(--shadcn-ui-app-background)] font-medium text-sm rounded-md h-auto py-2 min-h-11 lg:min-h-0"
                                    disabled={loading || !email || !password}
                                >
                                    {loading ? "Signing in..." : "Sign in"}
                                </Button>
                            </form>
                        )}

                        {/* Separator */}
                        <div className="relative w-full flex items-center justify-center">
                            <Separator className="flex-1 bg-[var(--tailwind-colors-slate-600)]" />
                            <div className="px-4 bg-[var(--shadcn-ui-app-popover)] text-[var(--tailwind-colors-slate-400)] font-normal text-sm">
                                OR
                            </div>
                            <Separator className="flex-1 bg-[var(--tailwind-colors-slate-600)]" />
                        </div>

                        {/* Toggle Authentication Method */}
                        <div className="flex flex-col items-center gap-4 w-full">
                            <Button
                                data-testid="btn-login-toggle-mode"
                                type="button"
                                variant="secondary"
                                onClick={() => setIsPasskeyMode(!isPasskeyMode)}
                                className="w-full bg-[var(--tailwind-colors-slate-800)] hover:bg-[var(--tailwind-colors-slate-900)]/90 text-[var(--tailwind-colors-rdns-600)] font-medium text-sm rounded-md h-auto py-2 min-h-11 lg:min-h-0"
                                disabled={loading}
                            >
                                {isPasskeyMode ? "Login with password" : "Login with passkey"}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default LoginCard;
