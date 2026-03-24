import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('pm_token'));
    const [loading, setLoading] = useState(true);

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

    // Bootstrap — reload user from /me on page refresh
    useEffect(() => {
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
        localStorage.removeItem('pm_token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUserFromGoogle }}>
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
