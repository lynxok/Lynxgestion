import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // --- SESSION SECURITY: SINGLE SESSION ---
    const syncSessionId = async (userId) => {
        try {
            const newSessionId = crypto.randomUUID();
            localStorage.setItem('lynx_session_id', newSessionId);

            await supabase
                .from('profiles')
                .update({ current_session_id: newSessionId })
                .eq('id', userId);

            return newSessionId;
        } catch (err) {
            console.error('Session sync error:', err);
            return null;
        }
    };

    const verifySessionId = async (userId) => {
        if (!userId) return true;

        try {
            const localSessionId = localStorage.getItem('lynx_session_id');
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
            console.error('Verify session error:', err);
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

        // Listeners for activity
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('scroll', updateActivity);
        window.addEventListener('click', updateActivity);

        // Verification of concurrent session every minute
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
        // Check active sessions and subscribe to auth changes
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    await checkUserApproval(session.user);
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('Init session error:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session?.user) {
                    await checkUserApproval(session.user);
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('Auth state change error:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        });

        return () => subscription?.unsubscribe();
    }, []);

    const checkUserApproval = async (currentUser) => {
        if (!currentUser) {
            setUser(null);
            return;
        }

        try {
            setAuthError(null);
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_approved, role')
                .eq('id', currentUser.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                if (error.code === 'PGRST116') {
                    setAuthError('Tu perfil no existe aún en la base de datos.');
                } else {
                    setAuthError('Error de servidor al verificar aprobación.');
                }
                await supabase.auth.signOut();
                setUser(null);
                return;
            }

            if (profile?.is_approved) {
                currentUser.role = profile.role;

                // Sync session ID if not present or just logged in
                if (!localStorage.getItem('lynx_session_id')) {
                    await syncSessionId(currentUser.id);
                }

                setUser(currentUser);
            } else {
                setAuthError('Tu cuenta está pendiente de aprobación por el administrador.');
                await supabase.auth.signOut();
                setUser(null);
            }
        } catch (err) {
            console.error('Auth check error:', err);
            setAuthError('Error de autenticación inesperado.');
            setUser(null);
        }
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;

        if (data.user) {
            await syncSessionId(data.user.id);
            await checkUserApproval(data.user);
        }

        return data;
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Sign out error:', err);
        } finally {
            localStorage.removeItem('lynx_session_id');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, authError, setAuthError }}>
            {loading ? (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    backgroundColor: '#070B14',
                    color: '#F8FAFC',
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        border: '3px solid rgba(245, 158, 11, 0.15)',
                        borderTopColor: '#F59E0B',
                        borderRadius: '50%',
                        animation: 'authSpin 0.8s linear infinite',
                        boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)'
                    }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em' }}>
                        CARGANDO LYNX GESTIÓN...
                    </span>
                    <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
