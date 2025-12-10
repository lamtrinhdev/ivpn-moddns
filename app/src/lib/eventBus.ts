// Simple typed in-memory event bus
export type AppEvent =
  | { type: 'auth/forceLogout'; reason?: string; toastType?: 'success'|'info'|'error'|'warning' }
  | { type: 'auth/sessionExpired' }
  | { type: 'toast/show'; level: 'success'|'info'|'error'|'warning'; message: string }
  ;

export type AppEventListener = (ev: AppEvent) => void;

const listeners = new Set<AppEventListener>();
let hasSubscriber = false;
const pending: AppEvent[] = [];

export function subscribe(listener: AppEventListener) {
  listeners.add(listener);
  if (!hasSubscriber) {
    hasSubscriber = true;
    // Flush queued events in order
    if (pending.length) {
      const toFlush = pending.splice(0, pending.length);
      toFlush.forEach(e => {
        try { listener(e); } catch { /* ignore */ }
      });
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      hasSubscriber = false;
    }
  };
}

export function dispatch(ev: AppEvent) {
  if (!hasSubscriber) {
    pending.push(ev);
    return;
  }
  listeners.forEach(l => {
    try { l(ev); } catch { /* swallow */ }
  });
}

// Dev/test bridge for E2E (non-production)
if (typeof window !== 'undefined' && (import.meta as any).env?.MODE !== 'production') {
  (window as any).__APP_DISPATCH_EVENT__ = dispatch;
}
