import { useState, useEffect, useMemo } from 'react';
import { 
    BarChart3, 
    Calendar, 
    Filter, 
    FolderKanban, 
    CheckCircle2, 
    Clock, 
    TrendingUp, 
    Search, 
    Layers, 
    Target 
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell 
} from 'recharts';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import './ProjectStats.css';

export default function ProjectStats() {
    const { toast } = useToast();
    const [stats, setStats] = useState({ projects: [], stages: [] });
    const [loading, setLoading] = useState(true);
    const [filterProject, setFilterProject] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: projects, error: pErr } = await supabase
                .from('projects')
                .select('*')
                .order('progress', { ascending: false });

            const { data: stages, error: sErr } = await supabase
                .from('project_stages')
                .select('*')
                .order('start_date', { ascending: true });

            if (pErr || sErr) throw pErr || sErr;

            setStats({ projects: projects || [], stages: stages || [] });
            if (projects && projects.length > 0) {
                setFilterProject(projects[0].id);
            }
        } catch (error) {
            console.error('Error fetching project stats:', error);
            toast.error('Error al cargar métricas de proyectos');
        } finally {
            setLoading(false);
        }
    };

    const kpiSummary = useMemo(() => {
        const total = stats.projects.length;
        const completed = stats.projects.filter(p => p.progress >= 100).length;
        const inProgress = stats.projects.filter(p => p.progress > 0 && p.progress < 100).length;
        const totalStages = stats.stages.length;
        const avgProgress = total > 0 
            ? Math.round(stats.projects.reduce((acc, p) => acc + (p.progress || 0), 0) / total) 
            : 0;

        return { total, completed, inProgress, totalStages, avgProgress };
    }, [stats]);

    const currentTimeline = useMemo(() => {
        if (filterProject === 'all') return [];
        return stats.stages.filter(s => s.project_id === filterProject);
    }, [stats.stages, filterProject]);

    const selectedProjectObj = stats.projects.find(p => p.id === filterProject);

    const filteredTableProjects = stats.projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.target_audience || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getProgressColor = (val) => {
        if (val >= 100) return '#10B981';
        if (val >= 50) return '#F59E0B';
        return '#3B82F6';
    };

    if (loading) {
        return (
            <div className="stats-loading">
                <span className="loading-spinner"></span>
                <p>Cargando métricas de proyectos...</p>
            </div>
        );
    }

    return (
        <div className="project-stats-container fade-in">
            {/* KPI Summary Cards */}
            <div className="pstats-kpi-grid">
                <div className="card pstats-card glass">
                    <div className="pstats-icon-box blue-box">
                        <FolderKanban size={22} />
                    </div>
                    <div className="pstats-info">
                        <span className="pstats-label">Iniciativas Totales</span>
                        <h3 className="pstats-number">{kpiSummary.total}</h3>
                        <span className="pstats-sub">Proyectos registrados</span>
                    </div>
                </div>

                <div className="card pstats-card glass">
                    <div className="pstats-icon-box green-box">
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="pstats-info">
                        <span className="pstats-label">Finalizados (100%)</span>
                        <h3 className="pstats-number text-success">{kpiSummary.completed}</h3>
                        <span className="pstats-sub">Objetivos cumplidos</span>
                    </div>
                </div>

                <div className="card pstats-card glass">
                    <div className="pstats-icon-box amber-box">
                        <TrendingUp size={22} />
                    </div>
                    <div className="pstats-info">
                        <span className="pstats-label">Avance Promedio</span>
                        <h3 className="pstats-number text-accent">{kpiSummary.avgProgress}%</h3>
                        <span className="pstats-sub">Consolidado global</span>
                    </div>
                </div>

                <div className="card pstats-card glass">
                    <div className="pstats-icon-box purple-box">
                        <Layers size={22} />
                    </div>
                    <div className="pstats-info">
                        <span className="pstats-label">Fases & Etapas</span>
                        <h3 className="pstats-number">{kpiSummary.totalStages}</h3>
                        <span className="pstats-sub">Hitos en seguimiento</span>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="pstats-charts-grid">
                {/* Horizontal Bar Chart - Avance por Proyecto */}
                <div className="card chart-card glass">
                    <div className="panel-header">
                        <div className="panel-title-group">
                            <BarChart3 size={18} className="panel-icon" />
                            <h3>Avance por Proyecto (%)</h3>
                        </div>
                        <span className="panel-tag">Consolidado</span>
                    </div>

                    <div className="chart-wrapper">
                        {stats.projects.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={stats.projects} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} stroke="#94A3B8" fontSize={11} unit="%" />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={120}
                                        stroke="#94A3B8"
                                        fontSize={12}
                                        tickFormatter={(name) => name.length > 14 ? `${name.substring(0, 14)}...` : name}
                                    />
                                    <Tooltip
                                        formatter={(val) => [`${val}%`, 'Avance']}
                                        contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }}
                                    />
                                    <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={20}>
                                        {stats.projects.map((p, index) => (
                                            <Cell key={`cell-${index}`} fill={getProgressColor(p.progress)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-panel">No hay proyectos para graficar</div>
                        )}
                    </div>
                </div>

                {/* Gantt / Timeline View */}
                <div className="card gantt-card glass">
                    <div className="panel-header">
                        <div className="panel-title-group">
                            <Calendar size={18} className="panel-icon" />
                            <h3>Cronograma de Etapas (Gantt)</h3>
                        </div>

                        <div className="project-select-filter">
                            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                                {stats.projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="gantt-content">
                        {filterProject === 'all' || !selectedProjectObj ? (
                            <div className="no-data-panel">Selecciona un proyecto arriba</div>
                        ) : currentTimeline.length === 0 ? (
                            <div className="no-data-panel">Este proyecto no tiene etapas cargadas</div>
                        ) : (
                            <div className="gantt-timeline-stack">
                                {currentTimeline.map(stage => {
                                    const isDone = stage.status === 'completed' || stage.status === 'done';
                                    const isInProgress = stage.status === 'in_progress';

                                    return (
                                        <div key={stage.id} className="gantt-row glass">
                                            <div className="gantt-row-meta">
                                                <div className="gantt-stage-name-wrap">
                                                    {isDone && <CheckCircle2 size={15} className="text-success" />}
                                                    {isInProgress && <Clock size={15} className="text-accent" />}
                                                    {!isDone && !isInProgress && <Clock size={15} className="text-muted" />}
                                                    <span className="gantt-stage-name">{stage.name}</span>
                                                </div>

                                                <span className={`badge-pill ${stage.status}`}>
                                                    {isDone ? 'Completado' : isInProgress ? 'En Progreso' : 'Pendiente'}
                                                </span>
                                            </div>

                                            <div className="gantt-bar-wrap">
                                                <div className="gantt-date-labels">
                                                    <span>{stage.start_date || 'Sin inicio'}</span>
                                                    <span>{stage.end_date || 'En curso'}</span>
                                                </div>
                                                <div className={`gantt-bar-fill ${stage.status}`} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Executive Summary Table */}
            <div className="card executive-table-card glass">
                <div className="table-header-bar">
                    <div>
                        <h3>Resumen Ejecutivo Consolidado</h3>
                        <p className="table-subtitle">Auditoría global de avances, públicos destinatarios y etapas activas</p>
                    </div>

                    <div className="table-search">
                        <Search size={15} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar en tabla..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="styled-table">
                        <thead>
                            <tr>
                                <th>Nombre del Proyecto</th>
                                <th>Público Destinatario</th>
                                <th>Etapas Asignadas</th>
                                <th>Avance General</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTableProjects.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="empty-table-cell">No se encontraron proyectos</td>
                                </tr>
                            ) : (
                                filteredTableProjects.map(p => {
                                    const pStages = stats.stages.filter(s => s.project_id === p.id);
                                    const progColor = getProgressColor(p.progress);
                                    const isCompleted = p.progress >= 100;

                                    return (
                                        <tr key={p.id}>
                                            <td className="project-cell-name">
                                                <strong>{p.name}</strong>
                                            </td>
                                            <td>{p.target_audience || 'General'}</td>
                                            <td>
                                                <span className="stages-count-pill">
                                                    {pStages.length} fases
                                                </span>
                                            </td>
                                            <td>
                                                <div className="progress-cell-wrap">
                                                    <div className="progress-track-mini">
                                                        <div 
                                                            className="progress-bar-mini" 
                                                            style={{ width: `${p.progress}%`, backgroundColor: progColor }}
                                                        />
                                                    </div>
                                                    <span className="progress-text-val" style={{ color: progColor }}>
                                                        {p.progress}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-pill ${isCompleted ? 'completed' : p.progress > 0 ? 'active' : 'pending'}`}>
                                                    {isCompleted ? 'Finalizado' : p.progress > 0 ? 'En Marcha' : 'Planificado'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
