import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const DEV_USER = {
    _id: 'dev-user',
    email: 'dev@anits.edu.in',
    role: 'Ignite',
    name: 'Dev User',
    nickname: 'DevNick',
    batch: '2025-2029',
    branch: 'CSE',
    profileComplete: true,
    isCodeLeagueRegistered: true,
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(DEV_MODE ? DEV_USER : null);
    const [token, setToken] = useState(() => localStorage.getItem('pm_token'));
    const [loading, setLoading] = useState(!DEV_MODE); // In dev mode, no loading needed

    // Axios base defaults
    axios.defaults.baseURL = '/api';

    // Inject token into every request
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Bootstrap — reload user from /me on page refresh (skipped in dev mode)
    useEffect(() => {
        if (DEV_MODE) return; // Skip real auth bootstrap in dev mode

        const bootstrap = async () => {
            if (!token) { setLoading(false); return; }
            try {
                const { data } = await axios.get('/auth/me');
                setUser(data.user);
            } catch {
                // Token expired or invalid
                localStorage.removeItem('pm_token');
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        bootstrap();
    }, [token]);

    // DEV MODE: switch role instantly
    const switchRole = useCallback((newRole) => {
        if (!DEV_MODE) return;
        setUser((prev) => ({ ...prev, role: newRole }));
        localStorage.setItem('pm_dev_role', newRole);
    }, []);

    // Legacy email/password login
    const login = useCallback(async (email, password) => {
        const { data } = await axios.post('/auth/login', { email, password });
        localStorage.setItem('pm_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data.user;
    }, []);

    // Legacy email/password register
    const register = useCallback(async (name, email, password, role) => {
        const { data } = await axios.post('/auth/register', { name, email, password, role });
        localStorage.setItem('pm_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data.user;
    }, []);

    // Called by Auth.jsx after Google success + API response
    const setUserFromGoogle = useCallback((userData) => {
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        if (DEV_MODE) {
            // In dev mode, reset to default dev user
            setUser(DEV_USER);
            return;
        }
        localStorage.removeItem('pm_token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUserFromGoogle, switchRole, devMode: DEV_MODE }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export default AuthContext;
