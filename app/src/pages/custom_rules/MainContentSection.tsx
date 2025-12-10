import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MinusIcon, Search, Trash2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo, type JSX } from "react";
import AlertCard from "@/components/general/AlertCard";
import { useNavigate } from "react-router-dom";
import CustomRulesSearch from "@/pages/custom_rules/Search";
import { useAppStore } from "@/store/general";
import api from "@/api/api";
import { toast } from "sonner";
import type { ModelAccount, ModelProfile } from "@/api/client/api";
import NoRulesExist from "@/pages/custom_rules/NoRulesExist";
import CustomRuleEntry from "@/pages/custom_rules/Entry";
import { RuleComposer, type RuleOption } from "@/pages/custom_rules/RuleComposer";
import type { ResponsesCustomRuleBatchSkipped } from "@/api/client/api";


interface MainContentSectionProps {
    account: ModelAccount;
    profiles: ModelProfile[];
}

export default function MainContentSection(_: Omit<MainContentSectionProps, "account">): JSX.Element {
    const [showAlert, setShowAlert] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [activeTab, setActiveTab] = useState<"denylist" | "allowlist">("denylist");
    const [loading, setLoading] = useState(false);
    const [logoMap, setLogoMap] = useState<Record<string, string>>({});
    const [searchValue, setSearchValue] = useState("");
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
    const [composerTokens, setComposerTokens] = useState<Record<"denylist" | "allowlist", RuleOption[]>>({
        denylist: [],
        allowlist: [],
    });

    const updateComposerTokens = useCallback((action: "denylist" | "allowlist", next: RuleOption[]) => {
        setComposerTokens(prev => ({
            ...prev,
            [action]: next,
        }));
    }, []);
    const logoRequestedRef = useRef<Set<string>>(new Set());

    const navigate = useNavigate();

    const activeProfile = useAppStore((state) => state.activeProfile);
    const setActiveProfile = useAppStore((state) => state.setActiveProfile);
    const customRules = activeProfile?.settings?.custom_rules ?? [];
    const denylist = customRules.filter(rule => rule.action === "block");
    const allowlist = customRules.filter(rule => rule.action === "allow");

    useEffect(() => {
        setComposerTokens({ denylist: [], allowlist: [] });
    }, [activeProfile?.profile_id]);

    // Helper to get unique root domains (same logic as in Logs.tsx, but skip IPs)
    const getUniqueDomains = useCallback(() => {
        const allRules = [...denylist, ...allowlist];
        return Array.from(
            new Set(
                allRules
                    .map(rule => {
                        let domain = rule.value?.replace(/\.$/, "");
                        if (!domain) return null;
                        // Skip IP addresses (both IPv4 and IPv6)
                        if (
                            /^[0-9.]+$/.test(domain) || // IPv4
                            /^[a-fA-F0-9:]+$/.test(domain) // IPv6
                        ) {
                            return null;
                        }
                        const parts = domain.split(".");
                        if (parts.length > 2) domain = parts.slice(-2).join(".");
                        return domain.toLowerCase();
                    })
                    .filter((d): d is string => Boolean(d))
            )
        );
    }, [denylist, allowlist]);

    // Batch fetch logos only for domains not already fetched
    const fetchLogos = useCallback(async () => {
        const uniqueDomains = getUniqueDomains();
        // Only request logos for domains not already fetched
        const domainsToFetch = uniqueDomains.filter(domain => !logoRequestedRef.current.has(domain));
        if (domainsToFetch.length === 0) return;

        try {
            const resp = await api.Client.auxiliaryApi.apiV1AuxiliaryLogosPost({
                domains: domainsToFetch,
            });
            // Accept both { logos: { ... } } and flat { ... } responses
            const logos = resp.data.logos ? resp.data.logos : resp.data;
            setLogoMap(prev => ({ ...prev, ...logos }));
            domainsToFetch.forEach(domain => logoRequestedRef.current.add(domain));
        } catch {
            // Do not clear logoMap on error, just skip
        }
    }, [getUniqueDomains]);

    // Only fetch logos when rules change and only for new domains
    useEffect(() => {
        fetchLogos();
    }, [fetchLogos, denylist, allowlist]);

    const handleComposerSubmit = useCallback(async (action: "denylist" | "allowlist") => {
        if (!activeProfile?.profile_id) {
            toast.error("Select a profile before adding custom rules.");
            return;
        }

        const originalTokens = composerTokens[action];
        const staticTokens = originalTokens.filter(token => token.meta?.error);
        const submissionTokens = originalTokens.filter(token => !token.meta?.error);

        if (submissionTokens.length === 0) {
            return;
        }

        setLoading(true);
        try {
            const response = await api.Client.profilesApi.apiV1ProfilesIdCustomRulesBatchPost(
                activeProfile.profile_id,
                {
                    action: action === "denylist" ? "block" : "allow",
                    values: submissionTokens.map(token => token.value),
                }
            );

            const created = response.data?.created ?? [];
            const skipped = response.data?.skipped ?? [];

            if (created.length > 0) {
                const updated = await api.Client.profilesApi.apiV1ProfilesIdGet(activeProfile.profile_id);
                setActiveProfile(updated.data);
                toast.success(`${created.length} entr${created.length === 1 ? "y" : "ies"} added to the ${action}.`);
                fetchLogos();
            }

            if (skipped.length > 0) {
                toast.warning(`${skipped.length} entr${skipped.length === 1 ? "y was" : "ies were"} skipped. Review the highlighted items.`);
            }

            if (created.length === 0 && skipped.length === 0) {
                toast.info("No changes were made.");
            }

            if (skipped.length > 0 || staticTokens.length > 0) {
                const skippedByValue = new Map<string, ResponsesCustomRuleBatchSkipped>();
                skipped.forEach(item => {
                    if (item?.value) {
                        skippedByValue.set(item.value, item);
                    }
                });

                const skippedTokens = submissionTokens
                    .filter(token => skippedByValue.has(token.value))
                    .map(token => {
                        const skippedItem = skippedByValue.get(token.value);
                        return {
                            ...token,
                            meta: {
                                error: skippedItem?.message ?? "Unable to add entry.",
                                reason: skippedItem?.reason,
                            },
                        } satisfies RuleOption;
                    });

                const deduped: RuleOption[] = [];
                const seen = new Set<string>();
                [...staticTokens, ...skippedTokens].forEach(token => {
                    if (!seen.has(token.value)) {
                        seen.add(token.value);
                        deduped.push(token);
                    }
                });

                updateComposerTokens(action, deduped);
            } else {
                updateComposerTokens(action, []);
            }
        } catch (e: any) {
            const apiMsg =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                e?.response?.data?.detail ||
                e?.message ||
                "Failed to add custom rules";
            toast.error(apiMsg);
        } finally {
            setLoading(false);
        }
    }, [activeProfile?.profile_id, composerTokens, fetchLogos, setActiveProfile, updateComposerTokens]);

    // Handler for deleting a custom rule
    const handleDeleteRule = async (userRuleId: string | number) => {
        if (!activeProfile?.profile_id) return;
        setLoading(true);
        try {
            await api.Client.profilesApi.apiV1ProfilesIdCustomRulesCustomRuleIdDelete(
                activeProfile.profile_id,
                String(userRuleId)
            );
            // Fetch updated profile and update store
            const updated = await api.Client.profilesApi.apiV1ProfilesIdGet(activeProfile.profile_id);
            setActiveProfile(updated.data);
            toast.success("Custom rule deleted successfully.");
            // Optionally, fetch logos again if needed
            fetchLogos();
        } catch (e: any) {
            const apiMsg =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                e?.response?.data?.detail ||
                e?.message ||
                "Failed to delete rule";
            toast.error(apiMsg);
        } finally {
            setLoading(false);
        }
    };

    // Memoize handlers to prevent unnecessary re-renders
    const handleEntryCheck = useCallback((id: string | number, checked: boolean) => {
        setSelectedIds(prev => {
            if (checked) {
                // Add only if not already present
                return prev.includes(id) ? prev : [...prev, id];
            } else {
                // Remove from selection
                return prev.filter(selId => selId !== id);
            }
        });
    }, []);

    // Memoize bulk delete handler
    const handleBulkDelete = useCallback(async () => {
        if (!activeProfile?.profile_id || selectedIds.length === 0) return;
        setLoading(true);
        try {
            await Promise.all(
                selectedIds.map(userRuleId =>
                    api.Client.profilesApi.apiV1ProfilesIdCustomRulesCustomRuleIdDelete(
                        activeProfile.profile_id,
                        String(userRuleId)
                    )
                )
            );
            // Fetch updated profile and update store
            const updated = await api.Client.profilesApi.apiV1ProfilesIdGet(activeProfile.profile_id);
            setActiveProfile(updated.data);
            toast.success("Selected custom rules deleted successfully.");
            setSelectedIds([]);
            fetchLogos();
        } catch (e: any) {
            const apiMsg =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                e?.response?.data?.detail ||
                e?.message ||
                "Failed to delete selected rules";
            toast.error(apiMsg);
        } finally {
            setLoading(false);
        }
    }, [activeProfile?.profile_id, selectedIds, setActiveProfile, fetchLogos]);

    // Show header only if at least one is selected
    const allSelected = selectedIds.length > 0;
    const selectedCount = selectedIds.length;

    // Filtered lists based on search value (memoized to prevent unnecessary recalculations)
    const filteredDenylist = useMemo(() =>
        denylist.filter(rule =>
            rule.value?.toLowerCase().includes(searchValue.toLowerCase())
        ), [denylist, searchValue]);

    const filteredAllowlist = useMemo(() =>
        allowlist.filter(rule =>
            rule.value?.toLowerCase().includes(searchValue.toLowerCase())
        ), [allowlist, searchValue]);

    // Memoize CustomRulesCard to prevent unnecessary re-renders
    const CustomRulesCard = useCallback(({
        rules,
        selectedIds,
        onCheck,
        onDelete,
        logoMap,
        allSelected,
        selectedCount,
        handleBulkDelete,
        loading,
        type,
        composer,
    }: {
        rules: any[];
        selectedIds: Array<string | number>;
        onCheck: (id: string | number, checked: boolean) => void;
        onDelete: (id: string | number) => void;
        logoMap: Record<string, string>;
        allSelected: boolean;
        selectedCount: number;
        handleBulkDelete: () => void;
        loading: boolean;
        type: "denied" | "allowed";
        composer: JSX.Element;
    }) => {
        const [removingIds, setRemovingIds] = useState<Array<string | number>>([]);

        // Helper for fade-out before delete
        const handleEntryDelete = useCallback((id: string | number) => {
            setRemovingIds(prev => [...prev, id]);
            setTimeout(() => {
                onDelete(id);
                setRemovingIds(prev => prev.filter(rid => rid !== id));
            }, 300); // match transition duration
        }, [onDelete]);

        if (rules.length === 0) {
            if (searchValue.trim().length > 0) {
                return (
                    <Card className="flex flex-1 h-full items-center justify-center border-[var(--tailwind-colors-slate-600)] rounded-md bg-background">
                        <NoRulesExist
                            type={type}
                            title="No results found"
                            message={`Try a different search term or clear your search to see all ${type === "denied" ? "denylist" : "allowlist"} domains.`}
                        />
                    </Card>
                );
            }

            return (
                <Card className="flex flex-col items-start relative flex-1 self-stretch w-full grow bg-[var(--variable-collection-surface)] rounded-lg overflow-hidden border-0">
                    <div className="flex flex-col h-auto md:h-[652px] items-start gap-4 md:gap-8 p-4 relative self-stretch w-full">
                        <div className="flex flex-col items-center justify-start md:justify-center gap-2.5 relative self-stretch w-full md:flex-1 md:grow">
                            {/* Pull component higher on mobile (counteract internal mt) */}
                            <div className="-mt-4 md:mt-0 w-full flex justify-center">
                                <NoRulesExist
                                    type={type}
                                    showInput={true}
                                    composer={composer}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            );
        }

        return (
            <div className="flex flex-col items-start gap-2 relative flex-1 self-stretch w-full grow rounded-md">
                {allSelected && selectedCount > 0 && (
                    <div className="flex justify-between py-2 px-4 w-full bg-[var(--tailwind-colors-slate-900)] border border-solid border-[var(--tailwind-colors-slate-600)] rounded-md items-center">
                        <div className="inline-flex items-center gap-4">
                            <div className="relative w-4 h-4 bg-[var(--tailwind-colors-rdns-600)] rounded-[var(--shadcn-ui-radius-radius-sm)] border-[var(--tailwind-colors-rdns-600)]">
                                <MinusIcon className="absolute w-3.5 h-3.5 top-px left-px" />
                            </div>
                            <div className="font-text-sm-leading-5-normal text-[var(--tailwind-colors-slate-50)] text-[length:var(--text-sm-leading-5-normal-font-size)] tracking-[var(--text-sm-leading-5-normal-letter-spacing)] leading-[var(--text-sm-leading-5-normal-line-height)]">
                                {selectedCount} selected
                            </div>
                            <button
                                className="flex w-10 h-10 items-center justify-center rounded-[var(--primitives-radius-radius-md)] hover:bg-[var(--tailwind-colors-rdns-600)] group"
                                onClick={handleBulkDelete}
                                disabled={loading}
                                title="Delete selected entries"
                                aria-label="Delete selected entries"
                            >
                                <Trash2 className="w-4 h-4 text-[var(--tailwind-colors-rdns-600)] group-hover:text-[var(--tailwind-colors-slate-900)] transition-colors" />
                            </button>
                        </div>
                    </div>
                )}
                {rules.map((rule) => {
                    const checked = selectedIds.includes(rule.id);
                    const isRemoving = removingIds.includes(rule.id);
                    return (
                        <CustomRuleEntry
                            key={rule.id}
                            rule={rule}
                            checked={checked}
                            onCheck={onCheck}
                            onDelete={handleEntryDelete}
                            logoMap={logoMap}
                            isRemoving={isRemoving}
                            hideDeleteButton={allSelected}
                        />
                    );
                })}
            </div>
        );
    }, [searchValue]);

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-screen md:min-h-0 items-start gap-6 p-6 pt-8 md:pt-8 md:p-8 overflow-visible">

            {/* Page Description */}
            <section className="w-full">
                <div className="flex flex-col gap-1">
                    <p className="text-[var(--tailwind-colors-slate-200)] text-base leading-6">
                        Manually add domains and IP addresses to either block or allow when resolving.
                    </p>
                </div>
            </section>

            <div className="flex w-full h-full flex-1 items-start relative min-h-0">
                <div className="flex flex-col flex-1 h-full w-full min-h-0">
                    <Tabs
                        defaultValue="denylist"
                        value={activeTab}
                        onValueChange={tab => {
                            setActiveTab(tab as "denylist" | "allowlist");
                            setSelectedIds([]); // Reset selection when switching tabs
                        }}
                        className="w-full"
                    >
                        <div className="w-full border-b overflow-x-auto no-scrollbar">
                            <TabsList className="flex h-auto w-fit bg-[var(--shadcn-ui-app-background)] rounded-none gap-0 justify-start p-0 border-b-0 min-w-max">
                                <TabsTrigger
                                    value="denylist"
                                    className="min-w-14 py-2 px-4 pb-3 border-b-2 w-auto flex-shrink-0
                                    data-[state=active]:!border-b-[var(--tailwind-colors-rdns-600)]
                                    data-[state=active]:!bg-transparent
                                    data-[state=active]:text-[var(--tailwind-colors-slate-50)]
                                    data-[state=inactive]:bg-transparent
                                    data-[state=inactive]:text-gray-400
                                    data-[state=inactive]:border-b-transparent
                                    rounded-none transition-colors"
                                >
                                    Denylist
                                </TabsTrigger>
                                <TabsTrigger
                                    value="allowlist"
                                    className="min-w-14 py-2 px-4 pb-3 border-b-2 border-transparent w-auto flex-shrink-0
                                    data-[state=active]:!border-b-[var(--tailwind-colors-rdns-600)]
                                    data-[state=active]:!bg-transparent
                                    data-[state=active]:text-[var(--tailwind-colors-slate-50)]
                                    data-[state=inactive]:bg-transparent
                                    data-[state=inactive]:border-b-transparent
                                    data-[state=inactive]:text-gray-400
                                    rounded-none transition-colors"
                                >
                                    Allowlist
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Shared AlertCard and input for both tabs */}
                        <section className="w-full pt-4 pb-0">
                            {showAlert && (
                                <AlertCard
                                    description={
                                        <>
                                            <div>
                                                Custom rules take precedence over blocklists and other settings. Subdomains of Denylist entries are blocked by default - you can change this in <span
                                                    className="underline cursor-pointer"
                                                    onClick={() => navigate("/settings")}
                                                >
                                                    Settings
                                                </span>.
                                            </div>
                                        </>
                                    }
                                    onClose={() => setShowAlert(false)}
                                />
                            )}
                        </section>

                        <div className="flex flex-col gap-3 w-full">
                            {/* Only show input controls when there are existing rules */}
                            {((activeTab === "denylist" && denylist.length > 0) || (activeTab === "allowlist" && allowlist.length > 0)) && (
                                <>
                                    <div className="flex flex-row flex-wrap md:flex-row items-stretch md:items-start gap-3 w-full min-w-0">
                                        <div className="flex flex-row flex-1 items-stretch md:items-start gap-3 min-w-0">
                                            <RuleComposer
                                                action={activeTab}
                                                tokens={composerTokens[activeTab]}
                                                onTokensChange={(next) => updateComposerTokens(activeTab, next)}
                                                onSubmit={() => handleComposerSubmit(activeTab)}
                                                loading={loading || !activeProfile?.profile_id}
                                                className="flex-1 min-w-0"
                                            />
                                            <Button
                                                className={`w-11 h-11 md:w-auto md:h-9 rounded-md flex items-center justify-center md:px-4 md:gap-2 ${showSearch
                                                    ? "bg-[var(--tailwind-colors-slate-800)] text-[var(--tailwind-colors-slate-400)]"
                                                    : "bg-[var(--tailwind-colors-rdns-600)] text-background"}`}
                                                onClick={() => setShowSearch((prev) => !prev)}
                                                aria-label={showSearch ? 'Close search' : 'Open search'}
                                            >
                                                <Search className="w-4 h-4" />
                                                <span className="hidden md:inline text-sm font-medium">
                                                    {showSearch ? 'Close search' : 'Search'}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Show Search.tsx here if toggled */}
                                    {showSearch && (
                                        <div className="w-full bg-background">
                                            <CustomRulesSearch
                                                value={searchValue}
                                                onChange={setSearchValue}
                                                allSelected={
                                                    (activeTab === "denylist"
                                                        ? filteredDenylist
                                                        : filteredAllowlist
                                                    ).length > 0 &&
                                                    (activeTab === "denylist"
                                                        ? filteredDenylist
                                                        : filteredAllowlist
                                                    ).every(r => selectedIds.includes(r.id))
                                                }
                                                onSelectAll={() => {
                                                    const visibleIds = (activeTab === "denylist" ? filteredDenylist : filteredAllowlist).map(r => r.id);
                                                    setSelectedIds(visibleIds);
                                                }}
                                                onDeselectAll={() => {
                                                    setSelectedIds([]);
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <TabsContent value="denylist" className="flex flex-col gap-4 mt-2 flex-1">
                            <CustomRulesCard
                                rules={filteredDenylist}
                                selectedIds={selectedIds}
                                onCheck={handleEntryCheck}
                                onDelete={handleDeleteRule}
                                logoMap={logoMap}
                                allSelected={allSelected}
                                selectedCount={selectedCount}
                                handleBulkDelete={handleBulkDelete}
                                loading={loading}
                                type="denied"
                                composer={
                                    <RuleComposer
                                        action="denylist"
                                        tokens={composerTokens.denylist}
                                        onTokensChange={(next) => updateComposerTokens("denylist", next)}
                                        onSubmit={() => handleComposerSubmit("denylist")}
                                        loading={loading || !activeProfile?.profile_id}
                                        className="w-full"
                                    />
                                }
                            />
                        </TabsContent>
                        <TabsContent value="allowlist" className="flex flex-col gap-4 mt-2 flex-1">
                            <CustomRulesCard
                                rules={filteredAllowlist}
                                selectedIds={selectedIds}
                                onCheck={handleEntryCheck}
                                onDelete={handleDeleteRule}
                                logoMap={logoMap}
                                allSelected={allSelected}
                                selectedCount={selectedCount}
                                handleBulkDelete={handleBulkDelete}
                                loading={loading}
                                type="allowed"
                                composer={
                                    <RuleComposer
                                        action="allowlist"
                                        tokens={composerTokens.allowlist}
                                        onTokensChange={(next) => updateComposerTokens("allowlist", next)}
                                        onSubmit={() => handleComposerSubmit("allowlist")}
                                        loading={loading || !activeProfile?.profile_id}
                                        className="w-full"
                                    />
                                }
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}