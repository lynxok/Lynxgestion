import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MovementForm from '../components/MovementForm';
import Statistics from '../components/Statistics';
import Projects from '../components/Projects';
import ProjectStats from '../components/ProjectStats';
import Settings from '../components/Settings';
import { useAuth } from '../context/AuthContext';
import { 
    Receipt, 
    PieChart, 
    FolderKanban, 
    BarChart3, 
    Settings as SettingsIcon, 
    Calendar,
    Building2,
    ChevronDown
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('movements');
    const { user, companies, currentCompany, switchCompany } = useAuth();

    const formattedDate = new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date());

    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    return (
        <div className="dashboard-layout">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="main-content">
                <header className="dashboard-topbar glass">
                    <div className="topbar-left">
                        <div className="tab-title-group">
                            {activeTab === 'movements' && (
                                <>
                                    <div className="tab-icon-wrapper"><Receipt size={22} /></div>
                                    <div>
                                        <h1>Gestión de Movimientos</h1>
                                        <p className="tab-subtitle">Registro y control de ingresos y egresos financieros</p>
                                    </div>
                                </>
                            )}
                            {activeTab === 'statistics' && (
                                <>
                                    <div className="tab-icon-wrapper"><PieChart size={22} /></div>
                                    <div>
                                        <h1>Estadísticas & Balance</h1>
                                        <p className="tab-subtitle">Métricas de balance por proyectos, categorías y centros de costos</p>
                                    </div>
                                </>
                            )}
                            {activeTab === 'projects' && (
                                <>
                                    <div className="tab-icon-wrapper"><FolderKanban size={22} /></div>
                                    <div>
                                        <h1>Gestión de Proyectos</h1>
                                        <p className="tab-subtitle">Planificación de iniciativas, etapas e hitos de ejecución</p>
                                    </div>
                                </>
                            )}
                            {activeTab === 'project-stats' && (
                                <>
                                    <div className="tab-icon-wrapper"><BarChart3 size={22} /></div>
                                    <div>
                                        <h1>Métricas de Proyectos</h1>
                                        <p className="tab-subtitle">Cronogramas Gantt, avance porcentual y resumen ejecutivo</p>
                                    </div>
                                </>
                            )}
                            {activeTab === 'settings' && (
                                <>
                                    <div className="tab-icon-wrapper"><SettingsIcon size={22} /></div>
                                    <div>
                                        <h1>Módulo de Configuraciones</h1>
                                        <p className="tab-subtitle">Cajas, Categorías, Centros de Costos, Proveedores y Permisos de Usuarios</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="topbar-right">
                        {/* Multi-Company Selector for Super Admin & Admin */}
                        {companies.length > 0 && (
                            <div className="company-selector-badge glass">
                                <Building2 size={16} className="company-icon" />
                                <select 
                                    className="company-select-input"
                                    value={currentCompany?.id || 'all'}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'all') {
                                            switchCompany({ id: 'all', name: 'Todas las Empresas (Consolidado)' });
                                        } else {
                                            const found = companies.find(c => c.id === val);
                                            if (found) switchCompany(found);
                                        }
                                    }}
                                >
                                    {user?.role === 'superadmin' && (
                                        <option value="all">🏢 Todas las Empresas (Consolidado)</option>
                                    )}
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            🏢 {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="date-badge glass">
                            <Calendar size={15} />
                            <span>{capitalizedDate}</span>
                        </div>
                    </div>
                </header>

                <div className="content-container">
                    {activeTab === 'movements' && <MovementForm />}
                    {activeTab === 'statistics' && <Statistics />}
                    {activeTab === 'projects' && <Projects />}
                    {activeTab === 'project-stats' && <ProjectStats />}
                    {activeTab === 'settings' && <Settings />}
                </div>
            </main>
        </div>
    );
}
