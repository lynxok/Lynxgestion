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
    Target,
    Calculator,
    DollarSign,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Sliders,
    HelpCircle
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    PieChart as RechartsPie,
    Pie
} from 'recharts';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './ProjectStats.css';

export default function ProjectStats() {
    const { currentCompany } = useAuth();
    const { toast } = useToast();
    const [stats, setStats] = useState({ projects: [], stages: [], movements: [] });
    const [loading, setLoading] = useState(true);
    const [filterProject, setFilterProject] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Regla de asignación de costos comunes:
    // 'revenue' (Proporcional a Ingresos) | 'equal' (Partes Iguales) | 'direct_only' (Solo Gastos Directos)
    const [allocationRule, setAllocationRule] = useState('revenue');
    const [activeSubTab, setActiveSubTab] = useState('costs'); // 'costs' | 'gantt'

    useEffect(() => {
        fetchData();
    }, [currentCompany]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = (currentCompany && currentCompany.id !== 'all') ? currentCompany.id : null;

            let projQuery = supabase.from('projects').select('*').order('name', { ascending: true });
            let movQuery = supabase.from('movements').select('*, projects(name), cost_centers(name)').order('date', { ascending: true });

            if (companyId) {
                projQuery = projQuery.or(`company_id.eq.${companyId},company_id.is.null`);
                movQuery = movQuery.or(`company_id.eq.${companyId},company_id.is.null`);
            }

            const [pRes, sRes, mRes] = await Promise.all([
                projQuery,
                supabase.from('project_stages').select('*').order('start_date', { ascending: true }),
                movQuery
            ]);

            if (pRes.error || sRes.error || mRes.error) throw pRes.error || sRes.error || mRes.error;

            const projList = pRes.data || [];
            setStats({ 
                projects: projList, 
                stages: sRes.data || [],
                movements: mRes.data || []
            });

            if (projList.length > 0 && filterProject === 'all') {
                setFilterProject(projList[0].id);
            }
        } catch (error) {
            console.error('Error fetching project stats:', error);
            toast.error('Error al cargar métricas de proyectos');
        } finally {
            setLoading(false);
        }
    };

    // --- CÁLCULO DE COSTOS, INGRESOS Y REGLAS DE ASIGNACIÓN ---
    const projectFinancials = useMemo(() => {
        const totalProjectsCount = stats.projects.length || 1;

        // 1. Ingresos y egresos directos por proyecto
        const incomeByProject = {};
        const directExpenseByProject = {};
        let totalIncomeAll = 0;
        let commonExpensesTotal = 0;

        stats.movements.forEach(m => {
            const amt = parseFloat(m.amount) || 0;
            if (m.type === 'income') {
                totalIncomeAll += amt;
                if (m.project_id) {
                    incomeByProject[m.project_id] = (incomeByProject[m.project_id] || 0) + amt;
                }
            } else if (m.type === 'expense') {
                if (m.project_id) {
                    // Gasto directo del proyecto
                    directExpenseByProject[m.project_id] = (directExpenseByProject[m.project_id] || 0) + amt;
                } else {
                    // Gasto común / consultora
                    commonExpensesTotal += amt;
                }
            }
        });

        // 2. Aplicar Regla de Asignación de Gastos Comunes
        const projectSummary = stats.projects.map(p => {
            const income = incomeByProject[p.id] || 0;
            const directExpense = directExpenseByProject[p.id] || 0;
            let allocatedCommonExpense = 0;

            if (allocationRule === 'revenue') {
                // Proporcional a Ingresos
                const share = totalIncomeAll > 0 ? (income / totalIncomeAll) : (1 / totalProjectsCount);
                allocatedCommonExpense = commonExpensesTotal * share;
            } else if (allocationRule === 'equal') {
                // Partes Iguales
                allocatedCommonExpense = commonExpensesTotal / totalProjectsCount;
            } else if (allocationRule === 'direct_only') {
                // Solo gastos directos
                allocatedCommonExpense = 0;
            }

            const totalCost = directExpense + allocatedCommonExpense;
            const netMargin = income - totalCost;
            const marginPercent = income > 0 ? Math.round((netMargin / income) * 100) : 0;

            return {
                id: p.id,
                name: p.name,
                progress: p.progress || 0,
                target_audience: p.target_audience || 'General',
                income,
                directExpense,
                allocatedCommonExpense,
                totalCost,
                netMargin,
                marginPercent,
            };
        });

        const totalDirectExpenses = Object.values(directExpenseByProject).reduce((a, b) => a + b, 0);
        const grandTotalCost = totalDirectExpenses + commonExpensesTotal;
        const grandTotalMargin = totalIncomeAll - grandTotalCost;

        return {
            projects: projectSummary,
            totalIncomeAll,
            totalDirectExpenses,
            commonExpensesTotal,
            grandTotalCost,
            grandTotalMargin
        };
    }, [stats.projects, stats.movements, allocationRule]);

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

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

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
            {/* Sub-tab Navigation */}
            <div className="pstats-header-nav glass">
                <div className="pstats-tabs-left">
                    <button
                        className={`pstats-tab-btn ${activeSubTab === 'costs' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('costs')}
                    >
                        <Calculator size={18} />
                        <span>Costos & Rentabilidad por Proyecto</span>
                    </button>
                    <button
                        className={`pstats-tab-btn ${activeSubTab === 'gantt' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('gantt')}
                    >
                        <BarChart3 size={18} />
                        <span>Avance Operativo & Cronograma (Gantt)</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: COSTOS & RENTABILIDAD CON REGLAS DE ASIGNACIÓN */}
            {activeSubTab === 'costs' && (
                <>
                    {/* KPI Summary Cards Finanzas */}
                    <div className="pstats-kpi-grid">
                        <div className="card pstats-card glass">
                            <div className="pstats-icon-box green-box">
                                <DollarSign size={22} />
                            </div>
                            <div className="pstats-info">
                                <span className="pstats-label">Ingresos Totales</span>
                                <h3 className="pstats-number text-success">{formatCurrency(projectFinancials.totalIncomeAll)}</h3>
                                <span className="pstats-sub">Facturación de iniciativas</span>
                            </div>
                        </div>

                        <div className="card pstats-card glass">
                            <div className="pstats-icon-box purple-box">
                                <Layers size={22} />
                            </div>
                            <div className="pstats-info">
                                <span className="pstats-label">Gastos Directos</span>
                                <h3 className="pstats-number">{formatCurrency(projectFinancials.totalDirectExpenses)}</h3>
                                <span className="pstats-sub">Imputados a proyectos</span>
                            </div>
                        </div>

                        <div className="card pstats-card glass">
                            <div className="pstats-icon-box amber-box">
                                <Sliders size={22} />
                            </div>
                            <div className="pstats-info">
                                <span className="pstats-label">Gastos Comunes Consultora</span>
                                <h3 className="pstats-number text-accent">{formatCurrency(projectFinancials.commonExpensesTotal)}</h3>
                                <span className="pstats-sub">A distribuir entre proyectos</span>
                            </div>
                        </div>

                        <div className="card pstats-card glass">
                            <div className="pstats-icon-box blue-box">
                                <TrendingUp size={22} />
                            </div>
                            <div className="pstats-info">
                                <span className="pstats-label">Margen Neto Global</span>
                                <h3 className={`pstats-number ${projectFinancials.grandTotalMargin >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {formatCurrency(projectFinancials.grandTotalMargin)}
                                </h3>
                                <span className="pstats-sub">Resultado operacional</span>
                            </div>
                        </div>
                    </div>

                    {/* Allocation Rules Control Bar */}
                    <div className="card allocation-rules-card glass">
                        <div className="allocation-header">
                            <div className="allocation-title-wrap">
                                <Calculator size={20} className="alloc-icon" />
                                <div>
                                    <h3 className="alloc-title">Regla de Asignación de Gastos Comunes</h3>
                                    <p className="alloc-subtitle">
                                        Define cómo los {formatCurrency(projectFinancials.commonExpensesTotal)} de gastos generales de la consultora se distribuyen entre los proyectos
                                    </p>
                                </div>
                            </div>

                            <div className="allocation-pills">
                                <button
                                    className={`alloc-rule-btn ${allocationRule === 'revenue' ? 'active' : ''}`}
                                    onClick={() => setAllocationRule('revenue')}
                                    title="Distribuye proporcionalmente a los ingresos de cada proyecto"
                                >
                                    <span>📊 Proporcional a Ingresos</span>
                                </button>
                                <button
                                    className={`alloc-rule-btn ${allocationRule === 'equal' ? 'active' : ''}`}
                                    onClick={() => setAllocationRule('equal')}
                                    title="Distribuye en partes iguales entre los proyectos"
                                >
                                    <span>⚖️ Partes Iguales</span>
                                </button>
                                <button
                                    className={`alloc-rule-btn ${allocationRule === 'direct_only' ? 'active' : ''}`}
                                    onClick={() => setAllocationRule('direct_only')}
                                    title="No asigna gastos comunes, solo cuenta gastos directos"
                                >
                                    <span>🎯 Solo Gastos Directos</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Financial Breakdown Table per Project */}
                    <div className="card executive-table-card glass">
                        <div className="table-header-bar">
                            <div>
                                <h3>Matriz de Costos & Rentabilidad por Proyecto</h3>
                                <p className="table-subtitle">Desglose de ingresos, costos directos, cuota de gastos comunes y margen neto</p>
                            </div>

                            <div className="table-search">
                                <Search size={15} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Buscar proyecto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Proyecto</th>
                                        <th className="text-right">Ingresos</th>
                                        <th className="text-right">Gasto Directo</th>
                                        <th className="text-right">Gasto Común Asignado</th>
                                        <th className="text-right">Costo Total</th>
                                        <th className="text-right">Margen Neto ($)</th>
                                        <th className="text-right">Rentabilidad (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectFinancials.projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="empty-table-cell">No hay proyectos para mostrar</td>
                                        </tr>
                                    ) : (
                                        projectFinancials.projects
                                            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map(p => {
                                                const isProfitable = p.netMargin >= 0;
                                                return (
                                                    <tr key={p.id}>
                                                        <td className="project-cell-name">
                                                            <strong>📁 {p.name}</strong>
                                                        </td>
                                                        <td className="text-right text-success font-mono font-semibold">
                                                            {formatCurrency(p.income)}
                                                        </td>
                                                        <td className="text-right text-muted font-mono">
                                                            {formatCurrency(p.directExpense)}
                                                        </td>
                                                        <td className="text-right font-mono text-accent">
                                                            {formatCurrency(p.allocatedCommonExpense)}
                                                        </td>
                                                        <td className="text-right font-mono font-bold text-danger">
                                                            {formatCurrency(p.totalCost)}
                                                        </td>
                                                        <td className={`text-right font-mono font-bold ${isProfitable ? 'text-success' : 'text-danger'}`}>
                                                            {isProfitable ? '+' : ''}{formatCurrency(p.netMargin)}
                                                        </td>
                                                        <td className="text-right">
                                                            <span className={`status-pill ${isProfitable ? 'completed' : 'danger-pill'}`}>
                                                                {p.marginPercent}%
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
                </>
            )}

            {/* TAB 2: OPERATIVO & GANTT */}
            {activeSubTab === 'gantt' && (
                <>
                    {/* KPI Summary Cards Operativo */}
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
                                <h3>Resumen Operativo Consolidado</h3>
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
                </>
            )}
        </div>
    );
}
