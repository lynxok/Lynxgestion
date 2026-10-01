import { useState } from 'react';
import { 
    Menu, 
    X, 
    Receipt, 
    PieChart, 
    FolderKanban, 
    BarChart3, 
    Settings as SettingsIcon,
    LogOut, 
    ShieldCheck, 
    ShieldAlert,
    Crown,
    User, 
    Sparkles,
    Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab }) {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout, hasModulePermission, currentCompany } = useAuth();

    const toggleSidebar = () => setIsOpen(!isOpen);

    const allMenuItems = [
        { id: 'movements', label: 'Cargar Movimientos', icon: <Receipt size={19} /> },
        { id: 'statistics', label: 'Estadísticas Financieras', icon: <PieChart size={19} /> },
        { id: 'projects', label: 'Gestión de Proyectos', icon: <FolderKanban size={19} /> },
        { id: 'project-stats', label: 'Métricas de Proyectos', icon: <BarChart3 size={19} /> },
        { id: 'settings', label: 'Configuraciones', icon: <SettingsIcon size={19} /> },
    ];

    // Filter menu items by user permissions
    const menuItems = allMenuItems.filter(item => hasModulePermission(item.id));

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
    
    const getRoleBadge = () => {
        if (user?.role === 'superadmin') {
            return (
                <span className="user-badge superadmin">
                    <Crown size={12} />
                    Super Admin
                </span>
            );
        }
        if (user?.role === 'admin') {
            return (
                <span className="user-badge admin">
                    <ShieldCheck size={12} />
                    Administrador
                </span>
            );
        }
        return (
            <span className="user-badge operator">
                <User size={12} />
                Operador
            </span>
        );
    };

    return (
        <>
            <button className="menu-toggle glass" onClick={toggleSidebar} aria-label="Abrir menú">
                <Menu size={22} />
            </button>

            <aside className={`sidebar glass ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="brand-wrapper">
                        <img src="./favicon.png" alt="LYNX" className="brand-logo" />
                        <div className="brand-text">
                            <span className="brand-name">LYNX</span>
                            <span className="brand-sub">GESTIÓN</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={toggleSidebar} aria-label="Cerrar menú">
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-status">
                    <span className="status-dot"></span>
                    <span className="status-label">
                        {currentCompany?.name ? currentCompany.name.slice(0, 22) : 'Sistema Operativo'}
                    </span>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-title">MÓDULOS PRINCIPALES</div>
                    {menuItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                                {isActive && <span className="active-indicator" />}
                            </button>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile-card">
                        <div className="user-avatar">
                            {userInitial}
                        </div>
                        <div className="user-details">
                            <span className="user-email" title={user?.email}>
                                {user?.email || 'Usuario'}
                            </span>
                            {getRoleBadge()}
                        </div>
                    </div>

                    <button className="logout-btn" onClick={logout} title="Cerrar sesión">
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {isOpen && <div className="overlay" onClick={() => setIsOpen(false)} />}
        </>
    );
}
