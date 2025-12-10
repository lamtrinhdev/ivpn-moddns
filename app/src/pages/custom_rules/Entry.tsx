import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
// import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

interface CustomRuleEntryProps {
    rule: any;
    checked: boolean;
    onCheck: (id: string | number, checked: boolean) => void;
    onDelete: (id: string | number) => void;
    logoMap: Record<string, string>;
    isRemoving: boolean;
    hideDeleteButton?: boolean;
}

const CustomRuleEntry: React.FC<CustomRuleEntryProps> = ({
    rule,
    checked,
    onCheck,
    onDelete,
    logoMap,
    isRemoving,
    hideDeleteButton = false,
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timeout);
    }, []);


    const domain = rule.value?.replace(/\.$/, "") ?? "";

    return (
        <Card
            className={`w-full h-10 bg-[var(--variable-collection-surface)] border-none transition-opacity duration-300 ${isVisible && !isRemoving ? "opacity-100" : "opacity-0"}`}
        >
            <CardContent className="flex items-center justify-between relative self-stretch w-full h-full p-0 px-3">
                <div className="flex items-center gap-4 relative flex-1">
                    <Checkbox
                        checked={checked}
                        onCheckedChange={val => onCheck(rule.id, Boolean(val))}
                        className="w-4 h-4 border-solid border-[var(--tailwind-colors-rdns-600)]"
                    />
                    <div className="inline-flex items-center gap-2 relative flex-[0_0_auto]">
                        {(() => {
                            let d = domain;
                            const parts = d.split(".");
                            if (parts.length > 2) d = parts.slice(-2).join(".");
                            return logoMap[d.toLowerCase()]
                                ? (
                                    <img
                                        src={logoMap[d.toLowerCase()]}
                                        alt=""
                                        className="w-5 h-5 rounded bg-white object-contain"
                                        style={{ background: "#fff" }}
                                    />
                                )
                                : null;
                        })()}
                        <div className="relative w-fit font-text-sm-leading-5-normal font-normal text-white text-sm tracking-normal leading-5 whitespace-nowrap">
                            {domain}
                        </div>
                    </div>
                </div>

                <div className="inline-flex items-center gap-4 relative flex-[0_0_auto]">

                    {/* Switch for enabling/disabling rules - not implemented yet
                    <Switch
                        defaultChecked={true}
                        className="data-[state=checked]:bg-[var(--tailwind-colors-rdns-600)]"
                    />
                    */}

                    {!hideDeleteButton && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex w-10 h-10 items-center justify-center rounded-[var(--primitives-radius-radius-md)] hover:!bg-[var(--tailwind-colors-rdns-600)] group"
                            onClick={() => onDelete(rule.id)}
                            disabled={isRemoving}
                        >
                            <Trash2 className="w-4 h-4 text-[var(--tailwind-colors-rdns-600)] group-hover:text-[var(--tailwind-colors-slate-900)] transition-colors" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default CustomRuleEntry;