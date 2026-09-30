import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
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

        const timeout = 5 * 60 * 1000; // 5 minutes
        const intervalId = setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > timeout) {
                setAuthError('Sesión cerrada por inactividad (5 minutos).');
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

    useEffect(() => {
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('is_approved, role')
                        .eq('id', session.user.id)
                        .single();

                    if (!error && profile?.is_approved) {
                        const validatedUser = { ...session.user, role: profile.role };
                        if (!localStorage.getItem('lynx_session_id')) {
                            await syncSessionId(session.user.id);
                        }
                        setUser(validatedUser);
                    } else {
                        setUser(null);
                    }
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
            const { data: profile, error: profError } = await supabase
                .from('profiles')
                .select('is_approved, role')
                .eq('id', data.user.id)
                .single();

            if (profError) {
                console.warn('Profile fetch warning:', profError);
                if (profError.code === 'PGRST116') {
                    throw new Error('Tu perfil aún no existe en la base de datos. Regístrate para comenzar.');
                }
                throw new Error('Error al conectar con el perfil del usuario.');
            }

            if (!profile?.is_approved) {
                await supabase.auth.signOut();
                throw new Error('Tu cuenta está pendiente de aprobación por el administrador.');
            }

            await syncSessionId(data.user.id);
            const authenticatedUser = { ...data.user, role: profile.role };
            setUser(authenticatedUser);
            return authenticatedUser;
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('Sign out warning:', err);
        } finally {
            localStorage.removeItem('lynx_session_id');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, authError, setAuthError }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
