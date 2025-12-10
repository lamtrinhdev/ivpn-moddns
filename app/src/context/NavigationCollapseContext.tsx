import React, { createContext, useContext, useState } from "react";

interface NavigationCollapseContextType {
    collapsed: boolean;
    toggleCollapse: () => void;
    setCollapsed: (collapsed: boolean) => void;
}

const NavigationCollapseContext = createContext<NavigationCollapseContextType | undefined>(undefined);

export const NavigationCollapseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);

    const toggleCollapse = () => setCollapsed((prev) => !prev);

    return (
        <NavigationCollapseContext.Provider value={{ collapsed, toggleCollapse, setCollapsed }}>
            {children}
        </NavigationCollapseContext.Provider>
    );
};

export function useNavigationCollapse() {
    const ctx = useContext(NavigationCollapseContext);
    if (!ctx) throw new Error("useNavigationCollapse must be used within NavigationCollapseProvider");
    return ctx;
}
