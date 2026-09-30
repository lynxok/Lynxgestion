import { useState, useEffect } from 'react';
import { 
    Plus, 
    ListTodo, 
    Target, 
    Users, 
    Calendar, 
    ChevronRight, 
    Save, 
    Trash2, 
    CheckCircle2, 
    Clock, 
    Search, 
    FolderKanban, 
    AlertCircle, 
    Layers, 
    PlayCircle 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Projects.css';

export default function Projects() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        objective: '',
        target_audience: '',
        progress: 0
    });

    const [stages, setStages] = useState([]);
    const [newStage, setNewStage] = useState({
        name: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'pending'
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProjects(data || []);
            if (data && data.length > 0 && !selectedProject) {
                setSelectedProject(data[0]);
                fetchStages(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Error al cargar proyectos');
        } finally {
            setLoading(false);
        }
    };

    const fetchStages = async (projectId) => {
        try {
            const { data, error } = await supabase
                .from('project_stages')
                .select('*')
                .eq('project_id', projectId)
                .order('start_date', { ascending: true });

            if (error) throw error;
            setStages(data || []);
        } catch (error) {
            console.error('Error fetching stages:', error);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();

        if (!user || !user.id) {
            toast.error('Error de sesión. Intenta cerrar sesión y volver a entrar.');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    name: formData.name,
                    objective: formData.objective,
                    target_audience: formData.target_audience,
                    progress: parseInt(formData.progress) || 0,
                    user_id: user.id
                }])
                .select();

            if (error) throw error;

            toast.success('Proyecto creado exitosamente');
            if (data && data[0]) {
                setProjects([data[0], ...projects]);
                setSelectedProject(data[0]);
                fetchStages(data[0].id);
            } else {
                await fetchProjects();
            }

            setIsCreating(false);
            setFormData({ name: '', objective: '', target_audience: '', progress: 0 });
        } catch (error) {
            console.error('Error creating project:', error);
            toast.error('Error al crear proyecto: ' + (error.message || 'Error inesperado'));
        }
    };

    const handleAddStage = async (e) => {
        e.preventDefault();
        if (!selectedProject) return;

        try {
            const { data, error } = await supabase
                .from('project_stages')
                .insert([{
                    name: newStage.name,
                    start_date: newStage.start_date,
                    end_date: newStage.end_date,
                    status: newStage.status,
                    project_id: selectedProject.id
                }])
                .select();

            if (error) throw error;

            toast.success('Etapa agregada correctamente');
            const updatedStages = [...stages, data[0]];
            setStages(updatedStages);
            setNewStage({ 
                name: '', 
                start_date: new Date().toISOString().split('T')[0], 
                end_date: '', 
                status: 'pending' 
            });

            updateProjectProgress(selectedProject.id, updatedStages);
        } catch (error) {
            console.error('Error adding stage:', error);
            toast.error('Error al agregar etapa: ' + error.message);
        }
    };

    const toggleStageStatus = async (stage) => {
        // Cycle: pending -> in_progress -> completed -> pending
        let nextStatus = 'in_progress';
        if (stage.status === 'in_progress') nextStatus = 'completed';
        else if (stage.status === 'completed' || stage.status === 'done') nextStatus = 'pending';

        try {
            const { error } = await supabase
                .from('project_stages')
                .update({ status: nextStatus })
                .eq('id', stage.id);

            if (error) throw error;

            const updatedStages = stages.map(s => s.id === stage.id ? { ...s, status: nextStatus } : s);
            setStages(updatedStages);
            updateProjectProgress(selectedProject.id, updatedStages);
        } catch (error) {
            console.error('Error updating stage:', error);
            toast.error('Error al actualizar estado');
        }
    };

    const deleteStage = async (stageId) => {
        if (!window.confirm('¿Eliminar esta etapa del proyecto?')) return;

        try {
            const { error } = await supabase
                .from('project_stages')
                .delete()
                .eq('id', stageId);

            if (error) throw error;

            toast.info('Etapa eliminada');
            const updatedStages = stages.filter(s => s.id !== stageId);
            setStages(updatedStages);
            updateProjectProgress(selectedProject.id, updatedStages);
        } catch (error) {
            console.error('Error deleting stage:', error);
            toast.error('No se pudo eliminar la etapa');
        }
    };

    const updateProjectProgress = async (projectId, currentStagesList) => {
        if (!currentStagesList || currentStagesList.length === 0) return;

        const completedCount = currentStagesList.filter(s => s.status === 'completed' || s.status === 'done').length;
        const inProgressCount = currentStagesList.filter(s => s.status === 'in_progress').length;
        
        // Progress weight: completed = 100%, in_progress = 50%
        const score = (completedCount * 1.0) + (inProgressCount * 0.5);
        const progress = Math.min(100, Math.round((score / currentStagesList.length) * 100));

        await supabase
            .from('projects')
            .update({ progress })
            .eq('id', projectId);

        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, progress } : p));
        if (selectedProject?.id === projectId) {
            setSelectedProject(prev => ({ ...prev, progress }));
        }
    };

    const deleteProject = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este proyecto y todas sus etapas vinculadas?')) return;
        
        try {
            const { error } = await supabase.from('projects').delete().eq('id', id);
            if (error) throw error;

            toast.info('Proyecto eliminado');
            const remaining = projects.filter(p => p.id !== id);
            setProjects(remaining);
            if (remaining.length > 0) {
                setSelectedProject(remaining[0]);
                fetchStages(remaining[0].id);
            } else {
                setSelectedProject(null);
                setStages([]);
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            toast.error('Error al eliminar proyecto');
        }
    };

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.target_audience || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.objective || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getProgressColor = (val) => {
        if (val >= 100) return '#10B981';
        if (val >= 50) return '#F59E0B';
        return '#3B82F6';
    };

    return (
        <div className="projects-container fade-in">
            {/* Header & Controls */}
            <div className="projects-top-controls">
                <div className="projects-search-bar">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar proyectos por nombre, público, meta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    className={`btn-action-main ${isCreating ? 'btn-cancel' : 'btn-new'}`}
                    onClick={() => {
                        setIsCreating(!isCreating);
                    }}
                >
                    {isCreating ? 'Cancelar' : <><Plus size={18} /> Nuevo Proyecto</>}
                </button>
            </div>

            {/* Creation Modal / Form */}
            {isCreating && (
                <div className="card project-create-card glass fade-in">
                    <div className="card-header">
                        <h3><FolderKanban size={20} className="header-icon" /> Crear Nueva Iniciativa</h3>
                        <p>Completa la información clave del proyecto para el equipo</p>
                    </div>

                    <form onSubmit={handleCreateProject} className="create-project-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nombre del Proyecto</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Modernización de Infraestructura"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Público Objetivo / Beneficiario</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Clientes Corporativos, Equipo Interno"
                                    value={formData.target_audience}
                                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Objetivo Principal</label>
                            <textarea
                                rows="3"
                                placeholder="Describe el impacto y meta esperada..."
                                value={formData.objective}
                                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                <Save size={18} />
                                Guardar Proyecto
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Master Detail Grid */}
            <div className="projects-grid-layout">
                {/* Left: Projects List */}
                <div className="card projects-list-column glass">
                    <div className="column-header">
                        <div className="column-title">
                            <Layers size={18} />
                            <span>Iniciativas Activas ({filteredProjects.length})</span>
                        </div>
                    </div>

                    <div className="projects-items-stack">
                        {loading ? (
                            <div className="empty-state">
                                <span className="loading-spinner"></span>
                                <p>Cargando proyectos...</p>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="empty-state">
                                <FolderKanban size={36} className="empty-icon" />
                                <p>No hay proyectos registrados</p>
                            </div>
                        ) : (
                            filteredProjects.map(project => {
                                const isSelected = selectedProject?.id === project.id;
                                const progColor = getProgressColor(project.progress);

                                return (
                                    <div
                                        key={project.id}
                                        className={`project-card-item glass ${isSelected ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedProject(project);
                                            fetchStages(project.id);
                                        }}
                                    >
                                        <div className="project-card-top">
                                            <h4>{project.name}</h4>
                                            <span className="project-prog-badge" style={{ color: progColor, borderColor: progColor }}>
                                                {project.progress}%
                                            </span>
                                        </div>

                                        <div className="project-card-progress-bar">
                                            <div 
                                                className="progress-fill" 
                                                style={{ width: `${project.progress}%`, backgroundColor: progColor }}
                                            />
                                        </div>

                                        <div className="project-card-footer">
                                            <span className="project-audience">
                                                <Users size={13} />
                                                {project.target_audience || 'General'}
                                            </span>
                                            <ChevronRight size={16} className="chevron-icon" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Selected Project Detail & Stages */}
                <div className="card project-detail-column glass">
                    {selectedProject ? (
                        <div className="detail-content fade-in">
                            {/* Project Header Info */}
                            <div className="detail-header-card glass">
                                <div className="detail-header-main">
                                    <div>
                                        <span className="badge badge-admin">Proyecto Activo</span>
                                        <h2>{selectedProject.name}</h2>
                                    </div>
                                    <button
                                        className="btn-delete-project"
                                        onClick={() => deleteProject(selectedProject.id)}
                                        title="Eliminar proyecto"
                                    >
                                        <Trash2 size={16} />
                                        <span>Eliminar</span>
                                    </button>
                                </div>

                                <div className="detail-meta-grid">
                                    <div className="meta-box">
                                        <span className="meta-label"><Target size={14} /> Objetivo</span>
                                        <p className="meta-value">{selectedProject.objective || 'Sin objetivo detallado'}</p>
                                    </div>

                                    <div className="meta-box">
                                        <span className="meta-label"><Users size={14} /> Destinatarios</span>
                                        <p className="meta-value">{selectedProject.target_audience || 'Sin especificar'}</p>
                                    </div>
                                </div>

                                <div className="detail-progress-section">
                                    <div className="prog-header">
                                        <span>Avance Global Consolidado</span>
                                        <span className="prog-percent">{selectedProject.progress}%</span>
                                    </div>
                                    <div className="prog-track">
                                        <div 
                                            className="prog-bar" 
                                            style={{ 
                                                width: `${selectedProject.progress}%`,
                                                backgroundColor: getProgressColor(selectedProject.progress)
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Stages Section */}
                            <div className="stages-container">
                                <div className="stages-section-header">
                                    <h3><ListTodo size={18} /> Cronograma de Fases y Etapas ({stages.length})</h3>
                                </div>

                                {/* Add Stage Form */}
                                <form onSubmit={handleAddStage} className="add-stage-form glass">
                                    <div className="stage-input-group">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Nombre de la etapa o hito..."
                                            value={newStage.name}
                                            onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="stage-dates-group">
                                        <div className="date-input-wrap">
                                            <span className="date-label">Inicio</span>
                                            <input
                                                type="date"
                                                required
                                                value={newStage.start_date}
                                                onChange={(e) => setNewStage({ ...newStage, start_date: e.target.value })}
                                            />
                                        </div>

                                        <div className="date-input-wrap">
                                            <span className="date-label">Fin</span>
                                            <input
                                                type="date"
                                                value={newStage.end_date}
                                                onChange={(e) => setNewStage({ ...newStage, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" className="btn-add-stage">
                                        <Plus size={16} />
                                        <span>Agregar</span>
                                    </button>
                                </form>

                                {/* Stages List */}
                                <div className="stages-stack">
                                    {stages.length === 0 ? (
                                        <div className="empty-stages">
                                            <Clock size={32} className="empty-icon" />
                                            <p>Este proyecto aún no tiene etapas definidas. Agrega la primera arriba.</p>
                                        </div>
                                    ) : (
                                        stages.map((stage) => {
                                            const isDone = stage.status === 'completed' || stage.status === 'done';
                                            const isInProgress = stage.status === 'in_progress';

                                            return (
                                                <div 
                                                    key={stage.id} 
                                                    className={`stage-item-card glass ${isDone ? 'is-done' : ''} ${isInProgress ? 'is-in-progress' : ''}`}
                                                >
                                                    <div className="stage-left-block">
                                                        <button 
                                                            type="button"
                                                            className="stage-status-toggle"
                                                            onClick={() => toggleStageStatus(stage)}
                                                            title="Clic para cambiar estado"
                                                        >
                                                            {isDone && <CheckCircle2 size={20} className="status-icon-done" />}
                                                            {isInProgress && <PlayCircle size={20} className="status-icon-progress" />}
                                                            {!isDone && !isInProgress && <Clock size={20} className="status-icon-pending" />}
                                                        </button>

                                                        <div className="stage-info">
                                                            <span className={`stage-title ${isDone ? 'completed-text' : ''}`}>
                                                                {stage.name}
                                                            </span>
                                                            <div className="stage-dates-meta">
                                                                <Calendar size={12} />
                                                                <span>{stage.start_date || '-'}</span>
                                                                {stage.end_date && <span>→ {stage.end_date}</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="stage-right-block">
                                                        <span 
                                                            className={`stage-pill ${stage.status}`}
                                                            onClick={() => toggleStageStatus(stage)}
                                                        >
                                                            {isDone && 'Completada'}
                                                            {isInProgress && 'En Progreso'}
                                                            {!isDone && !isInProgress && 'Pendiente'}
                                                        </span>

                                                        <button 
                                                            type="button"
                                                            className="btn-trash-stage" 
                                                            onClick={() => deleteStage(stage.id)}
                                                            title="Eliminar etapa"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-selection-state">
                            <FolderKanban size={48} className="empty-icon" />
                            <h3>Selecciona un proyecto</h3>
                            <p>Elige una iniciativa de la lista para gestionar sus etapas y métricas de avance</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
