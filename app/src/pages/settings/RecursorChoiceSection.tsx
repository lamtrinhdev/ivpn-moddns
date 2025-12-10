import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface RecursorChoiceSectionProps {
    currentRecursor: string;
    onRecursorChange: (recursor: string) => void;
    loading?: boolean;
}

const RecursorChoiceSection: React.FC<RecursorChoiceSectionProps> = ({
    currentRecursor,
    onRecursorChange,
    loading = false,
}) => {
    const recursors = ['sdns', 'unbound'];

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3 sm:gap-4 flex-wrap max-w-full">
            <div className="flex flex-col items-start gap-2 min-w-0 max-w-full">
                <div className="[font-family:'Roboto_Flex-Medium',Helvetica] font-bold text-[var(--tailwind-colors-slate-50)] text-base tracking-[0] leading-4 break-words">
                    Recursor choice
                </div>
                <div className="font-text-sm-leading-5-normal font-[number:var(--text-sm-leading-5-normal-font-weight)] text-[var(--tailwind-colors-slate-200)] text-[length:var(--text-sm-leading-5-normal-font-size)] tracking-[var(--text-sm-leading-5-normal-letter-spacing)] leading-[var(--text-sm-leading-5-normal-line-height)] [font-style:var(--text-sm-leading-5-normal-font-style)] break-words">
                    Configure DNS query resolving software to use as the recursor.
                </div>
            </div>
            <Select
                value={currentRecursor}
                onValueChange={onRecursorChange}
                disabled={loading}
            >
                <SelectTrigger className="w-full sm:w-[180px] bg-[var(--tailwind-colors-slate-800)] border-gray-200 text-[var(--tailwind-colors-slate-100)] hover:bg-gray-50 focus:bg-gray-50 disabled:opacity-50">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-md border dark:bg-neutral-800 dark:border-neutral-700">
                    {recursors.map((recursor) => (
                        <SelectItem
                            key={recursor}
                            value={recursor}
                            className="hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                        >
                            {recursor}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default RecursorChoiceSection;
