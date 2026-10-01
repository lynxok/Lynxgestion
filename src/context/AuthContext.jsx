import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [currentCompany, setCurrentCompany] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // --- SESSION SECURITY: SAFE UUID & SINGLE SESSION ---
    const generateSessionId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            try {
                return crypto.randomUUID();
            } catch {
                // fallback
            }
        }
        return 'lynx_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    };

    const syncSessionId = async (userId) => {
        try {
            const newSessionId = generateSessionId();
            localStorage.setItem('lynx_session_id', newSessionId);

            await supabase
                .from('profiles')
                .update({ current_session_id: newSessionId })
                .eq('id', userId);

            return newSessionId;
        } catch (err) {
            console.warn('Session sync warning:', err);
            return null;
        }
    };

    const verifySessionId = async (userId) => {
        if (!userId) return true;

        try {
            const localSessionId = localStorage.getItem('lynx_session_id');
            if (!localSessionId) return true;

            const { data, error } = await supabase
                .from('profiles')
                .select('current_session_id')
                .eq('id', userId)
                .single();

            if (error || !data) return true;

            if (data.current_session_id && data.current_session_id !== localSessionId) {
                setAuthError('Se ha iniciado sesión en otro dispositivo. Se ha cerrado esta sesión.');
                await logout();
                return false;
            }
            return true;
        } catch (err) {
            console.warn('Verify session warning:', err);
            return true;
        }
    };

    // --- SESSION SECURITY: INACTIVITY ---
    useEffect(() => {
        if (!user) return;

        const timeout = 10 * 60 * 1000; // 10 minutes
        const intervalId = setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > timeout) {
                setAuthError('Sesión cerrada por inactividad (10 minutos).');
                logout();
            }
        }, 30000); // Check every 30s

        const updateActivity = () => setLastActivity(Date.now());

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('scroll', updateActivity);
        window.addEventListener('click', updateActivity);

        const sessionCheckId = setInterval(() => {
            verifySessionId(user.id);
        }, 60000);

        return () => {
            clearInterval(intervalId);
            clearInterval(sessionCheckId);
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            window.removeEventListener('click', updateActivity);
        };
    }, [user, lastActivity]);

    // Load full user metadata, permissions, and companies
    const loadUserData = async (baseUser) => {
        if (!baseUser) {
            setUser(null);
            setCompanies([]);
            setCurrentCompany(null);
            return;
        }

        try {
            // 1. Fetch Profile
            const { data: profile, error: profError } = await supabase
                .from('profiles')
                .select('is_approved, role')
                .eq('id', baseUser.id)
                .single();

            const isApproved = profile?.is_approved ?? false;
            const role = profile?.role || 'unassigned';

            // 2. Fetch Companies
            let allowedCompanies = [];
            let permissions = ['movements', 'statistics', 'projects', 'project-stats', 'settings'];

            if (role === 'superadmin') {
                const { data: allCompanies } = await supabase
                    .from('companies')
                    .select('*')
                    .order('name', { ascending: true });
                allowedCompanies = allCompanies || [];
            } else {
                // Fetch assigned companies from user_company_permissions
                const { data: userPerms } = await supabase
                    .from('user_company_permissions')
                    .select('company_id, role, modules, companies(*)')
                    .eq('user_id', baseUser.id);

                if (userPerms && userPerms.length > 0) {
                    allowedCompanies = userPerms.map(p => p.companies).filter(Boolean);
                    // Extract modules from current active or first company
                    if (userPerms[0].modules && Array.isArray(userPerms[0].modules)) {
                        permissions = userPerms[0].modules;
                    }
                }
            }

            // Set current company from localStorage or default to first company or 'all' for superadmin
            const savedCompId = localStorage.getItem('lynx_current_company_id');
            let initialCompany = null;
            if (role === 'superadmin') {
                if (savedCompId === 'all') {
                    initialCompany = { id: 'all', name: 'Todas las Empresas (Consolidado)' };
                } else {
                    initialCompany = allowedCompanies.find(c => c.id === savedCompId) || { id: 'all', name: 'Todas las Empresas (Consolidado)' };
                }
            } else {
                initialCompany = allowedCompanies.find(c => c.id === savedCompId) || allowedCompanies[0] || null;
            }

            setCurrentCompany(initialCompany);
            setCompanies(allowedCompanies);
            setUserPermissions(permissions);

            const completeUser = {
                ...baseUser,
                role,
                is_approved: isApproved,
            };

            setUser(completeUser);
            return completeUser;
        } catch (err) {
            console.error('Error loading user data:', err);
            setUser({ ...baseUser, role: 'unassigned', is_approved: false });
        }
    };

    const switchCompany = (comp) => {
        setCurrentCompany(comp);
        if (comp) {
            localStorage.setItem('lynx_current_company_id', comp.id);
        } else {
            localStorage.removeItem('lynx_current_company_id');
        }
    };

    const hasModulePermission = (moduleId) => {
        if (!user || !user.is_approved) return false;
        if (user.role === 'superadmin' || user.role === 'admin') return true;
        return userPermissions.includes(moduleId);
    };

    useEffect(() => {
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    if (!localStorage.getItem('lynx_session_id')) {
                        await syncSessionId(session.user.id);
                    }
                    await loadUserData(session.user);
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.warn('Init session note:', err);
                setUser(null);
            }
        };

        initSession();
    }, []);

    const login = async (email, password) => {
        setAuthError(null);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (error) throw error;

        if (data.user) {
            await syncSessionId(data.user.id);
            const loaded = await loadUserData(data.user);
            return loaded;
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('Sign out warning:', err);
        } finally {
            localStorage.removeItem('lynx_session_id');
            localStorage.removeItem('lynx_current_company_id');
            setUser(null);
            setCurrentCompany(null);
            setCompanies([]);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            logout, 
            loading, 
            authError, 
            setAuthError,
            companies,
            currentCompany,
            switchCompany,
            userPermissions,
            hasModulePermission,
            loadUserData
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
