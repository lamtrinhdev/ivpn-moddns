import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface ServiceCardProps {
    name: string;
    description: string;
    asnsLabel: string;
    onSwitchChange?: (checked: boolean) => void;
    switchChecked?: boolean;
    switchDisabled?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
    name,
    description,
    asnsLabel,
    onSwitchChange,
    switchChecked,
    switchDisabled,
}) => {
    return (
        <Card
            data-testid="service-card"
            className="bg-[var(--variable-collection-card)] p-3 border-none rounded-[var(--tailwind-primitives-border-radius-rounded)] shadow-sm flex flex-col justify-between h-[196px] lg:h-[180px] w-full overflow-hidden"
        >
            <CardContent className="p-0 flex flex-col justify-between h-full">
                <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="text-tailwind-colors-slate-50 font-semibold text-base leading-tight max-w-[70%] md:max-w-[75%] lg:max-w-[80%] truncate break-words">
                            {name}
                        </div>
                        <Switch
                            checked={switchChecked}
                            onCheckedChange={onSwitchChange}
                            disabled={switchDisabled}
                            className="w-9 h-5
                            data-[state=unchecked]:bg-[var(--tailwind-colors-slate-700)]
                            data-[state=checked]:bg-[var(--tailwind-colors-rdns-600)]
                            [&>[data-slot=switch-thumb]]:bg-background
                            data-[state=checked]:[&>[data-slot=switch-thumb]]:bg-[var(--tailwind-colors-slate-50)]
                            data-[state=unchecked]:[&>[data-slot=switch-thumb]]:bg-[var(--tailwind-colors-slate-400)]
                            data-[state=checked]:[&>[data-slot=switch-thumb]]:translate-x-4"
                        />
                    </div>
                    <div className="pt-2 font-text-xs-leading-5-normal text-[var(--tailwind-colors-slate-100)] text-xs h-[72px] overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] break-words hyphens-auto">
                        {description}
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end text-xs text-[var(--tailwind-colors-slate-200)] min-w-0">
                    <span className="truncate" title={asnsLabel}>
                        {asnsLabel}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

export default ServiceCard;
