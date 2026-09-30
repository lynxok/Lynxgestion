import { useState, useEffect, useMemo } from 'react';
import { 
    Wallet, 
    Building2, 
    CreditCard, 
    Smartphone, 
    Plus, 
    Trash2, 
    Edit3, 
    ArrowRightLeft, 
    Users, 
    Truck, 
    Search, 
    CheckCircle2, 
    X, 
    DollarSign, 
    TrendingUp, 
    TrendingDown, 
    Calendar, 
    Save, 
    RefreshCw,
    Shield,
    FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Settings.css';

export default function Settings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [subTab, setSubTab] = useState('cajas'); // 'cajas' | 'responsables' | 'proveedores'
    const [loading, setLoading] = useState(true);

    // Data states
    const [cashBoxes, setCashBoxes] = useState([]);
    const [responsibles, setResponsibles] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [movements, setMovements] = useState([]);

    // Filter by Month for Box Balances
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

    // Modals
    const [showBoxModal, setShowBoxModal] = useState(false);
    const [editingBox, setEditingBox] = useState(null);
    const [boxForm, setBoxForm] = useState({ name: '', type: 'cash', initial_balance: '0' });

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferForm, setTransferForm] = useState({
        from_box_id: '',
        to_box_id: '',
        amount: '',
        concept: 'Transferencia interna de fondos',
        date: new Date().toISOString().split('T')[0]
    });

    const [showRespModal, setShowRespModal] = useState(false);
    const [editingResp, setEditingResp] = useState(null);
    const [respForm, setRespForm] = useState({ name: '', department: '' });

    const [showSuppModal, setShowSuppModal] = useState(false);
    const [editingSupp, setEditingSupp] = useState(null);
    const [suppForm, setSuppForm] = useState({ name: '', cuit: '', category: '', phone: '', email: '' });

    // Search filters
    const [suppSearch, setSuppSearch] = useState('');
    const [respSearch, setRespSearch] = useState('');

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [boxesRes, respRes, suppRes, movRes] = await Promise.all([
                supabase.from('cash_boxes').select('*').order('created_at', { ascending: true }),
                supabase.from('expense_responsibles').select('*').order('name', { ascending: true }),
                supabase.from('suppliers').select('*').order('name', { ascending: true }),
                supabase.from('movements').select('*')
            ]);

            if (boxesRes.data) setCashBoxes(boxesRes.data);
            if (respRes.data) setResponsibles(respRes.data);
            if (suppRes.data) setSuppliers(suppRes.data);
            if (movRes.data) setMovements(movRes.data);
        } catch (err) {
            console.error('Error fetching settings data:', err);
            toast.error('Error al cargar datos de configuración');
        } finally {
            setLoading(false);
        }
    };

    // Calculate Box Metrics (Monthly & Accumulated)
    const boxMetrics = useMemo(() => {
        const metricsMap = {};

        cashBoxes.forEach(box => {
            const initial = parseFloat(box.initial_balance) || 0;
            let totalIncomes = 0;
            let totalExpenses = 0;
            let monthIncomes = 0;
            let monthExpenses = 0;

            movements.forEach(m => {
                // Check if movement belongs to this box (by ID or legacy text match)
                const isThisBox = m.cash_box_id === box.id || 
                    (!m.cash_box_id && m.account && (
                        (box.type === 'digital' && m.account.toLowerCase().includes('mercado')) ||
                        (box.type === 'bank' && m.account.toLowerCase().includes('banco')) ||
                        (box.type === 'cash' && m.account.toLowerCase().includes('efectivo'))
                    ));

                if (isThisBox) {
                    const amt = parseFloat(m.amount) || 0;
                    const isMonth = m.date && m.date.startsWith(selectedMonth);

                    if (m.type === 'income') {
                        totalIncomes += amt;
                        if (isMonth) monthIncomes += amt;
                    } else if (m.type === 'expense') {
                        totalExpenses += amt;
                        if (isMonth) monthExpenses += amt;
                    }
                }
            });

            metricsMap[box.id] = {
                initial,
                monthIncomes,
                monthExpenses,
                monthBalance: monthIncomes - monthExpenses,
                accumulatedBalance: initial + totalIncomes - totalExpenses
            };
        });

        return metricsMap;
    }, [cashBoxes, movements, selectedMonth]);

    // Box icon & type helper
    const getBoxIcon = (type) => {
        switch (type) {
            case 'bank': return <Building2 size={20} className="box-icon-svg bank" />;
            case 'digital': return <Smartphone size={20} className="box-icon-svg digital" />;
            case 'posnet': return <CreditCard size={20} className="box-icon-svg posnet" />;
            default: return <Wallet size={20} className="box-icon-svg cash" />;
        }
    };

    const getBoxTypeName = (type) => {
        switch (type) {
            case 'bank': return 'Cuenta Bancaria';
            case 'digital': return 'Billetera Digital';
            case 'posnet': return 'Posnet / Tarjetas';
            default: return 'Caja Efectivo';
        }
    };

    // --- BOX ACTIONS ---
    const handleSaveBox = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: boxForm.name.trim(),
                type: boxForm.type,
                initial_balance: parseFloat(boxForm.initial_balance) || 0
            };

            if (editingBox) {
                const { error } = await supabase
                    .from('cash_boxes')
                    .update(payload)
                    .eq('id', editingBox.id);
                if (error) throw error;
                toast.success('Caja actualizada exitosamente');
            } else {
                const { error } = await supabase
                    .from('cash_boxes')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Caja creada exitosamente');
            }

            setShowBoxModal(false);
            setEditingBox(null);
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar la caja');
        }
    };

    const handleDeleteBox = async (boxId, name) => {
        if (!window.confirm(`¿Estás seguro de eliminar la caja "${name}"?`)) return;
        try {
            const { error } = await supabase.from('cash_boxes').delete().eq('id', boxId);
            if (error) throw error;
            toast.success('Caja eliminada');
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('No se puede eliminar la caja porque contiene movimientos.');
        }
    };

    // --- TRANSFER ACTION ---
    const handleTransfer = async (e) => {
        e.preventDefault();
        if (transferForm.from_box_id === transferForm.to_box_id) {
            toast.error('La caja de origen y destino deben ser distintas');
            return;
        }

        const amt = parseFloat(transferForm.amount);
        if (!amt || amt <= 0) {
            toast.error('Ingresa un monto válido para transferir');
            return;
        }

        try {
            const fromBox = cashBoxes.find(b => b.id === transferForm.from_box_id);
            const toBox = cashBoxes.find(b => b.id === transferForm.to_box_id);

            // Record expense on source box
            const egreso = {
                user_id: user?.id,
                type: 'expense',
                amount: amt,
                date: transferForm.date,
                description: `[Transferencia Saliente] -> ${toBox?.name || 'Caja destino'}: ${transferForm.concept}`,
                company: 'Transferencia Interna',
                cash_box_id: transferForm.from_box_id
            };

            // Record income on destination box
            const ingreso = {
                user_id: user?.id,
                type: 'income',
                amount: amt,
                date: transferForm.date,
                description: `[Transferencia Entrante] <- ${fromBox?.name || 'Caja origen'}: ${transferForm.concept}`,
                company: 'Transferencia Interna',
                cash_box_id: transferForm.to_box_id
            };

            const { error } = await supabase.from('movements').insert([egreso, ingreso]);
            if (error) throw error;

            toast.success(`Transferencia de $${amt.toLocaleString('es-AR')} realizada con éxito`);
            setShowTransferModal(false);
            setTransferForm({
                from_box_id: '',
                to_box_id: '',
                amount: '',
                concept: 'Transferencia interna de fondos',
                date: new Date().toISOString().split('T')[0]
            });
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al realizar la transferencia');
        }
    };

    // --- RESPONSIBLES ACTIONS ---
    const handleSaveResp = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: respForm.name.trim(),
                department: respForm.department.trim()
            };

            if (editingResp) {
                const { error } = await supabase
                    .from('expense_responsibles')
                    .update(payload)
                    .eq('id', editingResp.id);
                if (error) throw error;
                toast.success('Responsable actualizado');
            } else {
                const { error } = await supabase
                    .from('expense_responsibles')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Responsable agregado');
            }

            setShowRespModal(false);
            setEditingResp(null);
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar responsable');
        }
    };

    const handleDeleteResp = async (id, name) => {
        if (!window.confirm(`¿Eliminar al responsable "${name}"?`)) return;
        try {
            const { error } = await supabase.from('expense_responsibles').delete().eq('id', id);
            if (error) throw error;
            toast.success('Responsable eliminado');
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar responsable');
        }
    };

    // --- SUPPLIERS ACTIONS ---
    const handleSaveSupp = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: suppForm.name.trim(),
                cuit: suppForm.cuit.trim(),
                category: suppForm.category.trim(),
                phone: suppForm.phone.trim(),
                email: suppForm.email.trim()
            };

            if (editingSupp) {
                const { error } = await supabase
                    .from('suppliers')
                    .update(payload)
                    .eq('id', editingSupp.id);
                if (error) throw error;
                toast.success('Proveedor actualizado');
            } else {
                const { error } = await supabase
                    .from('suppliers')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Proveedor agregado');
            }

            setShowSuppModal(false);
            setEditingSupp(null);
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar proveedor');
        }
    };

    const handleDeleteSupp = async (id, name) => {
        if (!window.confirm(`¿Eliminar al proveedor "${name}"?`)) return;
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            toast.success('Proveedor eliminado');
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar proveedor');
        }
    };

    // Filtered lists
    const filteredSuppliers = useMemo(() => {
        if (!suppSearch) return suppliers;
        const q = suppSearch.toLowerCase();
        return suppliers.filter(s => 
            s.name.toLowerCase().includes(q) || 
            (s.cuit && s.cuit.includes(q)) ||
            (s.category && s.category.toLowerCase().includes(q))
        );
    }, [suppliers, suppSearch]);

    const filteredResponsibles = useMemo(() => {
        if (!respSearch) return responsibles;
        const q = respSearch.toLowerCase();
        return responsibles.filter(r => 
            r.name.toLowerCase().includes(q) || 
            (r.department && r.department.toLowerCase().includes(q))
        );
    }, [responsibles, respSearch]);

    return (
        <div className="settings-container fade-in">
            {/* Navigation Tabs */}
            <div className="settings-header-tabs glass">
                <button 
                    className={`settings-tab-btn ${subTab === 'cajas' ? 'active' : ''}`}
                    onClick={() => setSubTab('cajas')}
                >
                    <Wallet size={18} />
                    <span>Cajas & Cuentas</span>
                </button>
                <button 
                    className={`settings-tab-btn ${subTab === 'responsables' ? 'active' : ''}`}
                    onClick={() => setSubTab('responsables')}
                >
                    <Users size={18} />
                    <span>Responsables de Gasto</span>
                </button>
                <button 
                    className={`settings-tab-btn ${subTab === 'proveedores' ? 'active' : ''}`}
                    onClick={() => setSubTab('proveedores')}
                >
                    <Truck size={18} />
                    <span>Catálogo de Proveedores</span>
                </button>
            </div>

            {/* TAB 1: CAJAS & FINANZAS */}
            {subTab === 'cajas' && (
                <div className="settings-section">
                    <div className="section-toolbar glass">
                        <div className="toolbar-left">
                            <div className="month-filter-group">
                                <label className="filter-label">
                                    <Calendar size={16} />
                                    <span>Mes de Balance:</span>
                                </label>
                                <input 
                                    type="month" 
                                    className="month-input" 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="toolbar-actions">
                            <button 
                                className="action-btn transfer-btn"
                                onClick={() => setShowTransferModal(true)}
                                disabled={cashBoxes.length < 2}
                            >
                                <ArrowRightLeft size={16} />
                                <span>Transferir Fondos</span>
                            </button>
                            <button 
                                className="action-btn add-btn"
                                onClick={() => {
                                    setEditingBox(null);
                                    setBoxForm({ name: '', type: 'cash', initial_balance: '0' });
                                    setShowBoxModal(true);
                                }}
                            >
                                <Plus size={16} />
                                <span>Nueva Caja / Cuenta</span>
                            </button>
                        </div>
                    </div>

                    {/* Boxes Grid */}
                    <div className="boxes-grid">
                        {cashBoxes.map((box) => {
                            const m = boxMetrics[box.id] || { initial: 0, monthIncomes: 0, monthExpenses: 0, monthBalance: 0, accumulatedBalance: 0 };
                            return (
                                <div key={box.id} className="box-card glass slide-up">
                                    <div className="box-card-top">
                                        <div className="box-info">
                                            <div className="box-icon-container">
                                                {getBoxIcon(box.type)}
                                            </div>
                                            <div>
                                                <h3 className="box-name">{box.name}</h3>
                                                <span className="box-type-badge">{getBoxTypeName(box.type)}</span>
                                            </div>
                                        </div>
                                        <div className="box-card-actions">
                                            <button 
                                                className="icon-action-btn edit" 
                                                title="Editar Caja"
                                                onClick={() => {
                                                    setEditingBox(box);
                                                    setBoxForm({
                                                        name: box.name,
                                                        type: box.type,
                                                        initial_balance: box.initial_balance.toString()
                                                    });
                                                    setShowBoxModal(true);
                                                }}
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button 
                                                className="icon-action-btn delete" 
                                                title="Eliminar Caja"
                                                onClick={() => handleDeleteBox(box.id, box.name)}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="box-divider"></div>

                                    {/* Financial Breakdown */}
                                    <div className="box-metrics-grid">
                                        <div className="box-metric-item">
                                            <span className="metric-title">Saldo Inicial</span>
                                            <span className="metric-val neutral">${m.initial.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="box-metric-item">
                                            <span className="metric-title">Ingresos Mes</span>
                                            <span className="metric-val positive">+${m.monthIncomes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="box-metric-item">
                                            <span className="metric-title">Egresos Mes</span>
                                            <span className="metric-val negative">-${m.monthExpenses.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="box-metric-item">
                                            <span className="metric-title">Flujo Mensual</span>
                                            <span className={`metric-val ${m.monthBalance >= 0 ? 'positive' : 'negative'}`}>
                                                ${m.monthBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="box-total-accumulated">
                                        <div className="accum-label">
                                            <DollarSign size={16} />
                                            <span>Saldo Total Acumulado</span>
                                        </div>
                                        <div className={`accum-value ${m.accumulatedBalance >= 0 ? 'gold' : 'negative'}`}>
                                            ${m.accumulatedBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 2: RESPONSABLES DE GASTO */}
            {subTab === 'responsables' && (
                <div className="settings-section">
                    <div className="section-toolbar glass">
                        <div className="search-wrap">
                            <Search size={16} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Buscar responsable o área..." 
                                className="styled-search-input"
                                value={respSearch}
                                onChange={(e) => setRespSearch(e.target.value)}
                            />
                        </div>
                        <button 
                            className="action-btn add-btn"
                            onClick={() => {
                                setEditingResp(null);
                                setRespForm({ name: '', department: '' });
                                setShowRespModal(true);
                            }}
                        >
                            <Plus size={16} />
                            <span>Nuevo Responsable</span>
                        </button>
                    </div>

                    <div className="table-responsive glass slide-up">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Nombre del Responsable</th>
                                    <th>Área / Departamento</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResponsibles.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="empty-table-cell">
                                            No se encontraron responsables registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResponsibles.map((r) => (
                                        <tr key={r.id}>
                                            <td className="font-semibold text-white">{r.name}</td>
                                            <td>
                                                <span className="badge-dept">{r.department || 'General'}</span>
                                            </td>
                                            <td>
                                                <span className="badge-active">Activo</span>
                                            </td>
                                            <td className="text-right">
                                                <div className="table-row-actions">
                                                    <button 
                                                        className="row-btn edit"
                                                        onClick={() => {
                                                            setEditingResp(r);
                                                            setRespForm({ name: r.name, department: r.department || '' });
                                                            setShowRespModal(true);
                                                        }}
                                                        title="Editar"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button 
                                                        className="row-btn delete"
                                                        onClick={() => handleDeleteResp(r.id, r.name)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: PROVEEDORES */}
            {subTab === 'proveedores' && (
                <div className="settings-section">
                    <div className="section-toolbar glass">
                        <div className="search-wrap">
                            <Search size={16} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Buscar por razón social, CUIT o rubro..." 
                                className="styled-search-input"
                                value={suppSearch}
                                onChange={(e) => setSuppSearch(e.target.value)}
                            />
                        </div>
                        <button 
                            className="action-btn add-btn"
                            onClick={() => {
                                setEditingSupp(null);
                                setSuppForm({ name: '', cuit: '', category: '', phone: '', email: '' });
                                setShowSuppModal(true);
                            }}
                        >
                            <Plus size={16} />
                            <span>Nuevo Proveedor</span>
                        </button>
                    </div>

                    <div className="table-responsive glass slide-up">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Razón Social / Proveedor</th>
                                    <th>CUIT</th>
                                    <th>Rubro / Categoría</th>
                                    <th>Contacto (Tel / Email)</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="empty-table-cell">
                                            No se encontraron proveedores registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSuppliers.map((s) => (
                                        <tr key={s.id}>
                                            <td className="font-semibold text-white">{s.name}</td>
                                            <td className="font-mono text-muted">{s.cuit || '-'}</td>
                                            <td>
                                                <span className="badge-category">{s.category || 'General'}</span>
                                            </td>
                                            <td className="text-muted text-sm">
                                                {s.phone ? <div>📞 {s.phone}</div> : null}
                                                {s.email ? <div>✉️ {s.email}</div> : null}
                                                {!s.phone && !s.email && '-'}
                                            </td>
                                            <td className="text-right">
                                                <div className="table-row-actions">
                                                    <button 
                                                        className="row-btn edit"
                                                        onClick={() => {
                                                            setEditingSupp(s);
                                                            setSuppForm({
                                                                name: s.name,
                                                                cuit: s.cuit || '',
                                                                category: s.category || '',
                                                                phone: s.phone || '',
                                                                email: s.email || ''
                                                            });
                                                            setShowSuppModal(true);
                                                        }}
                                                        title="Editar"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button 
                                                        className="row-btn delete"
                                                        onClick={() => handleDeleteSupp(s.id, s.name)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODAL: NUEVA / EDITAR CAJA --- */}
            {showBoxModal && (
                <div className="modal-overlay">
                    <div className="modal-card glass slide-up">
                        <div className="modal-header">
                            <h3>{editingBox ? 'Editar Caja / Cuenta' : 'Nueva Caja / Cuenta Financiera'}</h3>
                            <button className="modal-close" onClick={() => setShowBoxModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveBox} className="modal-form">
                            <div className="form-group">
                                <label>Nombre de la Caja / Cuenta</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Ej. Caja Efectivo Local, Banco Santander, Mercado Pago"
                                    value={boxForm.name}
                                    onChange={(e) => setBoxForm({ ...boxForm, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Tipo de Cuenta</label>
                                <select 
                                    value={boxForm.type}
                                    onChange={(e) => setBoxForm({ ...boxForm, type: e.target.value })}
                                >
                                    <option value="cash">Caja Efectivo</option>
                                    <option value="bank">Cuenta Bancaria (CBU / Transferencias)</option>
                                    <option value="digital">Billetera Digital (Mercado Pago / Ualá)</option>
                                    <option value="posnet">Posnet / Tarjetas</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Saldo Inicial ($)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    value={boxForm.initial_balance}
                                    onChange={(e) => setBoxForm({ ...boxForm, initial_balance: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowBoxModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">
                                    <Save size={16} />
                                    <span>Guardar Caja</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: TRANSFERENCIA ENTRE CAJAS --- */}
            {showTransferModal && (
                <div className="modal-overlay">
                    <div className="modal-card glass slide-up">
                        <div className="modal-header">
                            <h3>Transferencia entre Cajas / Cuentas</h3>
                            <button className="modal-close" onClick={() => setShowTransferModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleTransfer} className="modal-form">
                            <div className="form-group">
                                <label>Caja Origen (Sale el dinero)</label>
                                <select 
                                    required
                                    value={transferForm.from_box_id}
                                    onChange={(e) => setTransferForm({ ...transferForm, from_box_id: e.target.value })}
                                >
                                    <option value="">Selecciona caja origen...</option>
                                    {cashBoxes.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({getBoxTypeName(b.type)})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Caja Destino (Ingresa el dinero)</label>
                                <select 
                                    required
                                    value={transferForm.to_box_id}
                                    onChange={(e) => setTransferForm({ ...transferForm, to_box_id: e.target.value })}
                                >
                                    <option value="">Selecciona caja destino...</option>
                                    {cashBoxes.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({getBoxTypeName(b.type)})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>Monto ($)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        required 
                                        placeholder="0.00"
                                        value={transferForm.amount}
                                        onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={transferForm.date}
                                        onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Concepto / Observaciones</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Motivo de la transferencia..."
                                    value={transferForm.concept}
                                    onChange={(e) => setTransferForm({ ...transferForm, concept: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowTransferModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save gold">
                                    <ArrowRightLeft size={16} />
                                    <span>Ejecutar Transferencia</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: RESPONSABLE --- */}
            {showRespModal && (
                <div className="modal-overlay">
                    <div className="modal-card glass slide-up">
                        <div className="modal-header">
                            <h3>{editingResp ? 'Editar Responsable' : 'Nuevo Responsable del Gasto'}</h3>
                            <button className="modal-close" onClick={() => setShowRespModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveResp} className="modal-form">
                            <div className="form-group">
                                <label>Nombre Completo / Persona</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Ej. Juan Pérez, Dirección General"
                                    value={respForm.name}
                                    onChange={(e) => setRespForm({ ...respForm, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Área o Departamento</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. Administración, Operaciones, Ventas"
                                    value={respForm.department}
                                    onChange={(e) => setRespForm({ ...respForm, department: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowRespModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">
                                    <Save size={16} />
                                    <span>Guardar Responsable</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: PROVEEDOR --- */}
            {showSuppModal && (
                <div className="modal-overlay">
                    <div className="modal-card glass slide-up">
                        <div className="modal-header">
                            <h3>{editingSupp ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                            <button className="modal-close" onClick={() => setShowSuppModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveSupp} className="modal-form">
                            <div className="form-group">
                                <label>Razón Social o Nombre Comercial</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Ej. Insumos Médicos S.A."
                                    value={suppForm.name}
                                    onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
                                />
                            </div>

                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>CUIT / Identificación Fiscal</label>
                                    <input 
                                        type="text" 
                                        placeholder="30-00000000-0"
                                        value={suppForm.cuit}
                                        onChange={(e) => setSuppForm({ ...suppForm, cuit: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Rubro / Categoría</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej. Hosting, Cristales, Insumos"
                                        value={suppForm.category}
                                        onChange={(e) => setSuppForm({ ...suppForm, category: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>Teléfono de Contacto</label>
                                    <input 
                                        type="text" 
                                        placeholder="+54 9 11 ..."
                                        value={suppForm.phone}
                                        onChange={(e) => setSuppForm({ ...suppForm, phone: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email de Contacto</label>
                                    <input 
                                        type="email" 
                                        placeholder="contacto@proveedor.com"
                                        value={suppForm.email}
                                        onChange={(e) => setSuppForm({ ...suppForm, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowSuppModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">
                                    <Save size={16} />
                                    <span>Guardar Proveedor</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
