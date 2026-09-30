import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, ArrowRight, Mail, UserPlus, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Login.css';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, authError, setAuthError } = useAuth();
    const { toast } = useToast();
    const [localError, setLocalError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setAuthError(null);
        setLoading(true);

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT: El servidor tardó demasiado en responder. Revisa tu conexión.')), 10000)
        );

        try {
            if (isLogin) {
                await Promise.race([login(email.trim(), password), timeoutPromise]);
                toast.success('¡Bienvenido al sistema LYNX Gestión!');
            } else {
                const signUpPromise = (async () => {
                    const { data, error } = await supabase.auth.signUp({
                        email: email.trim(),
                        password,
                    });
                    if (error) throw error;
                    return data;
                })();
                await Promise.race([signUpPromise, timeoutPromise]);
                toast.success('Cuenta registrada correctamente. Iniciando sesión...');
            }
        } catch (err) {
            console.error('Login submit error:', err);
            if (err.message?.includes('Invalid login credentials')) {
                setLocalError('Credenciales incorrectas. Verifica tu correo y contraseña.');
            } else if (err.message?.includes('User already registered')) {
                setLocalError('Este correo electrónico ya se encuentra registrado.');
            } else if (err.message?.includes('TIMEOUT')) {
                setLocalError('Tiempo de conexión agotado. Inténtalo nuevamente.');
            } else {
                setLocalError('Error: ' + (err.message || 'Error de autenticación'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-backdrop-glow"></div>

            <div className="login-box glass slide-up">
                {/* Brand Header */}
                <div className="login-brand-header">
                    <div className="brand-badge">
                        <img src="./favicon.png" alt="LYNX" className="brand-login-logo" />
                    </div>
                    <h1 className="login-brand-title">
                        LYNX <span className="highlight-text">GESTIÓN</span>
                    </h1>
                    <p className="login-brand-desc">
                        {isLogin 
                            ? 'Ingresa tus credenciales para acceder al panel' 
                            : 'Crea tu usuario para comenzar a operar'}
                    </p>
                </div>

                {/* Auth Mode Tabs */}
                <div className="auth-tab-pill">
                    <button
                        type="button"
                        className={`tab-toggle ${isLogin ? 'active' : ''}`}
                        onClick={() => {
                            setIsLogin(true);
                            setLocalError('');
                        }}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        type="button"
                        className={`tab-toggle ${!isLogin ? 'active' : ''}`}
                        onClick={() => {
                            setIsLogin(false);
                            setLocalError('');
                        }}
                    >
                        Registrarse
                    </button>
                </div>

                {/* Error Banner */}
                {(localError || authError) && (
                    <div className="login-error-banner fade-in">
                        <span>{localError || authError}</span>
                    </div>
                )}

                {/* Form */}
                <form className="login-form-stack" onSubmit={handleSubmit}>
                    <div className="input-field-group">
                        <label className="field-label">Correo Electrónico</label>
                        <div className="input-icon-wrap">
                            <Mail className="field-icon" size={18} />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="styled-login-input"
                                placeholder="tu_correo@lynx.com.ar"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="input-field-group">
                        <label className="field-label">Contraseña</label>
                        <div className="input-icon-wrap">
                            <Lock className="field-icon" size={18} />
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="styled-login-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="pwd-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Mostrar contraseña"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-submit-btn"
                        disabled={loading}
                    >
                        <span>{loading ? 'Verificando...' : (isLogin ? 'Acceder al Panel' : 'Crear Cuenta')}</span>
                        {isLogin ? <ArrowRight size={18} /> : <UserPlus size={18} />}
                    </button>
                </form>

                <div className="login-footer-security">
                    <ShieldCheck size={14} className="sec-icon" />
                    <span>Conexión segura cifrada con Supabase & RLS</span>
                </div>
            </div>
        </div>
    );
}
