import { ShieldAlert, LogOut, RefreshCw, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './PendingApproval.css';

export default function PendingApproval() {
    const { user, logout, loadUserData } = useAuth();

    return (
        <div className="pending-wrapper fade-in">
            <div className="pending-backdrop-glow"></div>

            <div className="pending-card glass slide-up">
                <div className="pending-icon-wrap">
                    <ShieldAlert size={42} className="pending-icon" />
                </div>

                <div className="pending-brand">
                    <img src="./favicon.png" alt="LYNX" className="pending-logo" />
                    <h2>LYNX <span className="highlight-text">GESTIÓN</span></h2>
                </div>

                <div className="pending-status-badge">
                    <span className="dot"></span>
                    <span>Acceso en Espera de Aprobación</span>
                </div>

                <h1 className="pending-title">Usuario Registrado Correctamente</h1>
                <p className="pending-desc">
                    Hola <strong className="user-highlight">{user?.email}</strong>. Por motivos de seguridad y control de acceso corporativo, un <strong>Super Administrador</strong> debe aprobar tu cuenta y asignarte tu rol, empresa y módulos permitidos antes de ingresar al sistema.
                </p>

                <div className="pending-info-box">
                    <div className="info-row">
                        <Mail size={16} />
                        <span>Notifica a tu administrador para que active tu acceso desde el módulo de Configuraciones.</span>
                    </div>
                </div>

                <div className="pending-actions">
                    <button className="btn-refresh glass" onClick={() => loadUserData(user)}>
                        <RefreshCw size={16} />
                        <span>Verificar Aprobación</span>
                    </button>
                    <button className="btn-logout" onClick={logout}>
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
