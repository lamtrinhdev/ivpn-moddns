import { useState, type JSX } from "react";
import { useScreenDetector } from "@/hooks/useScreenDetector";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { Globe, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge"; // still used for Blocked status only
import { Tooltip } from "@/components/ui/tooltip";
import type { ModelQueryLog } from "@/api/client";

interface LogIconProps {
    logoUrl?: string;
    domain: string;
}

function LogIcon({ logoUrl, domain }: LogIconProps) {
    const [imgError, setImgError] = useState(false);

    if (!logoUrl || imgError) {
        return <Globe className="w-5 h-5 text-[var(--tailwind-colors-slate-100)]" />;
    }
    return (
        <img
            src={logoUrl}
            alt={domain}
            className="w-5 h-5 object-contain"
            onError={() => setImgError(true)}
        />
    );
}

interface QueryLogCardProps {
    log: ModelQueryLog;
    logoUrl?: string;
    isLast?: boolean;
    lastLogRef?: (node: HTMLDivElement | null) => void;
}

const QueryLogCard = ({ log, logoUrl, isLast, lastLogRef }: QueryLogCardProps): JSX.Element | null => {
    // If domain logging is disabled, dns_request.domain may be absent. Provide a placeholder.
    const rawDomain = log.dns_request?.domain;
    let domain = rawDomain ? rawDomain.replace(/\.$/, "") : undefined;
    if (domain) {
        const domainParts = domain.split(".");
        if (domainParts.length > 2) {
            domain = domainParts.slice(-2).join(".");
        }
    }

    // Track timestamp expansion to increase card height smoothly on mobile
    const [timestampExpanded, setTimestampExpanded] = useState(false);

    // Expansion state for mobile tap-to-expand of truncated domain (device id no longer truncates)
    const [showFullDomainMobile, setShowFullDomainMobile] = useState(false);

    // Device ID: backend allows up to 36 chars; truncate only for mobile (<=768px)
    const { isMobile } = useScreenDetector();
    const rawDeviceId = log.device_id || '';
    let deviceIdOrIp = rawDeviceId;
    if (!rawDeviceId) deviceIdOrIp = log.client_ip || '';
    else if (isMobile) deviceIdOrIp = rawDeviceId.slice(0, 20);
    else deviceIdOrIp = rawDeviceId.slice(0, 36);

    const DOMAIN_TRUNCATE_THRESHOLD = 65; // existing logic threshold
    const isDomainTruncatable = rawDomain ? rawDomain.length > DOMAIN_TRUNCATE_THRESHOLD : false;
    const truncatedDomain = rawDomain && isDomainTruncatable ? rawDomain.slice(0, DOMAIN_TRUNCATE_THRESHOLD) + '…' : rawDomain;

    return (
        <div
            ref={isLast ? lastLogRef : undefined}
            className="w-full bg-[var(--variable-collection-surface)] rounded-[var(--primitives-radius-radius-md)] border-0"
        >
            <div className={`flex h-auto md:h-[66px] items-stretch md:items-center justify-between gap-3 md:gap-4 px-3 md:pt-[var(--tailwind-primitives-gap-gap-3)] md:pr-[var(--tailwind-primitives-gap-gap-4)] md:pb-[var(--tailwind-primitives-gap-gap-3)] md:pl-[var(--tailwind-primitives-gap-gap-4)] min-w-0 py-2 md:py-0 transition-all duration-200 ease-out min-h-[64px] ${timestampExpanded ? 'pb-4 min-h-[84px]' : ''}`}>
                <div className="flex items-center md:items-center gap-4 relative min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 relative flex-[0_0_auto] min-w-0">
                        <div className="relative w-5 h-5 flex-shrink-0">
                            <LogIcon logoUrl={logoUrl} domain={domain || 'unknown'} />
                        </div>
                        <div className="relative flex items-center gap-2 font-text-sm-leading-5-normal font-[number:var(--text-sm-leading-5-normal-font-weight)] text-white text-[length:var(--text-sm-leading-5-normal-font-size)] tracking-[var(--text-sm-leading-5-normal-letter-spacing)] leading-[var(--text-sm-leading-5-normal-line-height)] [font-style:var(--text-sm-leading-5-normal-font-style)] truncate max-w-[200px] md:max-w-[480px] lg:max-w-[560px]">
                            {rawDomain ? (
                                <>
                                    {/* Desktop span with tooltip (hidden on small screens) */}
                                    <Tooltip content={rawDomain} side="top" align="start" delay={150}>
                                        <span
                                            className={`hidden md:inline truncate`}
                                            data-testid={!isDomainTruncatable ? 'querylog-domain-full' : 'querylog-domain-truncated-desktop'}
                                        >
                                            {isDomainTruncatable ? truncatedDomain : rawDomain}
                                        </span>
                                    </Tooltip>
                                    {/* Mobile button toggle (visible only below md) */}
                                    {isDomainTruncatable ? (
                                        <button
                                            type="button"
                                            aria-label={showFullDomainMobile ? 'Hide full domain' : 'Show full domain'}
                                            onClick={() => setShowFullDomainMobile(v => !v)}
                                            className="md:hidden truncate focus:outline-none active:scale-[0.98] transition-transform text-left"
                                            data-testid={showFullDomainMobile ? 'querylog-domain-full' : 'querylog-domain-truncated'}
                                        >
                                            {showFullDomainMobile ? rawDomain : truncatedDomain}
                                        </button>
                                    ) : (
                                        <span className="md:hidden truncate" data-testid="querylog-domain-full">{rawDomain}</span>
                                    )}
                                </>
                            ) : (
                                '-'
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-stretch md:items-center gap-3 md:gap-2.5 relative flex-[0_0_auto] min-w-0">
                    <div className="flex flex-col md:flex-row items-start md:items-center md:gap-2.5 gap-1 flex-shrink-0">
                        <div className="relative w-[60px] md:w-[100px] font-text-xs-leading-4-semibold font-semibold text-[10px] md:text-[length:var(--text-xs-leading-4-semibold-font-size)] text-[var(--tailwind-colors-rdns-600)] text-left md:text-center tracking-wide leading-4 md:leading-[var(--text-xs-leading-4-semibold-line-height)] uppercase order-0 md:order-1">
                            {log?.protocol ? log.protocol.toUpperCase() : '—'}
                        </div>
                        {log.status === "blocked" && (
                            <Badge className="order-1 md:order-0 inline-flex items-center justify-center px-2 py-0.5 md:pt-[var(--tailwind-primitives-padding-p-0-5)] md:pr-[var(--tailwind-primitives-padding-p-2-5)] md:pb-[var(--tailwind-primitives-padding-p-0-5)] md:pl-[var(--tailwind-primitives-padding-p-2-5)] bg-[var(--tailwind-colors-red-600)] rounded border-0 h-5 md:h-auto">
                                <span className="font-text-xs-leading-4-semibold text-[10px] md:text-[length:var(--text-xs-leading-4-semibold-font-size)] leading-4 text-[var(--tailwind-colors-slate-50)] font-semibold">Blocked</span>
                            </Badge>
                        )}
                    </div>
                    <div className="flex flex-col w-[140px] md:w-[220px] lg:w-[280px] items-end justify-center gap-0.5 md:gap-[var(--tailwind-primitives-gap-gap-0-5)] relative min-w-0 flex-shrink-0">
                        <div className="relative w-full mt-[-1.00px] font-text-sm-leading-5-semibold text-[var(--tailwind-colors-slate-50)] text-xs md:text-[length:var(--text-sm-leading-5-semibold-font-size)] leading-4 md:leading-[var(--text-sm-leading-5-semibold-line-height)] text-right">
                            <span
                                className="inline-flex items-center gap-1 max-w-full"
                                data-testid="querylog-device-id-full"
                            >
                                {deviceIdOrIp}
                            </span>
                        </div>
                        <TimestampDisplay timestamp={log.timestamp} onToggle={setTimestampExpanded} />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TimestampDisplayProps { timestamp?: string; onToggle?: (expanded: boolean) => void }

const TimestampDisplay = ({ timestamp, onToggle }: TimestampDisplayProps) => {
    const [expanded, setExpanded] = useState(false);
    if (!timestamp) return null;
    const date = parseISO(timestamp);
    const relative = formatDistanceToNow(date, { addSuffix: true });
    const absolute = format(date, "MMMM d, yyyy 'at' hh:mm:ss a");
    return (
        <button
            type="button"
            onClick={() => setExpanded(e => { const next = !e; onToggle?.(next); return next; })}
            className={`group relative w-fit font-text-xs-leading-5-normal font-[number:var(--text-xs-leading-5-normal-font-weight)] text-[var(--tailwind-colors-slate-100)] text-[length:var(--text-xs-leading-5-normal-font-size)] tracking-[var(--text-xs-leading-5-normal-letter-spacing)] leading-[var(--text-xs-leading-5-normal-line-height)] whitespace-nowrap [font-style:var(--text-xs-leading-5-normal-font-style)] inline-flex items-center gap-1 focus:outline-none cursor-pointer select-text transition-transform duration-200 ease-out ${expanded ? 'translate-y-4 md:translate-y-2 mt-0.5' : ''}`}
            title={expanded ? 'Show relative time' : 'Show full timestamp'}
        >
            <Clock className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            {expanded ? absolute : relative}
        </button>
    );
};

export default QueryLogCard;
