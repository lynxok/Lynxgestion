import { useMemo, useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Activity, 
    Download, 
    Calendar, 
    Filter, 
    Receipt, 
    Percent, 
    Wallet,
    FolderKanban,
    Tags,
    Layers,
    User,
    Truck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Statistics.css';

export default function Statistics() {
    const { currentCompany } = useAuth();
    const { toast } = useToast();
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('all'); // 'all', '30d', '90d', 'year'

    // Grouping Modes
    const [incomeGroupMode, setIncomeGroupMode] = useState('project'); // 'project' | 'category'
    const [expenseGroupMode, setExpenseGroupMode] = useState('cost_center'); // 'cost_center' | 'responsible' | 'supplier'

    useEffect(() => {
        fetchMovements();
    }, [currentCompany]);

    const fetchMovements = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('movements')
                .select(`
                    *,
                    projects(name),
                    income_categories(name),
                    cost_centers(name, code),
                    suppliers(name),
                    expense_responsibles(name),
                    cash_boxes(name)
                `)
                .order('date', { ascending: true });

            if (error) throw error;
            setMovements(data || []);
        } catch (error) {
            console.error('Error fetching movements:', error);
            toast.error('Error al cargar datos estadísticos');
        } finally {
            setLoading(false);
        }
    };

    const filteredMovements = useMemo(() => {
        if (timeRange === 'all') return movements;

        const now = new Date();
        return movements.filter(m => {
            const movementDate = new Date(m.date);
            if (timeRange === '30d') {
                const diffTime = Math.abs(now - movementDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            } else if (timeRange === '90d') {
                const diffTime = Math.abs(now - movementDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 90;
            } else if (timeRange === 'year') {
                return movementDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [movements, timeRange]);

    const stats = useMemo(() => {
        let totalIncome = 0;
        let totalExpense = 0;

        const incomeByProject = {};
        const incomeByCategory = {};
        const expenseByCostCenter = {};
        const expenseByResponsible = {};
        const expenseBySupplier = {};
        const monthlyStats = {};

        filteredMovements.forEach(m => {
            const amount = parseFloat(m.amount || 0);
            const [year, month] = (m.date || '').split('-');
            const monthKey = month && year ? `${month}/${year}` : 'General';

            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = { name: monthKey, ingresos: 0, gastos: 0, balance: 0 };
            }

            if (m.type === 'income') {
                totalIncome += amount;
                monthlyStats[monthKey].ingresos += amount;

                // Group Income by Project
                const projName = m.projects?.name || (m.company ? `Cliente: ${m.company}` : 'Sin Proyecto');
                incomeByProject[projName] = (incomeByProject[projName] || 0) + amount;

                // Group Income by Category
                const catName = m.income_categories?.name || 'Varios / General';
                incomeByCategory[catName] = (incomeByCategory[catName] || 0) + amount;
            } else {
                totalExpense += amount;
                monthlyStats[monthKey].gastos += amount;

                // Group Expense by Cost Center
                const ccName = m.cost_centers?.name || 'Gastos Operativos';
                expenseByCostCenter[ccName] = (expenseByCostCenter[ccName] || 0) + amount;

                // Group Expense by Responsible
                const respName = m.expense_responsibles?.name || m.company || 'Sin Asignar';
                expenseByResponsible[respName] = (expenseByResponsible[respName] || 0) + amount;

                // Group Expense by Supplier
                const suppName = m.suppliers?.name || 'Proveedor General';
                expenseBySupplier[suppName] = (expenseBySupplier[suppName] || 0) + amount;
            }

            monthlyStats[monthKey].balance = monthlyStats[monthKey].ingresos - monthlyStats[monthKey].gastos;
        });

        const incomeData = (incomeGroupMode === 'project' ? Object.entries(incomeByProject) : Object.entries(incomeByCategory))
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const expenseData = (
            expenseGroupMode === 'cost_center' ? Object.entries(expenseByCostCenter) :
            expenseGroupMode === 'responsible' ? Object.entries(expenseByResponsible) :
            Object.entries(expenseBySupplier)
        ).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

        const barData = Object.values(monthlyStats);
        const netBalance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;
        const totalTransactions = filteredMovements.length;

        return { 
            totalIncome, 
            totalExpense, 
            netBalance, 
            savingsRate, 
            totalTransactions, 
            incomeData,
            expenseData, 
            barData 
        };
    }, [filteredMovements, incomeGroupMode, expenseGroupMode]);

    const exportToCSV = () => {
        if (filteredMovements.length === 0) {
            toast.info('No hay datos para exportar');
            return;
        }

        const headers = ['ID', 'Fecha', 'Tipo', 'Monto', 'Proyecto', 'Categoria Ingreso', 'Centro de Costos', 'Responsable', 'Proveedor', 'Caja'];
        const rows = filteredMovements.map(m => [
            m.id,
            m.date,
            m.type === 'income' ? 'Ingreso' : 'Gasto',
            m.amount,
            `"${(m.projects?.name || '').replace(/"/g, '""')}"`,
            `"${(m.income_categories?.name || '').replace(/"/g, '""')}"`,
            `"${(m.cost_centers?.name || '').replace(/"/g, '""')}"`,
            `"${(m.expense_responsibles?.name || m.company || '').replace(/"/g, '""')}"`,
            `"${(m.suppliers?.name || '').replace(/"/g, '""')}"`,
            `"${(m.cash_boxes?.name || m.account || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `balance_financiero_lynx_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Reporte exportado exitosamente a CSV');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const COLORS_INCOME = ['#10B981', '#34D399', '#059669', '#38BDF8', '#6366F1', '#F59E0B', '#F97316'];
    const COLORS_EXPENSE = ['#EF4444', '#F87171', '#DC2626', '#F59E0B', '#A855F7', '#8B5CF6', '#EC4899'];

    if (loading) {
        return (
            <div className="stats-loading">
                <span className="loading-spinner"></span>
                <p>Calculando estadísticas financieras...</p>
            </div>
        );
    }

    return (
        <div className="stats-container fade-in">
            {/* Controls Bar */}
            <div className="stats-toolbar glass">
                <div className="range-filter-group">
                    <Filter size={16} className="filter-icon" />
                    <button 
                        className={`range-btn ${timeRange === 'all' ? 'active' : ''}`}
                        onClick={() => setTimeRange('all')}
                    >
                        Histórico Total
                    </button>
                    <button 
                        className={`range-btn ${timeRange === '30d' ? 'active' : ''}`}
                        onClick={() => setTimeRange('30d')}
                    >
                        Últimos 30 días
                    </button>
                    <button 
                        className={`range-btn ${timeRange === '90d' ? 'active' : ''}`}
                        onClick={() => setTimeRange('90d')}
                    >
                        Último Trimestre
                    </button>
                    <button 
                        className={`range-btn ${timeRange === 'year' ? 'active' : ''}`}
                        onClick={() => setTimeRange('year')}
                    >
                        Este Año
                    </button>
                </div>

                <button className="btn-export-csv" onClick={exportToCSV}>
                    <Download size={16} />
                    <span>Exportar a Excel / CSV</span>
                </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="stats-kpi-grid">
                <div className="card kpi-metric-card glass">
                    <div className="metric-icon-box income-box">
                        <TrendingUp size={22} />
                    </div>
                    <div className="metric-info">
                        <span className="metric-title">Ingresos Totales</span>
                        <h3 className="metric-number text-success">{formatCurrency(stats.totalIncome)}</h3>
                        <span className="metric-sub">Entradas imputadas</span>
                    </div>
                </div>

                <div className="card kpi-metric-card glass">
                    <div className="metric-icon-box expense-box">
                        <TrendingDown size={22} />
                    </div>
                    <div className="metric-info">
                        <span className="metric-title">Gastos Totales</span>
                        <h3 className="metric-number text-danger">{formatCurrency(stats.totalExpense)}</h3>
                        <span className="metric-sub">Centros de costos</span>
                    </div>
                </div>

                <div className="card kpi-metric-card glass">
                    <div className="metric-icon-box balance-box">
                        <Wallet size={22} />
                    </div>
                    <div className="metric-info">
                        <span className="metric-title">Balance de Flujo</span>
                        <h3 className={`metric-number ${stats.netBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(stats.netBalance)}
                        </h3>
                        <span className="metric-sub">Margen financiero neto</span>
                    </div>
                </div>

                <div className="card kpi-metric-card glass">
                    <div className="metric-icon-box savings-box">
                        <Percent size={22} />
                    </div>
                    <div className="metric-info">
                        <span className="metric-title">Rendimiento</span>
                        <h3 className="metric-number text-accent">{stats.savingsRate}%</h3>
                        <span className="metric-sub">{stats.totalTransactions} transacciones</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="stats-charts-grid">
                {/* INGRESOS BREAKDOWN */}
                <div className="card chart-card glass">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">Composición de Ingresos</h3>
                            <p className="chart-subtitle">Desglose de recaudación según criterio seleccionado</p>
                        </div>
                        <div className="chart-mode-pills">
                            <button 
                                className={`mode-pill ${incomeGroupMode === 'project' ? 'active' : ''}`}
                                onClick={() => setIncomeGroupMode('project')}
                            >
                                <FolderKanban size={13} />
                                <span>Por Proyecto</span>
                            </button>
                            <button 
                                className={`mode-pill ${incomeGroupMode === 'category' ? 'active' : ''}`}
                                onClick={() => setIncomeGroupMode('category')}
                            >
                                <Tags size={13} />
                                <span>Por Categoría</span>
                            </button>
                        </div>
                    </div>

                    <div className="chart-content">
                        {stats.incomeData.length === 0 ? (
                            <div className="chart-empty">
                                <Receipt size={32} />
                                <p>Sin ingresos registrados en este período</p>
                            </div>
                        ) : (
                            <div className="chart-with-legend">
                                <div className="chart-donut-wrap">
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie
                                                data={stats.incomeData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={95}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {stats.incomeData.map((_, index) => (
                                                    <Cell key={`income-${index}`} fill={COLORS_INCOME[index % COLORS_INCOME.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value) => [formatCurrency(value), 'Monto']}
                                                contentStyle={{ background: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="chart-legend-list">
                                    {stats.incomeData.slice(0, 5).map((entry, idx) => {
                                        const pct = stats.totalIncome > 0 ? ((entry.value / stats.totalIncome) * 100).toFixed(1) : 0;
                                        return (
                                            <div key={idx} className="legend-row">
                                                <div className="legend-left">
                                                    <span className="legend-dot" style={{ background: COLORS_INCOME[idx % COLORS_INCOME.length] }} />
                                                    <span className="legend-name" title={entry.name}>{entry.name}</span>
                                                </div>
                                                <div className="legend-right">
                                                    <span className="legend-val">{formatCurrency(entry.value)}</span>
                                                    <span className="legend-pct">{pct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* EGRESOS BREAKDOWN (CENTROS DE COSTOS) */}
                <div className="card chart-card glass">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">Egresos por Centro de Costos</h3>
                            <p className="chart-subtitle">Imputación del gasto según estructura de costos</p>
                        </div>
                        <div className="chart-mode-pills">
                            <button 
                                className={`mode-pill ${expenseGroupMode === 'cost_center' ? 'active' : ''}`}
                                onClick={() => setExpenseGroupMode('cost_center')}
                            >
                                <Layers size={13} />
                                <span>Centro de Costos</span>
                            </button>
                            <button 
                                className={`mode-pill ${expenseGroupMode === 'responsible' ? 'active' : ''}`}
                                onClick={() => setExpenseGroupMode('responsible')}
                            >
                                <User size={13} />
                                <span>Responsable</span>
                            </button>
                            <button 
                                className={`mode-pill ${expenseGroupMode === 'supplier' ? 'active' : ''}`}
                                onClick={() => setExpenseGroupMode('supplier')}
                            >
                                <Truck size={13} />
                                <span>Proveedor</span>
                            </button>
                        </div>
                    </div>

                    <div className="chart-content">
                        {stats.expenseData.length === 0 ? (
                            <div className="chart-empty">
                                <Receipt size={32} />
                                <p>Sin egresos registrados en este período</p>
                            </div>
                        ) : (
                            <div className="chart-with-legend">
                                <div className="chart-donut-wrap">
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie
                                                data={stats.expenseData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={95}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {stats.expenseData.map((_, index) => (
                                                    <Cell key={`expense-${index}`} fill={COLORS_EXPENSE[index % COLORS_EXPENSE.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value) => [formatCurrency(value), 'Monto']}
                                                contentStyle={{ background: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="chart-legend-list">
                                    {stats.expenseData.slice(0, 5).map((entry, idx) => {
                                        const pct = stats.totalExpense > 0 ? ((entry.value / stats.totalExpense) * 100).toFixed(1) : 0;
                                        return (
                                            <div key={idx} className="legend-row">
                                                <div className="legend-left">
                                                    <span className="legend-dot" style={{ background: COLORS_EXPENSE[idx % COLORS_EXPENSE.length] }} />
                                                    <span className="legend-name" title={entry.name}>{entry.name}</span>
                                                </div>
                                                <div className="legend-right">
                                                    <span className="legend-val">{formatCurrency(entry.value)}</span>
                                                    <span className="legend-pct">{pct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Monthly Trend Evolution */}
            <div className="card chart-card glass full-width-chart">
                <div className="chart-header">
                    <div>
                        <h3 className="chart-title">Evolución de Flujo Financiero Mensual</h3>
                        <p className="chart-subtitle">Comparativa temporal de ingresos, gastos y balance neto</p>
                    </div>
                </div>

                <div className="chart-content" style={{ height: '320px' }}>
                    {stats.barData.length === 0 ? (
                        <div className="chart-empty">
                            <Activity size={32} />
                            <p>No hay suficientes transacciones para graficar la evolución</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                                <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                <Tooltip 
                                    formatter={(value) => [formatCurrency(value)]}
                                    contentStyle={{ background: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
