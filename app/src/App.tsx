import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { useHeaderStackHeight } from '@/lib/useHeaderStackHeight';
import NavigationMenu from './pages/navigation_menu/NavigationMenu';
import { useScreenDetector } from './hooks/useScreenDetector';
import Header from './pages/header/Header';
import ConnectionStatusHeader from './pages/header/ConnectionStatusHeader';
import { NavigationCollapseProvider, useNavigationCollapse } from "@/context/NavigationCollapseContext";
import Setup from './pages/setup/Setup';
import Settings from './pages/settings/Settings';
import PasswordReset from './pages/auth/PasswordReset';
import PasswordResetConfirm from './pages/auth/PasswordResetConfirm';
import Logs from './pages/logs/Logs';
import Blocklists from './pages/blocklists/Blocklists'
import CustomRules from './pages/custom_rules/CustomRules';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import TermsOfService from './pages/legal/TermsOfService';
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import FAQ from "./pages/legal/FAQ";
import NotFound from "./pages/NotFound";
import AccountPreferences from '@/pages/account_preferences/Account';
import MobileconfigPage from '@/pages/mobileconfig/MobileconfigPage';
import MobileconfigDownload from '@/pages/mobileconfig/MobileconfigDownload';
import HomeScreen from './pages/home/HomeScreen';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLoaderData, useLocation, useNavigate, redirect } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import api from "@/api/api";
import type { ModelAccount, ModelProfile } from "@/api/client/api";
import { AUTH_KEY } from "@/lib/consts"
import { useAppStore } from "@/store/general"
import { Toaster } from "@/components/ui/sonner"
import { ApiErrorBoundary } from "@/components/errors/ApiErrorBoundary";
import { RouterErrorBoundary } from "@/components/errors/RouterErrorBoundary";
import { useApiEventHandler } from "@/api/eventHandler";
import { toast } from "sonner";
import { authToasts } from "@/lib/authToasts";
import { subscribe, dispatch, type AppEvent } from '@/lib/eventBus';

