import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )

    useEffect(() => {
        const root = window.document.documentElement
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

        const applyTheme = () => {
            const effectiveTheme: "dark" | "light" = theme === "system"
                ? (mediaQuery.matches ? "dark" : "light")
                : theme

            // Only remove the opposite class to avoid flash when :root:not(.dark) briefly matches
            if (effectiveTheme === "dark") {
                root.classList.remove("light")
            } else {
                root.classList.remove("dark")
            }
            root.classList.add(effectiveTheme)

            // Also set the data-shadcn-ui-mode attribute for CSS variable overrides
            document.body.setAttribute(
                'data-shadcn-ui-mode',
                effectiveTheme === 'dark' ? 'dark-emerald' : 'light-emerald'
            )
        }

        applyTheme()

        // Listen for system theme changes when using "system" theme
        const handleSystemThemeChange = () => {
            if (theme === "system") {
                applyTheme()
            }
        }

        mediaQuery.addEventListener("change", handleSystemThemeChange)
        return () => mediaQuery.removeEventListener("change", handleSystemThemeChange)
    }, [theme])

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
