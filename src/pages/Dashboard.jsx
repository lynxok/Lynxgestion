import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MovementForm from '../components/MovementForm';
import Statistics from '../components/Statistics';
import Projects from '../components/Projects';
import ProjectStats from '../components/ProjectStats';
import { Receipt, PieChart, FolderKanban, BarChart3, Calendar } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('movements');

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
                                        <h1>Estadísticas Financieras</h1>
                                        <p className="tab-subtitle">Métricas de balance, gastos por responsable y evolución temporal</p>
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
                        </div>
                    </div>

                    <div className="topbar-right">
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
                </div>
            </main>
        </div>
    );
}