// Auth context to manage authentication state
type AuthContextType = {
  isAuthenticated: boolean;
  login: (showToast?: boolean) => void;
  logout: (toastMessage?: string, toastType?: 'success' | 'info' | 'error' | 'warning') => void;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, isAuthenticated ? "true" : "false");
  }, [isAuthenticated]);

  // Public route predicate (keep in sync with router public section)
  const isPublicPath = (p: string) => (
    p === '/login' ||
    // Dynamic signup route requires subid; plain /signup should not be treated as public and will fall through to 404
    p.startsWith('/signup/') ||
    p === '/tos' ||
    p === '/privacy' ||
    p === '/standalone-faq' ||
    p === '/reset-password' ||
    p.startsWith('/reset-password/') ||
    p.startsWith('/verify/email/') ||
    p.startsWith('/short/')
  );

  // Universal redirect safeguard when auth state flips to false, but allow public paths
  useEffect(() => {
    if (!isAuthenticated) {
      const current = window.location.pathname;
      if (!isPublicPath(current)) {
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  const login = (showToast: boolean = true) => {
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_KEY, "true");
    if (showToast) authToasts.loginSuccess();
  };

  const performLogoutSideEffects = () => {
    localStorage.removeItem(AUTH_KEY);
    useAppStore.getState().setAccount(null);
    useAppStore.getState().setProfiles([]);
    useAppStore.getState().setActiveProfile(null);
  };

  const logout = (toastMessage?: string, toastType: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setIsAuthenticated(false);
    performLogoutSideEffects();
    if (toastMessage) {
      toast[toastType](toastMessage);
    } else {
      authToasts.logoutSuccess();
    }
  };

  // Subscribe to event bus for auth related forced logout events
  useEffect(() => {
    const unsub = subscribe((ev: AppEvent) => {
      if (ev.type === 'auth/forceLogout' || ev.type === 'auth/sessionExpired') {
        if (!isAuthenticated) return; // idempotent
        setIsAuthenticated(false);
        performLogoutSideEffects();
        const reason = ev.type === 'auth/sessionExpired' ? 'Session expired - please log in again.' : ev.reason;
        if (reason === 'Session expired - please log in again.') {
          authToasts.sessionExpired();
        } else if (reason) {
          toast[ev.type === 'auth/forceLogout' ? (ev.toastType || 'error') : 'error'](reason);
        } else {
          authToasts.logoutSuccess();
        }
        if (window.location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      }
    });
    return () => { unsub(); };
  }, [isAuthenticated, navigate]);

  // Removed legacy __session_expired_flag__ flush (event bus handles timing via queue)

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Loader for protected routes that need both account and profiles data
async function rootLoader() {
  try {
    // Check if user is authenticated before making API calls
    const authToken = localStorage.getItem(AUTH_KEY);
    if (!authToken || authToken !== "true") {
      // If no auth token, redirect to login instead of making API calls
      throw redirect("/login");
    }

    const [accountRes, profilesRes] = await Promise.all([
      api.Client.accountsApi.apiV1AccountsCurrentGet(),
      api.Client.profilesApi.apiV1ProfilesGet(),
    ]);

    // Save to Zustand store
    const account = accountRes.data as ModelAccount;
    const profiles = profilesRes.data as ModelProfile[];

    // This will run on the client, so we can update the store here:
    if (typeof window !== "undefined") {
      const { setAccount, setProfiles, restoreActiveProfile } = useAppStore.getState();
      setAccount(account);
      setProfiles(profiles);
      // Restore the previously selected profile or set the first one
      restoreActiveProfile(profiles);
    }

    return {
      account,
      profiles,
    };
  } catch (error: any) {




    if (error instanceof Response) throw error;
    const status = error?.response?.status ?? error?.status ?? (error instanceof Error && (error as any).status);
    if (status === 401 || status === 404) {
      // Dispatch a unified session expired event; AuthProvider subscriber performs cleanup + toast
      if (typeof window !== 'undefined') {
        dispatch({ type: 'auth/sessionExpired' });
      }
      throw redirect('/login');
    }
    if (status === 429) {
      if (typeof window !== 'undefined') {
        setTimeout(() => toast.error('Too many requests. Some features may be temporarily unavailable.'), 100);
      }
      return { account: null, profiles: [] };
    }
    console.error('Root loader error (unhandled):', error);
    throw redirect('/login');
  }
}

// Lighter loader for pages that only need profiles data (no account data needed)
async function profilesOnlyLoader() {
  try {
    // Check if user is authenticated before making API calls
    const authToken = localStorage.getItem(AUTH_KEY);
    if (!authToken || authToken !== "true") {
      // If no auth token, redirect to login instead of making API calls
      throw redirect("/login");
    }

    const profilesRes = await api.Client.profilesApi.apiV1ProfilesGet();

    // Save to Zustand store
    const profiles = profilesRes.data as ModelProfile[];

    // This will run on the client, so we can update the store here:
    if (typeof window !== "undefined") {
      const { setProfiles, restoreActiveProfile } = useAppStore.getState();
      setProfiles(profiles);
      // Restore the previously selected profile or set the first one
      restoreActiveProfile(profiles);
    }

    return {
      account: null,
      profiles,
    };
  } catch (error: any) {




    if (error instanceof Response) throw error;
    const status = error?.response?.status ?? error?.status ?? (error instanceof Error && (error as any).status);
    if (status === 401 || status === 404) {
      if (typeof window !== 'undefined') {
        dispatch({ type: 'auth/sessionExpired' });
      }
      throw redirect('/login');
    }
    if (status === 429) {
      if (typeof window !== 'undefined') {
        setTimeout(() => toast.error('Too many requests. Some features may be temporarily unavailable.'), 100);
      }
      return { account: null, profiles: [] };
    }
    console.error('Profiles loader error (unhandled):', error);
    throw redirect('/login');
  }
}

// Unified base layout for public/protected wrappers
function BaseLayout({ children, mode }: { children: React.ReactNode, mode: 'public' | 'app' }) {
  const baseClasses = 'relative flex flex-col min-h-screen overflow-x-hidden bg-[var(--shadcn-ui-app-background)]';
  if (mode === 'public') {
    return (
      <div data-testid="public-layout" className={baseClasses + ' w-full'} style={{ width: '100vw', maxWidth: '100vw' }}>
        {children}
      </div>
    );
  }
  return (
    <div className={'flex w-full min-h-screen overflow-x-hidden bg-[var(--shadcn-ui-app-background)]'}>
      {children}
    </div>
  );
}

// Backwards compatibility components (can be removed after updates)
const AppLayout = ({ children }: { children: React.ReactNode }) => <BaseLayout mode='app'>{children}</BaseLayout>;
const PublicLayout = ({ children }: { children: React.ReactNode }) => <BaseLayout mode='public'>{children}</BaseLayout>;

// Layout for protected routes
function ProtectedLayout() {
  // Call ALL hooks first, before any conditional returns
  const { isAuthenticated } = useAuth();
  const { collapsed } = useNavigationCollapse();
  const rightPanelOpen = useAppStore((state) => state.rightPanelOpen);
  const setRightPanelOpen = useAppStore((state) => state.setRightPanelOpen);
  const connectionStatusVisible = useAppStore((state) => state.connectionStatusVisible);
  const { profiles } = useAppStore();
  const location = useLocation();
  // IMPORTANT: call responsive detector BEFORE any conditional early return to maintain stable hook order
  const { isDesktop, navDesktop } = useScreenDetector();

  // Refs for measuring fixed headers
  const connectionHeaderRef = useRef<HTMLDivElement | null>(null);
  const mainHeaderRef = useRef<HTMLDivElement | null>(null);
  // Use shared hook; reduce spacing by 8px to tighten gap
  useHeaderStackHeight([connectionHeaderRef, mainHeaderRef], { reducePx: 30 });

  // Reset right panel when navigating away from setup page
  useEffect(() => {
    if (rightPanelOpen && location.pathname !== '/setup') {
      setRightPanelOpen(false);
    }
  }, [location.pathname, rightPanelOpen, setRightPanelOpen]);

  // Now handle conditional logic after all hooks are called
  const localAuthed = typeof window !== 'undefined' ? localStorage.getItem(AUTH_KEY) === 'true' : isAuthenticated;

  useEffect(() => {
    const revalidate = () => {
      // force React to reconsider by using a noop state update via navigation or location state change? Simplest: do nothing; Navigate check runs each render anyway.
    };
    window.addEventListener('auth:logout', revalidate);
    window.addEventListener('storage', (e) => { if (e.key === AUTH_KEY) revalidate(); });
    return () => {
      window.removeEventListener('auth:logout', revalidate);
    };
  }, []);

  if (!isAuthenticated || !localAuthed) {
    // eslint-disable-next-line no-console
    // redirecting to /login (guard log removed)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user navigates directly to /, redirect to /home
  if (location.pathname === "/") {
    return <Navigate to="/home" replace />;
  }

  // Determine if we should show the dialog trigger based on the current route
  const showDialogTrigger = location.pathname === '/blocklists' || location.pathname === '/query-logs' || location.pathname === '/custom-rules';

  const showProfileDropdown = location.pathname !== '/home' && location.pathname !== '/account-preferences';
  const showLogoutButton = location.pathname === '/account-preferences';

  // Determine current page name based on route
  const getCurrentPageName = () => {
    switch (location.pathname) {
      case '/home':
        return '';
      case '/setup':
        return '';
      case '/blocklists':
        return 'Blocklists';
      case '/custom-rules':
        return 'Custom rules';
      case '/settings':
        return 'Settings';
      case '/query-logs':
        return 'Logs';
      case '/account-preferences':
        return 'Account preferences';
      case '/mobileconfig':
        return 'Mobile configuration';
      case '/faq':
        return 'FAQ';
      default:
        // Handle dynamic routes or fallback
        if (location.pathname.startsWith('/setup/')) return 'DNS Setup';
        if (location.pathname.startsWith('/blocklists/')) return 'Blocklists';
        if (location.pathname.startsWith('/custom-rules/')) return 'Custom rules';
        if (location.pathname.startsWith('/settings/')) return 'Settings';
        if (location.pathname.startsWith('/query-logs/')) return 'Logs';
        if (location.pathname.startsWith('/account-preferences/')) return 'Account';
        if (location.pathname.startsWith('/mobileconfig/')) return 'Mobile configuration';
        return 'Dashboard';
    }
  };

  const currentPageName = getCurrentPageName();

  const sidebarWidth = navDesktop ? (collapsed ? 64 : 220) : 0;
  const rightPanelWidth = 600; // Width of the right panel guide
  const headerRightOffset = rightPanelOpen ? rightPanelWidth : 0;
  // Only reserve vertical space for connection status on desktop where it's rendered
  const headerTopOffset = (isDesktop && connectionStatusVisible) ? 48 : 0;
  // content top spacing now handled dynamically via --app-header-stack variable

  return (
    <AppLayout>
      {navDesktop && <div data-testid="persistent-sidebar"><NavigationMenu /></div>}
      {/* Fixed ConnectionStatusHeader - hide entirely on mobile or when user hides it */}
      {isDesktop && connectionStatusVisible && (
        <div
          ref={connectionHeaderRef}
          className="fixed top-0 right-0 z-50 transition-all duration-500"
          style={{ left: `${sidebarWidth}px` }}
        >
          <ConnectionStatusHeader />
        </div>
      )}
      {/* Fixed Header - responsive positioning */}
      <div
        ref={mainHeaderRef}
        className={`fixed right-0 z-50 transition-all duration-500 ${isDesktop ? '' : 'left-0'
          }`}
        style={isDesktop ? {
          top: `${headerTopOffset}px`,
          left: `${sidebarWidth}px`,
          right: `${headerRightOffset}px`
        } : {
          top: '0px',
          left: '0px',
          right: '0px'
        }}
      >
        <Header
          profiles={profiles || []}
          showProfileDropdown={showProfileDropdown}
          showLogoutButton={showLogoutButton}
          showDialogTrigger={showDialogTrigger}
          currentPageName={currentPageName}
        />
      </div>
      {/* Content area: responsive layout for mobile and desktop */}
      <div
        data-testid="app-content"
        className="transition-all duration-200 bg-[var(--shadcn-ui-app-background)] w-full overflow-x-hidden box-border"
        style={isDesktop ? {
          paddingTop: 'var(--app-header-stack, 64px)',
          marginLeft: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px - ${headerRightOffset}px)`,
          minHeight: 'calc(100vh - (var(--app-header-stack, 64px)))',
          maxWidth: '100vw'
        } : {
          // Use header stack variable if provided; fallback to 110px padding
          paddingTop: 'var(--app-header-stack, 110px)',
          paddingLeft: '0px',
          marginLeft: '0px',
          width: '100vw',
          minHeight: 'calc(100vh - 72px)',
          maxWidth: '100vw'
        }}
      >
        <Outlet />
      </div>
    </AppLayout>
  );
}

function RootIndexRedirect() {
  const { isAuthenticated } = useAuth();
  const localAuthed = typeof window !== 'undefined' ? localStorage.getItem(AUTH_KEY) === 'true' : isAuthenticated;
  const target = isAuthenticated && localAuthed ? '/home' : '/login';

  return <Navigate to={target} replace />;
}


function SetupWithLoader() {
  const { account, profiles } = useLoaderData() as { account: ModelAccount | null, profiles: ModelProfile[] };
  return <Setup account={account as ModelAccount} profiles={profiles} />;
}

function SettingsWithLoader() {
  const { profiles } = useLoaderData() as { account: ModelAccount | null, profiles: ModelProfile[] };
  return <Settings profiles={profiles} />;
}

function BlocklistsWithLoader() {
  return <Blocklists />;
}

function CustomRulesWithLoader() {
  const { profiles } = useLoaderData() as { account: ModelAccount | null, profiles: ModelProfile[] };
  return <CustomRules profiles={profiles} />;
}

function AccountPreferencesWithLoader() {
  const { account } = useLoaderData() as { account: ModelAccount | null };
  return <AccountPreferences account={account} />;
}

function MobileconfigWithLoader() {
  return <MobileconfigPage />;
}

function QueryLogsWithLoader() {
  const { account, profiles } = useLoaderData() as { account: ModelAccount | null, profiles: ModelProfile[] };
  return <Logs account={account as ModelAccount} profiles={profiles} />;
}// LoginWrapper handles login and redirects after success
function LoginWrapper() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from?.pathname || "/home";

  React.useEffect(() => {
    // Only redirect if user is authenticated AND they came from another protected page
    // Don't redirect if they're already on the login page (let Login component handle its own navigation)
    if (isAuthenticated && location.state?.from) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, navigate, from, location.state]);

  // Always render the Login component to avoid black screen issues
  // The redirect will happen in useEffect when authentication state updates
  return <Login />;
}

// Component that handles API events inside Router context
// Dedicated mount component so event handler has access to AuthContext (order matters)
function EventHandlerMount() {
  useApiEventHandler();
  return null;
}

function AppWithEventHandler() {
  return (
    <>
      <Toaster />
      <AuthProvider>
        <NavigationCollapseProvider>
          <EventHandlerMount />
          <Outlet />
        </NavigationCollapseProvider>
      </AuthProvider>
    </>
  );
}

// Define routes with proper separation
// Public routes are now grouped under a single PublicLayout parent to avoid remount flicker.
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppWithEventHandler />,
    errorElement: <RouterErrorBoundary />,
    children: [
      { index: true, element: <RootIndexRedirect /> },
      // PUBLIC ROUTES (grouped under one persistent layout to reduce white flicker between transitions)
      {
        path: "",
        element: <PublicLayout><Outlet /></PublicLayout>,
        children: [
          { path: "login", element: <LoginWrapper /> },
          { path: "signup/:subid", element: <Signup /> },
          { path: "tos", element: <TermsOfService /> },
          { path: "privacy", element: <PrivacyPolicy /> },
          { path: "standalone-faq", element: <FAQ /> },
          { path: "reset-password", element: <PasswordReset /> },
          { path: "reset-password/:token", element: <PasswordResetConfirm /> },
          { path: "short/:code", element: <MobileconfigDownload /> },
        ]
      },

      // PROTECTED ROUTES (authentication required)
      {
        path: "/",
        element: <ProtectedLayout />,
        errorElement: <RouterErrorBoundary />, // Protected route errors
        children: [
          { loader: rootLoader, path: "home", element: <HomeScreen /> },
          { loader: rootLoader, path: "setup", element: <SetupWithLoader /> },
          { loader: rootLoader, path: "settings", element: <SettingsWithLoader /> },
          { loader: profilesOnlyLoader, path: "blocklists", element: <BlocklistsWithLoader /> },
          { loader: rootLoader, path: "custom-rules", element: <CustomRulesWithLoader /> },
          { loader: rootLoader, path: "account-preferences", element: <AccountPreferencesWithLoader /> },
          { loader: rootLoader, path: "mobileconfig", element: <MobileconfigWithLoader /> },
          { loader: rootLoader, path: "query-logs", element: <QueryLogsWithLoader /> },
          { path: "faq", element: <FAQ /> },
        ],
      },

      // 404 CATCH-ALL for any unmatched routes (within first-level children)
      { path: "*", element: <NotFound /> },
    ],
  },
  // Global catch-all (extra safety) - can be retained or removed
  { path: "*", element: <NotFound /> },
]);

function App() {
  useEffect(() => {
    document.body.setAttribute('data-shadcn-ui-mode', 'dark-emerald');
  }, []);

  return (
    <ApiErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </ApiErrorBoundary>
  );
}


export default App;
export { useAuth, AuthContext, RootIndexRedirect };
