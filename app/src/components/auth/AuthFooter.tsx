interface AuthFooterProps {
    variant?: "absolute" | "relative";
}

export default function AuthFooter({ variant = "absolute" }: AuthFooterProps) {
    const containerClass = variant === "absolute"
        ? "absolute bottom-4 left-1/2 transform -translate-x-1/2"
        : "mt-8 flex justify-center";

    return (
        <div className={containerClass}>
            <div className="flex items-center gap-4">
                <a
                    href="/tos"
                    className="text-sm !text-[var(--tailwind-colors-slate-100)] hover:!text-[var(--tailwind-colors-slate-200)] cursor-pointer transition-colors no-underline"
                    title="Go to Terms of Service page"
                >
                    Terms of Service
                </a>
                <span className="text-sm text-[var(--tailwind-colors-slate-300)]">|</span>
                <a
                    href="/privacy"
                    className="text-sm !text-[var(--tailwind-colors-slate-100)] hover:!text-[var(--tailwind-colors-slate-200)] cursor-pointer transition-colors no-underline"
                    title="Go to Privacy Policy page"
                >
                    Privacy Policy
                </a>
                <span className="text-sm text-[var(--tailwind-colors-slate-300)]">|</span>
                <a
                    href="/standalone-faq"
                    className="text-sm !text-[var(--tailwind-colors-slate-100)] hover:!text-[var(--tailwind-colors-slate-200)] cursor-pointer transition-colors no-underline"
                    title="Go to FAQ page"
                >
                    FAQ
                </a>
                <span className="text-sm text-[var(--tailwind-colors-slate-300)]">|</span>
                <a
                    href="https://ivpn.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm !text-[var(--tailwind-colors-slate-100)] hover:!text-[var(--tailwind-colors-slate-200)] cursor-pointer transition-colors no-underline"
                >
                    IVPN
                </a>
            </div>
        </div>
    );
}
