import { AuthContext } from '@/App';
import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { dispatch } from '@/lib/eventBus';

export function useApiEventHandler() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  useEffect(() => {
    // Handle logout events - integrate with AuthContext
    const handleLogout = () => {
      if (window.location.pathname === '/login') return;
      dispatch({ type: 'auth/forceLogout', reason: 'Session expired - please log in again.', toastType: 'error' });
    };

    // Handle forbidden access
    const handleForbidden = (event: CustomEvent) => {
      toast.error('Access denied. You don\'t have permission to perform this action.');
      console.warn('Forbidden access:', event.detail);
    };

    // Handle not found errors
    const handleNotFound = (event: CustomEvent) => {
      toast.error('The requested resource was not found.');
      console.warn('Resource not found:', event.detail);
    };

    // Handle server errors
    const handleServerError = (event: CustomEvent) => {
      toast.error('A server error occurred. Please try again later.');
      console.error('Server error:', event.detail);
    };

    // Add event listeners
    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('api:forbidden', handleForbidden as EventListener);
    window.addEventListener('api:notfound', handleNotFound as EventListener);
    window.addEventListener('api:servererror', handleServerError as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('api:forbidden', handleForbidden as EventListener);
      window.removeEventListener('api:notfound', handleNotFound as EventListener);
      window.removeEventListener('api:servererror', handleServerError as EventListener);
    };
  }, [navigate, auth]);
}
