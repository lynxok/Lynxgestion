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
    FileText,
    Truck,
    Building,
    DollarSign,
    FolderKanban,
    Tags,
    Layers,
    AlertCircle,
    Repeat,
    HelpCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './MovementForm.css';

export default function MovementForm() {
    const { user, currentCompany } = useAuth();
    const { toast } = useToast();
    const [type, setType] = useState('expense'); // 'expense' or 'income'
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [movements, setMovements] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Parametric lists from Supabase
    const [cashBoxes, setCashBoxes] = useState([]);
    const [projects, setProjects] = useState([]);
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [responsibles, setResponsibles] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [formData, setFormData] = useState({
        cash_box_id: '',
        project_id: '',
        income_category_id: '',
        cost_center_id: '',
        responsable_id: '',
        responsable_name: '',
        supplier_id: '',
        supplier_name: '',
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        empresa: '',
        // Moneda y Tipo de Cambio
        currency: 'ARS', // 'ARS', 'USD', 'EUR'
        exchange_rate: 1,
        // Recurrencia
        is_recurring: false,
        recurring_interval: 'monthly', // 'weekly', 'biweekly', 'monthly', 'bimonthly', 'yearly'
        recurring_count: 3,
    });

    useEffect(() => {
        fetchInitialData();
    }, [currentCompany]);

    const fetchInitialData = async () => {
        try {
            setFetching(true);
            const companyId = (currentCompany && currentCompany.id !== 'all') ? currentCompany.id : null;

            let movQuery = supabase
                .from('movements')
                .select(`
                    *,
                    cash_boxes(name, type),
                    projects(name),
                    income_categories(name),
                    cost_centers(name, code),
                    suppliers(name),
                    expense_responsibles(name)
                `)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50);

            let projQuery = supabase.from('projects').select('*').order('name', { ascending: true });

            if (companyId) {
                movQuery = movQuery.or(`company_id.eq.${companyId},company_id.is.null`);
                projQuery = projQuery.or(`company_id.eq.${companyId},company_id.is.null`);
            }

            const [movRes, boxRes, projRes, catRes, ccRes, respRes, suppRes] = await Promise.all([
                movQuery,
                supabase.from('cash_boxes').select('*').order('created_at', { ascending: true }),
                projQuery,
                supabase.from('income_categories').select('*').order('name', { ascending: true }),
                supabase.from('cost_centers').select('*').order('name', { ascending: true }),
                supabase.from('expense_responsibles').select('*').order('name', { ascending: true }),
                supabase.from('suppliers').select('*').order('name', { ascending: true }),
            ]);

            if (movRes.data) setMovements(movRes.data);
            if (boxRes.data) {
                setCashBoxes(boxRes.data);
                if (boxRes.data.length > 0 && !formData.cash_box_id) {
                    setFormData(prev => ({ ...prev, cash_box_id: boxRes.data[0].id }));
                }
            }
            if (projRes.data) setProjects(projRes.data);
            if (catRes.data) {
                setIncomeCategories(catRes.data);
                if (catRes.data.length > 0 && !formData.income_category_id) {
                    setFormData(prev => ({ ...prev, income_category_id: catRes.data[0].id }));
                }
            }
            if (ccRes.data) {
                setCostCenters(ccRes.data);
                if (ccRes.data.length > 0 && !formData.cost_center_id) {
                    setFormData(prev => ({ ...prev, cost_center_id: ccRes.data[0].id }));
                }
            }
            if (respRes.data) {
                setResponsibles(respRes.data);
                if (respRes.data.length > 0 && !formData.responsable_id) {
                    setFormData(prev => ({ 
                        ...prev, 
                        responsable_id: respRes.data[0].id,
                        responsable_name: respRes.data[0].name 
                    }));
                }
            }
            if (suppRes.data) {
                setSuppliers(suppRes.data);
                if (suppRes.data.length > 0 && !formData.supplier_id) {
                    setFormData(prev => ({ 
                        ...prev, 
                        supplier_id: suppRes.data[0].id,
                        supplier_name: suppRes.data[0].name 
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error('Error al cargar datos del sistema');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'responsable_id') {
            const found = responsibles.find(r => r.id === value);
            setFormData(prev => ({ 
                ...prev, 
                responsable_id: value, 
                responsable_name: found ? found.name : '' 
            }));
        } else if (name === 'supplier_id') {
            const found = suppliers.find(s => s.id === value);
            setFormData(prev => ({ 
                ...prev, 
                supplier_id: value, 
                supplier_name: found ? found.name : '' 
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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

        const isForeignCurrency = formData.currency && formData.currency !== 'ARS';
        const parsedExchangeRate = parseFloat(formData.exchange_rate);
        if (isForeignCurrency && (!parsedExchangeRate || parsedExchangeRate <= 0)) {
            toast.error(`Debes ingresar un tipo de cambio válido mayor a 0 para ${formData.currency}`);
            return;
        }

        if (type === 'income') {
            if (!formData.project_id) {
                toast.error('Debes seleccionar un proyecto creado para registrar el ingreso');
                return;
            }
            if (!formData.income_category_id) {
                toast.error('Debes seleccionar una categoría de ingreso');
                return;
            }
        } else {
            if (!formData.cost_center_id) {
                toast.error('Debes seleccionar un centro de costos para el gasto');
                return;
            }
        }

        setLoading(true);

        try {
            const selectedBox = cashBoxes.find(b => b.id === formData.cash_box_id);
            const companyId = (currentCompany && currentCompany.id !== 'all') ? currentCompany.id : null;

            const calculateNextDate = (baseDateStr, interval, index) => {
                const [y, m, d] = baseDateStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                if (interval === 'weekly') {
                    dateObj.setDate(dateObj.getDate() + (7 * index));
                } else if (interval === 'biweekly') {
                    dateObj.setDate(dateObj.getDate() + (14 * index));
                } else if (interval === 'monthly') {
                    dateObj.setMonth(dateObj.getMonth() + index);
                } else if (interval === 'bimonthly') {
                    dateObj.setMonth(dateObj.getMonth() + (2 * index));
                } else if (interval === 'yearly') {
                    dateObj.setFullYear(dateObj.getFullYear() + index);
                }
                return dateObj.toISOString().split('T')[0];
            };

            const recurrenceGroupId = (type === 'expense' && formData.is_recurring) 
                ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'rec_' + Date.now()) 
                : null;

            const repeatCount = (type === 'expense' && formData.is_recurring) 
                ? Math.max(1, Math.min(24, parseInt(formData.recurring_count) || 1)) 
                : 1;

            const baseAmountCurrency = parseFloat(formData.monto);
            const effectiveExchangeRate = isForeignCurrency ? parsedExchangeRate : 1;
            const amountInArs = Math.round((baseAmountCurrency * effectiveExchangeRate) * 100) / 100;

            const movementsToInsert = [];

            for (let i = 0; i < repeatCount; i++) {
                const movDate = i === 0 ? formData.fecha : calculateNextDate(formData.fecha, formData.recurring_interval, i);
                const descSuffix = repeatCount > 1 ? ` (${i + 1}/${repeatCount})` : '';

                movementsToInsert.push({
                    user_id: user.id,
                    type,
                    amount: amountInArs,
                    currency: formData.currency || 'ARS',
                    amount_currency: baseAmountCurrency,
                    exchange_rate: effectiveExchangeRate,
                    date: movDate,
                    description: (type === 'expense' 
                        ? (formData.descripcion + descSuffix) 
                        : (formData.descripcion || 'Cobro / Ingreso de Proyecto')),
                    company: type === 'expense' 
                        ? (formData.responsable_name || 'Responsable') 
                        : (formData.empresa || 'Cliente'),
                    account: selectedBox ? selectedBox.name : (type === 'income' ? 'Mercado pago' : 'Caja'),
                    cash_box_id: formData.cash_box_id || null,
                    company_id: companyId,
                    // Imputación a Proyecto (Permite proyectos específicos O común a la consultora)
                    project_id: formData.project_id || null,
                    income_category_id: type === 'income' ? formData.income_category_id : null,
                    // Egreso specific
                    cost_center_id: type === 'expense' ? formData.cost_center_id : null,
                    supplier_id: type === 'expense' && formData.supplier_id ? formData.supplier_id : null,
                    expense_responsible_id: type === 'expense' && formData.responsable_id ? formData.responsable_id : null,
                    is_recurring: type === 'expense' && formData.is_recurring,
                    recurring_interval: (type === 'expense' && formData.is_recurring) ? formData.recurring_interval : null,
                    recurring_count: (type === 'expense' && formData.is_recurring) ? repeatCount : 1,
                    recurrence_group_id: recurrenceGroupId
                });
            }

            const { data, error } = await supabase
                .from('movements')
                .insert(movementsToInsert)
                .select(`
                    *,
                    cash_boxes(name, type),
                    projects(name),
                    income_categories(name),
                    cost_centers(name, code),
                    suppliers(name),
                    expense_responsibles(name)
                `);

            if (error) throw error;

            if (repeatCount > 1) {
                toast.success(`Se generaron ${repeatCount} cuotas/repeticiones del gasto correctamente`);
            } else {
                toast.success(type === 'expense' ? 'Gasto registrado correctamente' : 'Ingreso registrado correctamente');
            }

            if (data && data.length > 0) {
                setMovements(prev => [...data, ...prev]);
            } else {
                fetchInitialData();
            }

            // Reset form fields
            setFormData(prev => ({
                ...prev,
                descripcion: '',
                monto: '',
                empresa: '',
                currency: 'ARS',
                exchange_rate: 1,
                fecha: new Date().toISOString().split('T')[0],
                is_recurring: false,
                recurring_count: 3
            }));
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
            const { error } = await supabase.from('movements').delete().eq('id', id);
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
        const q = searchTerm.toLowerCase();
        const matchesSearch = 
            (m.description || '').toLowerCase().includes(q) ||
            (m.company || '').toLowerCase().includes(q) ||
            (m.account || '').toLowerCase().includes(q) ||
            (m.projects?.name || '').toLowerCase().includes(q) ||
            (m.income_categories?.name || '').toLowerCase().includes(q) ||
            (m.cost_centers?.name || '').toLowerCase().includes(q) ||
            (m.suppliers?.name || '').toLowerCase().includes(q) ||
            (m.expense_responsibles?.name || '').toLowerCase().includes(q) ||
            (m.cash_boxes?.name || '').toLowerCase().includes(q);
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
                        <p className="section-subtitle">Ingresa la transacción vinculando proyecto o centro de costos</p>
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
                        {/* Caja / Cuenta de Impacto */}
                        <div className="form-field">
                            <label><Wallet size={15} /> {type === 'expense' ? 'Caja / Cuenta de Salida' : 'Caja / Cuenta de Destino'}</label>
                            <select 
                                name="cash_box_id" 
                                value={formData.cash_box_id} 
                                onChange={handleChange}
                                required
                            >
                                {cashBoxes.map((box) => (
                                    <option key={box.id} value={box.id}>
                                        {box.name} ({box.type === 'cash' ? 'Efectivo' : box.type === 'bank' ? 'Banco' : 'Digital'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* --- CAMPOS PARA INGRESO --- */}
                        {type === 'income' ? (
                            <>
                                {/* Proyecto Imputado Obligatorio */}
                                <div className="form-field">
                                    <label><FolderKanban size={15} /> Proyecto Imputado (Obligatorio) *</label>
                                    {projects.length === 0 ? (
                                        <div className="form-warning-alert">
                                            <AlertCircle size={16} />
                                            <span>No hay proyectos registrados en esta empresa. Crea un proyecto en el módulo <strong>Proyectos</strong> antes de registrar ingresos.</span>
                                        </div>
                                    ) : (
                                        <select 
                                            name="project_id" 
                                            value={formData.project_id} 
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">-- Selecciona un Proyecto Creado --</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>📁 {p.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Categoría de Ingreso */}
                                <div className="form-field">
                                    <label><Tags size={15} /> Categoría de Ingreso *</label>
                                    <select 
                                        name="income_category_id" 
                                        value={formData.income_category_id} 
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">-- Selecciona Categoría --</option>
                                        {incomeCategories.map((c) => (
                                            <option key={c.id} value={c.id}>🏷️ {c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label><Building2 size={15} /> Cliente o Empresa Pagadora *</label>
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
                                    <label><FileText size={15} /> Concepto / Detalle del Cobro</label>
                                    <input
                                        type="text"
                                        name="descripcion"
                                        value={formData.descripcion}
                                        onChange={handleChange}
                                        placeholder="Ej. Anticipo 50%, Hito de entrega, Pago mensual"
                                    />
                                </div>
                            </>
                        ) : (
                            /* --- CAMPOS PARA EGRESO --- */
                            <>
                                {/* Centro de Costos */}
                                <div className="form-field">
                                    <label><Layers size={15} /> Centro de Costos</label>
                                    <select 
                                        name="cost_center_id" 
                                        value={formData.cost_center_id} 
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Selecciona Centro de Costos...</option>
                                        {costCenters.map((cc) => (
                                            <option key={cc.id} value={cc.id}>
                                                📊 {cc.name} {cc.code ? `(${cc.code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Responsable del Gasto */}
                                <div className="form-field">
                                    <label><User size={15} /> Responsable del Gasto</label>
                                    <select 
                                        name="responsable_id" 
                                        value={formData.responsable_id} 
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Selecciona responsable...</option>
                                        {responsibles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                👤 {r.name} ({r.department || 'General'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Proveedor */}
                                <div className="form-field">
                                    <label><Truck size={15} /> Proveedor Asignado</label>
                                    <select 
                                        name="supplier_id" 
                                        value={formData.supplier_id} 
                                        onChange={handleChange}
                                    >
                                        <option value="">Selecciona proveedor (Opcional)...</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                🚚 {s.name} {s.cuit ? `(${s.cuit})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Proyecto imputado en gasto: Específico o Común */}
                                <div className="form-field">
                                    <div className="field-label-row">
                                        <label><FolderKanban size={15} /> Imputación del Gasto</label>
                                        <span className="field-hint">Directo o Común</span>
                                    </div>
                                    <select 
                                        name="project_id" 
                                        value={formData.project_id} 
                                        onChange={handleChange}
                                    >
                                        <option value="">🌐 Gasto Común de Consultora (Todos los proyectos)</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>📁 Proyecto Directo: {p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label><FileText size={15} /> Descripción / Detalle del Gasto</label>
                                    <input
                                        type="text"
                                        name="descripcion"
                                        value={formData.descripcion}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ej. Servidores Cloud, Licencias Figma, Viáticos"
                                    />
                                </div>

                                {/* Opciones de Gasto Recurrente / Repetir */}
                                <div className="recurring-expense-box glass">
                                    <label className="recurring-toggle-label">
                                        <input
                                            type="checkbox"
                                            name="is_recurring"
                                            checked={formData.is_recurring}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                                        />
                                        <div className="recurring-title-wrap">
                                            <Repeat size={16} className="recurring-icon" />
                                            <span>Repetir este gasto periódicamente</span>
                                        </div>
                                    </label>

                                    {formData.is_recurring && (
                                        <div className="recurring-options-grid fade-in">
                                            <div className="form-field">
                                                <label>Periodicidad</label>
                                                <select
                                                    name="recurring_interval"
                                                    value={formData.recurring_interval}
                                                    onChange={handleChange}
                                                >
                                                    <option value="weekly">Semanal (Cada 7 días)</option>
                                                    <option value="biweekly">Quincenal (Cada 14 días)</option>
                                                    <option value="monthly">Mensual (Mismo día cada mes)</option>
                                                    <option value="bimonthly">Bimestral (Cada 2 meses)</option>
                                                    <option value="yearly">Anual (Cada 12 meses)</option>
                                                </select>
                                            </div>

                                            <div className="form-field">
                                                <label>Cuotas / Veces a Repetir</label>
                                                <input
                                                    type="number"
                                                    name="recurring_count"
                                                    value={formData.recurring_count}
                                                    onChange={handleChange}
                                                    min="2"
                                                    max="24"
                                                    placeholder="Ej. 6"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Moneda y Tipo de Cambio */}
                        <div className="currency-selection-row">
                            <div className="form-field currency-field">
                                <label><DollarSign size={15} /> Moneda</label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    className="currency-select"
                                >
                                    <option value="ARS">ARS ($ - Pesos Argentinos)</option>
                                    <option value="USD">USD (u$s - Dólares Estadounidenses)</option>
                                    <option value="EUR">EUR (€ - Euros)</option>
                                </select>
                            </div>

                            {formData.currency !== 'ARS' && (
                                <div className="form-field exchange-rate-field fade-in">
                                    <label><TrendingUp size={15} /> Tipo de Cambio ($ / ARS) *</label>
                                    <input
                                        type="number"
                                        name="exchange_rate"
                                        value={formData.exchange_rate}
                                        onChange={handleChange}
                                        placeholder="Ej. 1350"
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            )}
                        </div>

                        {formData.currency !== 'ARS' && formData.monto && formData.exchange_rate && (
                            <div className="currency-conversion-preview fade-in">
                                <span>Conversión estimada a ARS:</span>
                                <strong>
                                    {formatCurrency((parseFloat(formData.monto) || 0) * (parseFloat(formData.exchange_rate) || 0))}
                                </strong>
                                <small>({formData.currency} {parseFloat(formData.monto) || 0} × ${formData.exchange_rate})</small>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-field">
                                <label>
                                    <DollarSign size={15} /> 
                                    Monto {formData.currency === 'USD' ? '(USD u$s)' : formData.currency === 'EUR' ? '(EUR €)' : '($ ARS)'} *
                                </label>
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
                                <label><Calendar size={15} /> Fecha *</label>
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
                            <p className="section-subtitle">Transacciones imputadas a proyectos y centros de costos</p>
                        </div>
                    </div>

                    <div className="ledger-toolbar">
                        <div className="search-box">
                            <Search size={16} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Buscar por proyecto, centro de costos, proveedor..."
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
                                const boxName = item.cash_boxes?.name || item.account || 'Caja';
                                const projName = item.projects?.name;
                                const catName = item.income_categories?.name;
                                const ccName = item.cost_centers?.name;
                                const suppName = item.suppliers?.name;
                                const respName = item.expense_responsibles?.name || item.company;

                                return (
                                    <div key={item.id} className="ledger-item glass">
                                        <div className="ledger-item-left">
                                            <div className={`type-badge-circle ${isIncome ? 'income' : 'expense'}`}>
                                                {isIncome ? <PlusCircle size={18} /> : <MinusCircle size={18} />}
                                            </div>
                                            <div className="ledger-item-info">
                                                <div className="ledger-top-line">
                                                    <span className="ledger-primary-text">
                                                        {isIncome ? (item.company || 'Cliente') : respName}
                                                    </span>
                                                    <span className="ledger-box-badge">
                                                        {boxName}
                                                    </span>
                                                </div>

                                                <div className="ledger-details-line">
                                                    {isIncome ? (
                                                        <>
                                                            {projName && <span className="ledger-proj-tag">📁 {projName}</span>}
                                                            {catName && <span className="ledger-cat-tag">🏷️ {catName}</span>}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {projName ? (
                                                                <span className="ledger-proj-tag direct-exp">📁 {projName}</span>
                                                            ) : (
                                                                <span className="ledger-proj-tag common-exp">🌐 Gasto Común</span>
                                                            )}
                                                            {ccName && <span className="ledger-cc-tag">📊 {ccName}</span>}
                                                            {suppName && <span className="ledger-supp-tag">🚚 {suppName}</span>}
                                                            {item.is_recurring && <span className="ledger-recur-tag">🔄 Recurrente</span>}
                                                        </>
                                                    )}
                                                    <span className="ledger-secondary-text">
                                                        {item.description || (isIncome ? 'Ingreso registrado' : 'Gasto')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ledger-item-right">
                                            <div className="amount-date-group">
                                                <span className={`ledger-amount ${isIncome ? 'text-success' : 'text-danger'}`}>
                                                    {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                                                </span>
                                                {item.currency && item.currency !== 'ARS' && (
                                                    <span className="ledger-foreign-currency-badge">
                                                        {item.currency === 'USD' ? 'u$s' : item.currency} {Number(item.amount_currency || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (TC: ${item.exchange_rate})
                                                    </span>
                                                )}
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
