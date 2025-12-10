import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    className?: string;
    maxWidthClassName?: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    delay?: number;
    shiftY?: number; // optional vertical shift after positioning (useful to avoid covering adjacent elements)
}

// Lightweight tooltip (no portal) adequate for simple icon triggers; avoids extra dependency.
export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    className,
    maxWidthClassName = 'max-w-[280px] md:max-w-[320px]',
    side = 'top',
    align = 'center',
    delay = 150,
    shiftY = 0,
}) => {
    const [open, setOpen] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const triggerRef = useRef<HTMLSpanElement | null>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    const clear = () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); };

    const show = () => {
        clear();
        timeoutRef.current = window.setTimeout(() => setOpen(true), delay);
    };
    const hide = () => { clear(); setOpen(false); };

    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spacing = 8;
            const base: React.CSSProperties = { position: 'fixed', zIndex: 9999 };
            switch (side) {
                case 'bottom':
                    base.top = rect.bottom + spacing; break;
                case 'left':
                    base.top = rect.top; base.left = rect.left - spacing; base.transform = 'translateX(-100%)'; break;
                case 'right':
                    base.top = rect.top; base.left = rect.right + spacing; break;
                case 'top':
                default:
                    base.top = rect.top - spacing; base.transform = 'translateY(-100%)'; break;
            }
            // Horizontal alignment adjustments
            if (side === 'top' || side === 'bottom') {
                if (align === 'center') {
                    base.left = rect.left + rect.width / 2;
                    base.transform = (base.transform ? base.transform + ' ' : '') + 'translateX(-50%)';
                } else if (align === 'end') {
                    base.left = rect.right; base.transform = (base.transform ? base.transform + ' ' : '') + 'translateX(-100%)';
                } else { // start
                    base.left = rect.left;
                }
            } else { // left/right vertical alignment
                if (align === 'center') {
                    base.top = rect.top + rect.height / 2; base.transform = (base.transform ? base.transform + ' ' : '') + 'translateY(-50%)';
                } else if (align === 'end') {
                    base.top = rect.bottom; base.transform = (base.transform ? base.transform + ' ' : '') + 'translateY(-100%)';
                }
            }
            // Viewport collision avoidance (basic)
            const vw = window.innerWidth; const vh = window.innerHeight;
            if (typeof base.left === 'number') {
                if (base.left < 4) base.left = 4;
                if (base.left > vw - 4) base.left = vw - 4;
            }
            if (typeof base.top === 'number') {
                if (base.top < 4) base.top = 4;
                if (base.top > vh - 4) base.top = vh - 4;
            }
            setStyle(base);
        }
    }, [open, side, align]);

    // Apply vertical shift after base style computed
    useEffect(() => {
        if (open && shiftY !== 0) {
            setStyle(prev => {
                if (typeof prev.top === 'number') {
                    return { ...prev, top: prev.top + shiftY };
                }
                return prev;
            });
        }
    }, [open, shiftY]);

    return (
        <span
            ref={triggerRef}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
            className="relative inline-flex"
        >
            {children}
            {mounted && open && createPortal(
                <span
                    role="tooltip"
                    className={cn(
                        "pointer-events-none rounded-md border border-[var(--tailwind-colors-slate-700)] bg-[var(--tailwind-colors-slate-800)] px-2 py-1 text-xs text-[var(--tailwind-colors-slate-100)] shadow-md break-words whitespace-normal hyphens-auto animate-in fade-in-0",
                        maxWidthClassName,
                        className
                    )}
                    style={style}
                >
                    {content}
                </span>,
                document.body
            )}
        </span>
    );
};

export default Tooltip;
