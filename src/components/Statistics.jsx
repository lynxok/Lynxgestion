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
    Wallet 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import './Statistics.css';

export default function Statistics() {
    const { toast } = useToast();
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('all'); // 'all', '30d', '90d', 'year'

    useEffect(() => {
        fetchMovements();
    }, []);

    const fetchMovements = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('movements')
                .select('*')
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
        const expenseByResponsible = {};
        const monthlyStats = {};

        filteredMovements.forEach(m => {
            const amount = parseFloat(m.amount || 0);
            const [year, month] = (m.date || '').split('-');
            const monthKey = month && year ? `${month}/${year}` : 'Otro';

            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = { name: monthKey, ingresos: 0, gastos: 0, balance: 0 };
            }

            if (m.type === 'income') {
                totalIncome += amount;
                monthlyStats[monthKey].ingresos += amount;
            } else {
                totalExpense += amount;
                monthlyStats[monthKey].gastos += amount;

                const resp = m.company || 'Sin asignar';
                expenseByResponsible[resp] = (expenseByResponsible[resp] || 0) + amount;
            }

            monthlyStats[monthKey].balance = monthlyStats[monthKey].ingresos - monthlyStats[monthKey].gastos;
        });

        const pieData = Object.entries(expenseByResponsible).map(([name, value]) => ({ name, value }));
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
            pieData, 
            barData 
        };
    }, [filteredMovements]);

    const exportToCSV = () => {
        if (filteredMovements.length === 0) {
            toast.info('No hay datos para exportar');
            return;
        }

        const headers = ['ID', 'Fecha', 'Tipo', 'Monto', 'Empresa/Responsable', 'Detalle/Cuenta'];
        const rows = filteredMovements.map(m => [
            m.id,
            m.date,
            m.type === 'income' ? 'Ingreso' : 'Gasto',
            m.amount,
            `"${(m.company || '').replace(/"/g, '""')}"`,
            `"${((m.type === 'income' ? m.account : m.description) || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_financiero_lynx_${new Date().toISOString().split('T')[0]}.csv`);
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

    const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316'];

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
                        <span className="metric-sub">Entradas registradas</span>
                    </div>
                </div>

                <div className="card kpi-metric-card glass">
                    <div className="metric-icon-box expense-box">
                        <TrendingDown size={22} />
                    </div>
                    <div className="metric-info">
                        <span className="metric-title">Gastos Totales</span>
                        <h3 className="metric-number text-danger">{formatCurrency(stats.totalExpense)}</h3>
                        <span className="metric-sub">Egresos operativos</span>
                    </div>
                </div>

                <div className="card kpi-metric-card glass">
                    <div className="metric-icon-box balance-box">
                        <Wallet size={22} />
                    </div>
                    <div className="metric-info">
                        <span className="metric-title">Balance Neto</span>
                        <h3 className={`metric-number ${stats.netBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(stats.netBalance)}
                        </h3>
                        <span className="metric-sub">Margen financiero</span>
                    </div>
                </div>

                <div className="card kpi-metric-card glass">
                    <div className="metric-icon-box savings-box">
                        <Percent size={22} />
                    </div>
                    <div className="metric-info">
                        <span className="metric-title">Rendimiento</span>
                        <h3 className="metric-number text-accent">{stats.savingsRate}%</h3>
                        <span className="metric-sub">{stats.totalTransactions} movimientos</span>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="stats-charts-grid">
                {/* Expense by Responsible */}
                <div className="card chart-panel glass">
                    <div className="panel-header">
                        <h3>Distribución de Gastos por Responsable</h3>
                        <span className="panel-tag">Porcentaje</span>
                    </div>
                    <div className="chart-container">
                        {stats.pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={stats.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={95}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {stats.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val) => [formatCurrency(val), 'Gasto']}
                                        contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }}
                                    />
                                    <Legend verticalAlign="bottom" height={40} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-chart-data">No se registraron gastos en este período</div>
                        )}
                    </div>
                </div>

                {/* Monthly Evolution */}
                <div className="card chart-panel glass">
                    <div className="panel-header">
                        <h3>Evolución Mensual (Ingresos vs Gastos)</h3>
                        <span className="panel-tag">Comparativa</span>
                    </div>
                    <div className="chart-container">
                        {stats.barData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={stats.barData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                                    <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                                    <Tooltip
                                        formatter={(val) => [formatCurrency(val), '']}
                                        contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }}
                                    />
                                    <Legend verticalAlign="bottom" height={40} />
                                    <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-chart-data">No hay datos mensuales registrados</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
