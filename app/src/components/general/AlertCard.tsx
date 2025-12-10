import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoIcon, XIcon } from "lucide-react";

interface AlertCardProps {
    description: React.ReactNode;
    onClose: () => void;
    className?: string;
    /** 
     * Background color as a Tailwind class or CSS variable, e.g. 'bg-red-500' or 'var(--tailwind-colors-sky-950)'.
     * Defaults to var(--tailwind-colors-sky-950).
     */
    backgroundColor?: string;
    /**
     * Duration of the fade-out transition in milliseconds (optional, default 300ms)
     */
    transitionDurationMs?: number;
}

/**
 * To ensure inline elements like <span> do not start on a new line,
 * avoid line breaks or extra whitespace in the description prop.
 * For extra safety, this component enforces whitespace:normal and inline flow.
 */
const AlertCard: React.FC<AlertCardProps> = ({
    description,
    onClose,
    className = "",
    backgroundColor = "var(--tailwind-colors-sky-950)",
    transitionDurationMs = 300,
}) => {
    const [visible, setVisible] = useState(true);

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => {
            onClose();
        }, transitionDurationMs);
    };

    return (
        <Alert
            className={`
                border-none text-white relative px-6 py-5
                transition-opacity
                duration-${transitionDurationMs}
                ${visible ? "opacity-100" : "opacity-0"}
                ${className}
            `}
            style={{ background: backgroundColor, transitionDuration: `${transitionDurationMs}ms` }}
        >
            <div className="pt-1">
                <InfoIcon className="h-5 w-5 min-w-[20px]" />
            </div>
            <AlertDescription
                className="pl-7 pr-10 text-base leading-7 font-normal text-white flex-1 w-full"
            >
                {description}
            </AlertDescription>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 absolute top-4 right-4 p-0 text-white hover:bg-white/10 cursor-pointer"
                onClick={handleClose}
                aria-label="Close"
                type="button"
            >
                <XIcon className="h-5 w-5" />
            </Button>
        </Alert>
    );
};

export default AlertCard;