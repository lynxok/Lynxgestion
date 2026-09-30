import { useState, useEffect } from 'react';
import { 
    Save, 
    PlusCircle, 
    MinusCircle, 
    Trash2, 
    Search, 
    Filter, 
    TrendingUp, 
    TrendingDown, 
    Wallet, 
    Receipt, 
    Building2, 
    User, 
    Calendar, 
    CreditCard, 
    FileText 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './MovementForm.css';

export default function MovementForm() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [type, setType] = useState('expense'); // 'expense' or 'income'
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [movements, setMovements] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    const [formData, setFormData] = useState({
        responsable: '',
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        empresa: '',
        cuenta: 'Mercado pago',
    });

    useEffect(() => {
        fetchRecentMovements();
    }, []);

    const fetchRecentMovements = async () => {
        try {
            setFetching(true);
            const { data, error } = await supabase
                .from('movements')
                .select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setMovements(data || []);
        } catch (error) {
            console.error('Error fetching movements:', error);
            toast.error('Error al cargar historial de movimientos');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error('Debes iniciar sesión para guardar movimientos');
            return;
        }

        if (!formData.monto || parseFloat(formData.monto) <= 0) {
            toast.error('Ingresa un monto válido mayor a 0');
            return;
        }

        setLoading(true);

        try {
            const movementData = {
                user_id: user.id,
                type,
                amount: parseFloat(formData.monto),
                date: formData.fecha,
                description: type === 'expense' ? formData.descripcion : null,
                company: type === 'expense' ? formData.responsable : formData.empresa,
                account: type === 'income' ? formData.cuenta : null,
            };

            const { data, error } = await supabase
                .from('movements')
                .insert([movementData])
                .select();

            if (error) throw error;

            toast.success(type === 'expense' ? 'Gasto registrado correctamente' : 'Ingreso registrado correctamente');

            if (data && data[0]) {
                setMovements(prev => [data[0], ...prev]);
            } else {
                fetchRecentMovements();
            }

            // Reset form
            setFormData({
                responsable: '',
                descripcion: '',
                monto: '',
                fecha: new Date().toISOString().split('T')[0],
                empresa: '',
                cuenta: 'Mercado pago',
            });
        } catch (error) {
            console.error('Error saving movement:', error);
            toast.error('Error al guardar: ' + (error.message || 'Error de conexión'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Confirmas la eliminación de este movimiento?')) return;

        try {
            const { error } = await supabase
                .from('movements')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.info('Movimiento eliminado');
            setMovements(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting movement:', error);
            toast.error('No se pudo eliminar el movimiento');
        }
    };

    // Calculate quick KPIs
    const totals = movements.reduce((acc, m) => {
        const val = parseFloat(m.amount || 0);
        if (m.type === 'income') acc.income += val;
        else acc.expense += val;
        return acc;
    }, { income: 0, expense: 0 });

    const balance = totals.income - totals.expense;

    const filteredMovements = movements.filter(m => {
        const matchesType = filterType === 'all' || m.type === filterType;
        const matchesSearch = 
            (m.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.account || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 2
        }).format(amount);
    };

    return (
        <div className="movements-container fade-in">
            {/* Quick KPI Bar */}
            <div className="quick-kpi-grid">
                <div className="quick-kpi-card glass income-kpi">
                    <div className="kpi-icon-pill"><TrendingUp size={18} /></div>
                    <div className="kpi-meta">
                        <span className="kpi-label">Ingresos Registrados</span>
                        <span className="kpi-value text-success">{formatCurrency(totals.income)}</span>
                    </div>
                </div>

                <div className="quick-kpi-card glass expense-kpi">
                    <div className="kpi-icon-pill"><TrendingDown size={18} /></div>
                    <div className="kpi-meta">
                        <span className="kpi-label">Gastos Registrados</span>
                        <span className="kpi-value text-danger">{formatCurrency(totals.expense)}</span>
                    </div>
                </div>

                <div className="quick-kpi-card glass balance-kpi">
                    <div className="kpi-icon-pill"><Wallet size={18} /></div>
                    <div className="kpi-meta">
                        <span className="kpi-label">Balance de Flujo</span>
                        <span className={`kpi-value ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(balance)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="movements-split-layout">
                {/* Form Section */}
                <div className="card movement-form-card glass">
                    <div className="form-card-header">
                        <h2 className="section-title">
                            <Receipt size={20} className="title-icon" />
                            Nuevo Registro
                        </h2>
                        <p className="section-subtitle">Selecciona el tipo de transacción e ingresa los detalles</p>
                    </div>

                    <div className="type-toggle-pill">
                        <button
                            type="button"
                            className={`toggle-option ${type === 'expense' ? 'active-expense' : ''}`}
                            onClick={() => setType('expense')}
                        >
                            <MinusCircle size={16} />
                            <span>Gasto / Egreso</span>
                        </button>
                        <button
                            type="button"
                            className={`toggle-option ${type === 'income' ? 'active-income' : ''}`}
                            onClick={() => setType('income')}
                        >
                            <PlusCircle size={16} />
                            <span>Ingreso / Cobro</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="styled-form">
                        {type === 'expense' ? (
                            <>
                                <div className="form-field">
                                    <label><User size={15} /> Responsable del Gasto</label>
                                    <input
                                        type="text"
                                        name="responsable"
                                        value={formData.responsable}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ej. Juan Pérez / Proveedor"
                                    />
                                </div>

                                <div className="form-field">
                                    <label><FileText size={15} /> Descripción del Gasto</label>
                                    <input
                                        type="text"
                                        name="descripcion"
                                        value={formData.descripcion}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ej. Servidores, Licencias, Viáticos"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-field">
                                    <label><Building2 size={15} /> Empresa / Cliente Pagador</label>
                                    <input
                                        type="text"
                                        name="empresa"
                                        value={formData.empresa}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ej. Cliente S.A. / Empresa"
                                    />
                                </div>

                                <div className="form-field">
                                    <label><CreditCard size={15} /> Cuenta de Destino</label>
                                    <select name="cuenta" value={formData.cuenta} onChange={handleChange}>
                                        <option value="Mercado pago">Mercado Pago</option>
                                        <option value="Personal pay">Personal Pay</option>
                                        <option value="Cuenta personal">Cuenta Bancaria Personal</option>
                                        <option value="Efectivo">Efectivo / Caja Chica</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="form-row">
                            <div className="form-field">
                                <label><Wallet size={15} /> Monto ($)</label>
                                <input
                                    type="number"
                                    name="monto"
                                    value={formData.monto}
                                    onChange={handleChange}
                                    required
                                    placeholder="0.00"
                                    min="0.01"
                                    step="0.01"
                                />
                            </div>

                            <div className="form-field">
                                <label><Calendar size={15} /> Fecha</label>
                                <input
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className={`submit-action-btn ${type === 'expense' ? 'btn-expense' : 'btn-income'}`} 
                            disabled={loading}
                        >
                            <Save size={18} />
                            <span>{loading ? 'Guardando...' : type === 'expense' ? 'Guardar Gasto' : 'Guardar Ingreso'}</span>
                        </button>
                    </form>
                </div>

                {/* Ledger / Recent Movements Section */}
                <div className="card ledger-card glass">
                    <div className="ledger-header">
                        <div>
                            <h2 className="section-title">Historial de Movimientos</h2>
                            <p className="section-subtitle">Últimas transacciones registradas</p>
                        </div>
                    </div>

                    <div className="ledger-toolbar">
                        <div className="search-box">
                            <Search size={16} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Buscar por responsable, detalle..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="filter-pills">
                            <button
                                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterType('all')}
                            >
                                Todos
                            </button>
                            <button
                                className={`filter-btn ${filterType === 'income' ? 'active' : ''}`}
                                onClick={() => setFilterType('income')}
                            >
                                Ingresos
                            </button>
                            <button
                                className={`filter-btn ${filterType === 'expense' ? 'active' : ''}`}
                                onClick={() => setFilterType('expense')}
                            >
                                Gastos
                            </button>
                        </div>
                    </div>

                    <div className="ledger-list">
                        {fetching ? (
                            <div className="empty-state">
                                <span className="loading-spinner"></span>
                                <p>Cargando transacciones...</p>
                            </div>
                        ) : filteredMovements.length === 0 ? (
                            <div className="empty-state">
                                <Receipt size={36} className="empty-icon" />
                                <p>No se encontraron movimientos registrados</p>
                            </div>
                        ) : (
                            filteredMovements.map((item) => {
                                const isIncome = item.type === 'income';
                                return (
                                    <div key={item.id} className="ledger-item glass">
                                        <div className="ledger-item-left">
                                            <div className={`type-badge-circle ${isIncome ? 'income' : 'expense'}`}>
                                                {isIncome ? <PlusCircle size={18} /> : <MinusCircle size={18} />}
                                            </div>
                                            <div className="ledger-item-info">
                                                <span className="ledger-primary-text">
                                                    {item.company || 'Sin Asignar'}
                                                </span>
                                                <span className="ledger-secondary-text">
                                                    {isIncome ? `Destino: ${item.account || '-'}` : item.description || 'Gasto operativo'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="ledger-item-right">
                                            <div className="amount-date-group">
                                                <span className={`ledger-amount ${isIncome ? 'text-success' : 'text-danger'}`}>
                                                    {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                                                </span>
                                                <span className="ledger-date">{item.date}</span>
                                            </div>
                                            <button 
                                                className="btn-icon-danger" 
                                                onClick={() => handleDelete(item.id)}
                                                title="Eliminar movimiento"
                                                aria-label="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
