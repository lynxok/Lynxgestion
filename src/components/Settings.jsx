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
    ShieldCheck,
    Crown,
    Tags,
    Layers,
    UserCheck,
    Check,
    Lock
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Settings.css';

export default function Settings() {
    const { user, companies, currentCompany, loadUserData } = useAuth();
    const { toast } = useToast();
    const [subTab, setSubTab] = useState('cajas'); 
    // 'cajas' | 'responsables' | 'proveedores' | 'categorias' | 'costos' | 'empresas' | 'usuarios'
    const [loading, setLoading] = useState(true);

    // Data states
    const [cashBoxes, setCashBoxes] = useState([]);
    const [responsibles, setResponsibles] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [companiesList, setCompaniesList] = useState([]);
    const [usersList, setUsersList] = useState([]);
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

    // Category Modal
    const [showCatModal, setShowCatModal] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [catForm, setCatForm] = useState({ name: '' });

    // Cost Center Modal
    const [showCCModal, setShowCCModal] = useState(false);
    const [editingCC, setEditingCC] = useState(null);
    const [ccForm, setCCForm] = useState({ name: '', code: '' });

    // Company Modal
    const [showCompModal, setShowCompModal] = useState(false);
    const [editingComp, setEditingComp] = useState(null);
    const [compForm, setCompForm] = useState({ name: '', cuit: '' });

    // User Permissions Modal
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({
        role: 'operator',
        is_approved: true,
        company_id: '',
        modules: ['movements', 'statistics', 'projects', 'project-stats']
    });

    // Search filters
    const [suppSearch, setSuppSearch] = useState('');
    const [respSearch, setRespSearch] = useState('');
    const [catSearch, setCatSearch] = useState('');
    const [ccSearch, setCCSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const isSuperAdmin = user?.role === 'superadmin';
    const isAdmin = user?.role === 'admin' || isSuperAdmin;

    useEffect(() => {
        fetchAllData();
    }, [currentCompany]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [boxesRes, respRes, suppRes, movRes, catRes, ccRes, compRes, usersRes] = await Promise.all([
                supabase.from('cash_boxes').select('*').order('created_at', { ascending: true }),
                supabase.from('expense_responsibles').select('*').order('name', { ascending: true }),
                supabase.from('suppliers').select('*').order('name', { ascending: true }),
                supabase.from('movements').select('*'),
                supabase.from('income_categories').select('*').order('name', { ascending: true }),
                supabase.from('cost_centers').select('*').order('name', { ascending: true }),
                supabase.from('companies').select('*').order('name', { ascending: true }),
                supabase.from('profiles').select('*, user_company_permissions(*)').order('created_at', { ascending: false })
            ]);

            if (boxesRes.data) setCashBoxes(boxesRes.data);
            if (respRes.data) setResponsibles(respRes.data);
            if (suppRes.data) setSuppliers(suppRes.data);
            if (movRes.data) setMovements(movRes.data);
            if (catRes.data) setIncomeCategories(catRes.data);
            if (ccRes.data) setCostCenters(ccRes.data);
            if (compRes.data) setCompaniesList(compRes.data);
            if (usersRes.data) setUsersList(usersRes.data);
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
                const { error } = await supabase.from('cash_boxes').update(payload).eq('id', editingBox.id);
                if (error) throw error;
                toast.success('Caja actualizada exitosamente');
            } else {
                const { error } = await supabase.from('cash_boxes').insert([payload]);
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

            const egreso = {
                user_id: user?.id,
                type: 'expense',
                amount: amt,
                date: transferForm.date,
                description: `[Transferencia Saliente] -> ${toBox?.name || 'Caja destino'}: ${transferForm.concept}`,
                company: 'Transferencia Interna',
                cash_box_id: transferForm.from_box_id
            };

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
                const { error } = await supabase.from('expense_responsibles').update(payload).eq('id', editingResp.id);
                if (error) throw error;
                toast.success('Responsable actualizado');
            } else {
                const { error } = await supabase.from('expense_responsibles').insert([payload]);
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
                const { error } = await supabase.from('suppliers').update(payload).eq('id', editingSupp.id);
                if (error) throw error;
                toast.success('Proveedor actualizado');
            } else {
                const { error } = await supabase.from('suppliers').insert([payload]);
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

    // --- INCOME CATEGORIES ACTIONS ---
    const handleSaveCat = async (e) => {
        e.preventDefault();
        try {
            const payload = { name: catForm.name.trim() };
            if (editingCat) {
                const { error } = await supabase.from('income_categories').update(payload).eq('id', editingCat.id);
                if (error) throw error;
                toast.success('Categoría actualizada');
            } else {
                const { error } = await supabase.from('income_categories').insert([payload]);
                if (error) throw error;
                toast.success('Categoría creada');
            }
            setShowCatModal(false);
            setEditingCat(null);
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar categoría');
        }
    };

    const handleDeleteCat = async (id, name) => {
        if (!window.confirm(`¿Eliminar la categoría "${name}"?`)) return;
        try {
            const { error } = await supabase.from('income_categories').delete().eq('id', id);
            if (error) throw error;
            toast.success('Categoría eliminada');
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar categoría');
        }
    };

    // --- COST CENTERS ACTIONS ---
    const handleSaveCC = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                name: ccForm.name.trim(), 
                code: ccForm.code.trim().toUpperCase() 
            };
            if (editingCC) {
                const { error } = await supabase.from('cost_centers').update(payload).eq('id', editingCC.id);
                if (error) throw error;
                toast.success('Centro de costos actualizado');
            } else {
                const { error } = await supabase.from('cost_centers').insert([payload]);
                if (error) throw error;
                toast.success('Centro de costos creado');
            }
            setShowCCModal(false);
            setEditingCC(null);
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar centro de costos');
        }
    };

    const handleDeleteCC = async (id, name) => {
        if (!window.confirm(`¿Eliminar el centro de costos "${name}"?`)) return;
        try {
            const { error } = await supabase.from('cost_centers').delete().eq('id', id);
            if (error) throw error;
            toast.success('Centro de costos eliminado');
            fetchAllData();
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar centro de costos');
        }
    };

    // --- COMPANIES ACTIONS (SUPER ADMIN) ---
    const handleSaveComp = async (e) => {
        e.preventDefault();
        try {
            const payload = { name: compForm.name.trim(), cuit: compForm.cuit.trim() };
            if (editingComp) {
                const { error } = await supabase.from('companies').update(payload).eq('id', editingComp.id);
                if (error) throw error;
                toast.success('Empresa actualizada');
            } else {
                const { error } = await supabase.from('companies').insert([payload]);
                if (error) throw error;
                toast.success('Empresa creada');
            }
            setShowCompModal(false);
            setEditingComp(null);
            fetchAllData();
            loadUserData(user);
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar empresa');
        }
    };

    const handleDeleteComp = async (id, name) => {
        if (!window.confirm(`¿Eliminar la empresa "${name}"? Se eliminarán los vínculos asociados.`)) return;
        try {
            const { error } = await supabase.from('companies').delete().eq('id', id);
            if (error) throw error;
            toast.success('Empresa eliminada');
            fetchAllData();
            loadUserData(user);
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar empresa');
        }
    };

    // --- USER MANAGEMENT & RBAC PERMISSIONS ---
    const handleOpenUserModal = (u) => {
        setEditingUser(u);
        const existingPerm = u.user_company_permissions?.[0];
        setUserForm({
            role: u.role || 'operator',
            is_approved: u.is_approved ?? false,
            company_id: existingPerm?.company_id || (companiesList[0]?.id || ''),
            modules: existingPerm?.modules || ['movements', 'statistics', 'projects', 'project-stats']
        });
        setShowUserModal(true);
    };

    const handleSaveUserPermissions = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            // 1. Update Profile (role and approval)
            const { error: profErr } = await supabase
                .from('profiles')
                .update({
                    role: userForm.role,
                    is_approved: userForm.is_approved
                })
                .eq('id', editingUser.id);

            if (profErr) throw profErr;

            // 2. Upsert Company Permission if company selected
            if (userForm.company_id && userForm.role !== 'superadmin') {
                const { error: permErr } = await supabase
                    .from('user_company_permissions')
                    .upsert({
                        user_id: editingUser.id,
                        company_id: userForm.company_id,
                        role: userForm.role,
                        modules: userForm.modules
                    }, { onConflict: 'user_id,company_id' });

                if (permErr) throw permErr;
            }

            toast.success(`Permisos actualizados para ${editingUser.email}`);
            setShowUserModal(false);
            setEditingUser(null);
            fetchAllData();
        } catch (err) {
            console.error('Error saving user permissions:', err);
            toast.error('Error al guardar permisos del usuario');
        }
    };

    const handleToggleModule = (modId) => {
        setUserForm(prev => {
            const has = prev.modules.includes(modId);
            return {
                ...prev,
                modules: has ? prev.modules.filter(m => m !== modId) : [...prev.modules, modId]
            };
        });
    };

    // Filtered lists
    const filteredSuppliers = useMemo(() => {
        if (!suppSearch) return suppliers;
        const q = suppSearch.toLowerCase();
        return suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.cuit && s.cuit.includes(q)) || (s.category && s.category.toLowerCase().includes(q)));
    }, [suppliers, suppSearch]);

    const filteredResponsibles = useMemo(() => {
        if (!respSearch) return responsibles;
        const q = respSearch.toLowerCase();
        return responsibles.filter(r => r.name.toLowerCase().includes(q) || (r.department && r.department.toLowerCase().includes(q)));
    }, [responsibles, respSearch]);

    const filteredCategories = useMemo(() => {
        if (!catSearch) return incomeCategories;
        return incomeCategories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
    }, [incomeCategories, catSearch]);

    const filteredCostCenters = useMemo(() => {
        if (!ccSearch) return costCenters;
        const q = ccSearch.toLowerCase();
        return costCenters.filter(c => c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q)));
    }, [costCenters, ccSearch]);

    const filteredUsers = useMemo(() => {
        if (!userSearch) return usersList;
        const q = userSearch.toLowerCase();
        return usersList.filter(u => (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q));
    }, [usersList, userSearch]);

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
                    className={`settings-tab-btn ${subTab === 'categorias' ? 'active' : ''}`}
                    onClick={() => setSubTab('categorias')}
                >
                    <Tags size={18} />
                    <span>Categorías de Ingreso</span>
                </button>
                <button 
                    className={`settings-tab-btn ${subTab === 'costos' ? 'active' : ''}`}
                    onClick={() => setSubTab('costos')}
                >
                    <Layers size={18} />
                    <span>Centros de Costos</span>
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
                    <span>Proveedores</span>
                </button>

                {isAdmin && (
                    <button 
                        className={`settings-tab-btn ${subTab === 'usuarios' ? 'active' : ''}`}
                        onClick={() => setSubTab('usuarios')}
                    >
                        <UserCheck size={18} />
                        <span>Usuarios & Permisos</span>
                    </button>
                )}

                {isSuperAdmin && (
                    <button 
                        className={`settings-tab-btn ${subTab === 'empresas' ? 'active' : ''}`}
                        onClick={() => setSubTab('empresas')}
                    >
                        <Building2 size={18} />
                        <span>Empresas</span>
                    </button>
                )}
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

            {/* TAB 2: CATEGORIAS DE INGRESO */}
            {subTab === 'categorias' && (
                <div className="settings-section">
                    <div className="section-toolbar glass">
                        <div className="search-wrap">
                            <Search size={16} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Buscar categoría de ingreso..." 
                                className="styled-search-input"
                                value={catSearch}
                                onChange={(e) => setCatSearch(e.target.value)}
                            />
                        </div>
                        <button 
                            className="action-btn add-btn"
                            onClick={() => {
                                setEditingCat(null);
                                setCatForm({ name: '' });
                                setShowCatModal(true);
                            }}
                        >
                            <Plus size={16} />
                            <span>Nueva Categoría</span>
                        </button>
                    </div>

                    <div className="table-responsive glass slide-up">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Nombre de Categoría</th>
                                    <th>Tipo de Operación</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="empty-table-cell">No se encontraron categorías de ingreso.</td>
                                    </tr>
                                ) : (
                                    filteredCategories.map((c) => (
                                        <tr key={c.id}>
                                            <td className="font-semibold text-white">{c.name}</td>
                                            <td><span className="badge-category">Ingreso / Facturación</span></td>
                                            <td><span className="badge-active">Activo</span></td>
                                            <td className="text-right">
                                                <div className="table-row-actions">
                                                    <button className="row-btn edit" onClick={() => { setEditingCat(c); setCatForm({ name: c.name }); setShowCatModal(true); }}><Edit3 size={15} /></button>
                                                    <button className="row-btn delete" onClick={() => handleDeleteCat(c.id, c.name)}><Trash2 size={15} /></button>
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

            {/* TAB 3: CENTROS DE COSTOS */}
            {subTab === 'costos' && (
                <div className="settings-section">
                    <div className="section-toolbar glass">
                        <div className="search-wrap">
                            <Search size={16} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Buscar centro de costos por nombre o código..." 
                                className="styled-search-input"
                                value={ccSearch}
                                onChange={(e) => setCCSearch(e.target.value)}
                            />
                        </div>
                        <button 
                            className="action-btn add-btn"
                            onClick={() => {
                                setEditingCC(null);
                                setCCForm({ name: '', code: '' });
                                setShowCCModal(true);
                            }}
                        >
                            <Plus size={16} />
                            <span>Nuevo Centro de Costos</span>
                        </button>
                    </div>

                    <div className="table-responsive glass slide-up">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nombre del Centro de Costos</th>
                                    <th>Tipo</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCostCenters.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="empty-table-cell">No se encontraron centros de costos.</td>
                                    </tr>
                                ) : (
                                    filteredCostCenters.map((cc) => (
                                        <tr key={cc.id}>
                                            <td className="font-mono text-muted">{cc.code || 'CC-GEN'}</td>
                                            <td className="font-semibold text-white">{cc.name}</td>
                                            <td><span className="badge-dept">Egreso Operativo</span></td>
                                            <td className="text-right">
                                                <div className="table-row-actions">
                                                    <button className="row-btn edit" onClick={() => { setEditingCC(cc); setCCForm({ name: cc.name, code: cc.code || '' }); setShowCCModal(true); }}><Edit3 size={15} /></button>
                                                    <button className="row-btn delete" onClick={() => handleDeleteCC(cc.id, cc.name)}><Trash2 size={15} /></button>
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

            {/* TAB 4: RESPONSABLES DE GASTO */}
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
                                    <tr><td colSpan="4" className="empty-table-cell">No se encontraron responsables.</td></tr>
                                ) : (
                                    filteredResponsibles.map((r) => (
                                        <tr key={r.id}>
                                            <td className="font-semibold text-white">{r.name}</td>
                                            <td><span className="badge-dept">{r.department || 'General'}</span></td>
                                            <td><span className="badge-active">Activo</span></td>
                                            <td className="text-right">
                                                <div className="table-row-actions">
                                                    <button className="row-btn edit" onClick={() => { setEditingResp(r); setRespForm({ name: r.name, department: r.department || '' }); setShowRespModal(true); }}><Edit3 size={15} /></button>
                                                    <button className="row-btn delete" onClick={() => handleDeleteResp(r.id, r.name)}><Trash2 size={15} /></button>
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

            {/* TAB 5: PROVEEDORES */}
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
                                    <th>Contacto</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.length === 0 ? (
                                    <tr><td colSpan="5" className="empty-table-cell">No se encontraron proveedores.</td></tr>
                                ) : (
                                    filteredSuppliers.map((s) => (
                                        <tr key={s.id}>
                                            <td className="font-semibold text-white">{s.name}</td>
                                            <td className="font-mono text-muted">{s.cuit || '-'}</td>
                                            <td><span className="badge-category">{s.category || 'General'}</span></td>
                                            <td className="text-muted text-sm">{s.phone ? <div>📞 {s.phone}</div> : null}{s.email ? <div>✉️ {s.email}</div> : null}{!s.phone && !s.email && '-'}</td>
                                            <td className="text-right">
                                                <div className="table-row-actions">
                                                    <button className="row-btn edit" onClick={() => { setEditingSupp(s); setSuppForm({ name: s.name, cuit: s.cuit || '', category: s.category || '', phone: s.phone || '', email: s.email || '' }); setShowSuppModal(true); }}><Edit3 size={15} /></button>
                                                    <button className="row-btn delete" onClick={() => handleDeleteSupp(s.id, s.name)}><Trash2 size={15} /></button>
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

            {/* TAB 6: USUARIOS & PERMISOS (RBAC) */}
            {subTab === 'usuarios' && isAdmin && (
                <div className="settings-section">
                    <div className="section-toolbar glass">
                        <div className="search-wrap">
                            <Search size={16} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Buscar usuario por correo o rol..." 
                                className="styled-search-input"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="table-responsive glass slide-up">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Usuario / Email</th>
                                    <th>Rol Asignado</th>
                                    <th>Estado de Aprobación</th>
                                    <th>Empresa Asignada</th>
                                    <th className="text-right">Gestionar Permisos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => {
                                    const assignedCompId = u.user_company_permissions?.[0]?.company_id;
                                    const assignedComp = companiesList.find(c => c.id === assignedCompId);

                                    return (
                                        <tr key={u.id}>
                                            <td className="font-semibold text-white">{u.email}</td>
                                            <td>
                                                {u.role === 'superadmin' ? (
                                                    <span className="user-badge superadmin"><Crown size={12} /> Super Admin</span>
                                                ) : u.role === 'admin' ? (
                                                    <span className="user-badge admin"><ShieldCheck size={12} /> Administrador</span>
                                                ) : u.role === 'operator' ? (
                                                    <span className="user-badge operator">Operador</span>
                                                ) : (
                                                    <span className="user-badge unassigned">Sin Rol / Pendiente</span>
                                                )}
                                            </td>
                                            <td>
                                                {u.is_approved ? (
                                                    <span className="badge-active">Aprobado</span>
                                                ) : (
                                                    <span className="badge-pending">Pendiente</span>
                                                )}
                                            </td>
                                            <td className="text-muted">
                                                {u.role === 'superadmin' ? '🏢 Acceso Global (Todas)' : (assignedComp?.name ? `🏢 ${assignedComp.name}` : 'Sin Asignar')}
                                            </td>
                                            <td className="text-right">
                                                <button className="action-btn edit-user-btn" onClick={() => handleOpenUserModal(u)}>
                                                    <Edit3 size={14} />
                                                    <span>Permisos</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 7: EMPRESAS (SUPER ADMIN) */}
            {subTab === 'empresas' && isSuperAdmin && (
                <div className="settings-section">
                    <div className="section-toolbar glass">
                        <div>
                            <h3 className="section-inner-title">Catálogo de Empresas LYNX</h3>
                            <p className="section-inner-sub">Administra las organizaciones multi-empresa del sistema</p>
                        </div>
                        <button 
                            className="action-btn add-btn"
                            onClick={() => {
                                setEditingComp(null);
                                setCompForm({ name: '', cuit: '' });
                                setShowCompModal(true);
                            }}
                        >
                            <Plus size={16} />
                            <span>Nueva Empresa</span>
                        </button>
                    </div>

                    <div className="table-responsive glass slide-up">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Nombre de Empresa</th>
                                    <th>CUIT</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companiesList.map((comp) => (
                                    <tr key={comp.id}>
                                        <td className="font-semibold text-white">🏢 {comp.name}</td>
                                        <td className="font-mono text-muted">{comp.cuit || '-'}</td>
                                        <td><span className="badge-active">Activa</span></td>
                                        <td className="text-right">
                                            <div className="table-row-actions">
                                                <button className="row-btn edit" onClick={() => { setEditingComp(comp); setCompForm({ name: comp.name, cuit: comp.cuit || '' }); setShowCompModal(true); }}><Edit3 size={15} /></button>
                                                <button className="row-btn delete" onClick={() => handleDeleteComp(comp.id, comp.name)}><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODAL: CAJA --- */}
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
                                <input type="text" required placeholder="Ej. Caja Efectivo Local, Banco Galicia, Mercado Pago" value={boxForm.name} onChange={(e) => setBoxForm({ ...boxForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Tipo de Cuenta</label>
                                <select value={boxForm.type} onChange={(e) => setBoxForm({ ...boxForm, type: e.target.value })}>
                                    <option value="cash">Caja Efectivo</option>
                                    <option value="bank">Cuenta Bancaria (CBU / Transferencias)</option>
                                    <option value="digital">Billetera Digital (Mercado Pago / Ualá)</option>
                                    <option value="posnet">Posnet / Tarjetas</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Saldo Inicial ($)</label>
                                <input type="number" step="0.01" required value={boxForm.initial_balance} onChange={(e) => setBoxForm({ ...boxForm, initial_balance: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowBoxModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save"><Save size={16} /><span>Guardar Caja</span></button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: TRANSFERENCIA --- */}
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
                                <select required value={transferForm.from_box_id} onChange={(e) => setTransferForm({ ...transferForm, from_box_id: e.target.value })}>
                                    <option value="">Selecciona caja origen...</option>
                                    {cashBoxes.map(b => (<option key={b.id} value={b.id}>{b.name} ({getBoxTypeName(b.type)})</option>))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Caja Destino (Ingresa el dinero)</label>
                                <select required value={transferForm.to_box_id} onChange={(e) => setTransferForm({ ...transferForm, to_box_id: e.target.value })}>
                                    <option value="">Selecciona caja destino...</option>
                                    {cashBoxes.map(b => (<option key={b.id} value={b.id}>{b.name} ({getBoxTypeName(b.type)})</option>))}
                                </select>
                            </div>
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>Monto ($)</label>
                                    <input type="number" step="0.01" required placeholder="0.00" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Fecha</label>
                                    <input type="date" required value={transferForm.date} onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Concepto / Observaciones</label>
                                <input type="text" required placeholder="Motivo de la transferencia..." value={transferForm.concept} onChange={(e) => setTransferForm({ ...transferForm, concept: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowTransferModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save gold"><ArrowRightLeft size={16} /><span>Ejecutar Transferencia</span></button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: CATEGORIA INGRESO --- */}
            {showCatModal && (
                <div className="modal-overlay">
                    <div className="modal-card glass slide-up">
                        <div className="modal-header">
                            <h3>{editingCat ? 'Editar Categoría de Ingreso' : 'Nueva Categoría de Ingreso'}</h3>
                            <button className="modal-close" onClick={() => setShowCatModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveCat} className="modal-form">
                            <div className="form-group">
                                <label>Nombre de la Categoría</label>
                                <input type="text" required placeholder="Ej. Implementación, Desarrollo, Hosting, Mantenimiento" value={catForm.name} onChange={(e) => setCatForm({ name: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowCatModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save"><Save size={16} /><span>Guardar Categoría</span></button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: CENTRO DE COSTOS --- */}
            {showCCModal && (
                <div className="modal-overlay">
                    <div className="modal-card glass slide-up">
                        <div className="modal-header">
                            <h3>{editingCC ? 'Editar Centro de Costos' : 'Nuevo Centro de Costos'}</h3>
                            <button className="modal-close" onClick={() => setShowCCModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveCC} className="modal-form">
                            <div className="form-group">
                                <label>Nombre del Centro de Costos</label>
                                <input type="text" required placeholder="Ej. Infraestructura, Sueldos, Marketing, Impuestos" value={ccForm.name} onChange={(e) => setCCForm({ ...ccForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Código / Identificador (Opcional)</label>
                                <input type="text" placeholder="Ej. CC-01, ADM, OPS" value={ccForm.code} onChange={(e) => setCCForm({ ...ccForm, code: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowCCModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save"><Save size={16} /><span>Guardar Centro</span></button>
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
                                <input type="text" required placeholder="Ej. Juan Simón Astudilla, Dirección General" value={respForm.name} onChange={(e) => setRespForm({ ...respForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Área o Departamento</label>
                                <input type="text" placeholder="Ej. Administración, Operaciones, Ventas" value={respForm.department} onChange={(e) => setRespForm({ ...respForm, department: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowRespModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save"><Save size={16} /><span>Guardar Responsable</span></button>
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
                                <input type="text" required placeholder="Ej. Hostinger International, AWS, Insumos S.A." value={suppForm.name} onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })} />
                            </div>
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>CUIT / Identificación Fiscal</label>
                                    <input type="text" placeholder="30-00000000-0" value={suppForm.cuit} onChange={(e) => setSuppForm({ ...suppForm, cuit: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Rubro / Categoría</label>
                                    <input type="text" placeholder="Ej. Hosting, Cristales, Insumos" value={suppForm.category} onChange={(e) => setSuppForm({ ...suppForm, category: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>Teléfono de Contacto</label>
                                    <input type="text" placeholder="+54 9 11 ..." value={suppForm.phone} onChange={(e) => setSuppForm({ ...suppForm, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Email de Contacto</label>
                                    <input type="email" placeholder="contacto@proveedor.com" value={suppForm.email} onChange={(e) => setSuppForm({ ...suppForm, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowSuppModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save"><Save size={16} /><span>Guardar Proveedor</span></button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: EMPRESA (SUPER ADMIN) --- */}
            {showCompModal && (
                <div className="modal-overlay">
                    <div className="modal-card glass slide-up">
                        <div className="modal-header">
                            <h3>{editingComp ? 'Editar Empresa' : 'Nueva Empresa en el Sistema'}</h3>
                            <button className="modal-close" onClick={() => setShowCompModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveComp} className="modal-form">
                            <div className="form-group">
                                <label>Nombre o Razón Social de la Empresa</label>
                                <input type="text" required placeholder="Ej. LYNX Global, Óptica Paracao, Tech S.A." value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>CUIT / Identificación Fiscal</label>
                                <input type="text" placeholder="30-00000000-0" value={compForm.cuit} onChange={(e) => setCompForm({ ...compForm, cuit: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowCompModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save"><Save size={16} /><span>Guardar Empresa</span></button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: GESTIÓN DE USUARIO & PERMISOS (RBAC) --- */}
            {showUserModal && editingUser && (
                <div className="modal-overlay">
                    <div className="modal-card glass slide-up wide">
                        <div className="modal-header">
                            <div>
                                <h3>Permisos & Asignación de Usuario</h3>
                                <p className="modal-subtitle">{editingUser.email}</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowUserModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveUserPermissions} className="modal-form">
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>Rol en el Sistema</label>
                                    <select 
                                        value={userForm.role}
                                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                        disabled={!isSuperAdmin && editingUser.role === 'superadmin'}
                                    >
                                        {isSuperAdmin && <option value="superadmin">👑 Super Administrador (Global)</option>}
                                        <option value="admin">🛡️ Administrador de Empresa</option>
                                        <option value="operator">👤 Operador Estándar</option>
                                        <option value="unassigned">⛔ Sin Rol / Bloqueado</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Estado de Aprobación</label>
                                    <select 
                                        value={userForm.is_approved ? 'true' : 'false'}
                                        onChange={(e) => setUserForm({ ...userForm, is_approved: e.target.value === 'true' })}
                                    >
                                        <option value="true">✅ Aprobado (Permitir Acceso)</option>
                                        <option value="false">❌ Pendiente / Bloqueado</option>
                                    </select>
                                </div>
                            </div>

                            {userForm.role !== 'superadmin' && (
                                <div className="form-group">
                                    <label>Empresa Asignada</label>
                                    <select 
                                        value={userForm.company_id}
                                        onChange={(e) => setUserForm({ ...userForm, company_id: e.target.value })}
                                    >
                                        <option value="">Selecciona empresa...</option>
                                        {companiesList.map(c => (
                                            <option key={c.id} value={c.id}>🏢 {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {userForm.role === 'operator' && (
                                <div className="form-group">
                                    <label>Módulos Permitidos (Permisos Parciales)</label>
                                    <div className="modules-checkbox-grid">
                                        {[
                                            { id: 'movements', label: 'Cargar Movimientos' },
                                            { id: 'statistics', label: 'Estadísticas & Balance' },
                                            { id: 'projects', label: 'Gestión de Proyectos' },
                                            { id: 'project-stats', label: 'Métricas de Proyectos' },
                                            { id: 'settings', label: 'Configuraciones' }
                                        ].map(mod => {
                                            const isChecked = userForm.modules.includes(mod.id);
                                            return (
                                                <label key={mod.id} className={`module-check-label ${isChecked ? 'active' : ''}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={() => handleToggleModule(mod.id)}
                                                    />
                                                    <span>{mod.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowUserModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save gold">
                                    <Save size={16} />
                                    <span>Guardar Asignación</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
