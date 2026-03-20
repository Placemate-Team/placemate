import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

/**
 * ProtectedRoute — wraps any element that requires authentication.
 * @param {React.ReactNode} children
 * @param {string[]} [roles] — optional allowed roles; omit to allow any authenticated user
 */
const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // In dev mode — always allow access, skip all auth checks
    if (DEV_MODE) return children;

    // Show nothing while bootstrapping token
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Not authenticated → redirect to /auth
    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // Authenticated but wrong role → redirect to dashboard
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
