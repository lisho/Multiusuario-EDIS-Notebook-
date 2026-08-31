import React, { useMemo, useState } from 'react';
import { Case, Task, MyNote, User, Professional, ProfessionalRole } from '../types';
import { 
    IoAddOutline, 
    IoCheckbox, 
    IoSquareOutline, 
    IoArrowBack, 
    IoCreateOutline, 
    IoTrashOutline, 
    IoSendOutline,
    IoSearchOutline,
    IoCloseCircleOutline,
    IoFilterOutline,
    IoJournalOutline,
    IoPersonOutline,
    IoFolderOpenOutline,
    IoCheckmarkDoneOutline,
    IoTimeOutline,
    IoDocumentTextOutline,
    IoCheckboxOutline,
    IoCloseOutline
} from 'react-icons/io5';
import UnifiedNoteModal, { UnifiedItemData } from './UnifiedNoteModal';

interface AllNotesViewProps {
    cases: Case[];
    generalTasks: Task[];
    onBack: () => void;
    currentUser: User;
    onSaveItem: (data: UnifiedItemData) => void;
    onDeleteItem: (id: string, type: 'note' | 'task', caseId: string | null) => void;
    onToggleTask: (id: string, caseId: string | null) => void;
    professionals?: Professional[];
    onSelectCaseById?: (caseId: string, view?: 'profile' | 'timeline' | 'tasks' | 'notes') => void;
    onTaskToEntry?: (task: Task, caseId: string) => void;
}

// Helper to organize data
interface GroupedData {
    caseId: string | null; // null for general
    caseName: string;
    items: (UnifiedItemData & { createdBy?: string })[];
}

type TypeFilter = 'all' | 'notes' | 'tasks' | 'pending' | 'completed';
type AssignmentFilter = 'all' | 'assigned_to_me' | 'created_by_me';

const colorClasses = {
    yellow: 'bg-yellow-100 border-yellow-200',
    pink: 'bg-pink-100 border-pink-200',
    blue: 'bg-blue-100 border-blue-200',
    green: 'bg-green-100 border-green-200',
    white: 'bg-white border-slate-200'
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const AllNotesView: React.FC<AllNotesViewProps> = ({ 
    cases, 
    generalTasks, 
    onBack, 
    currentUser, 
    onSaveItem, 
    onDeleteItem, 
    onToggleTask,
    professionals = [],
    onSelectCaseById,
    onTaskToEntry
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<UnifiedItemData | null>(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('all');
    const [selectedCaseId, setSelectedCaseId] = useState<string>('all');
    const [selectedColor, setSelectedColor] = useState<string>('all');

    // State for modal to select case when passing general task to notebook
    const [taskForNotebook, setTaskForNotebook] = useState<{ task: Task; originalCaseId: string | null } | null>(null);
    const [targetCaseForNotebook, setTargetCaseForNotebook] = useState<string>('');

    // Filtered EDIS technicians for professional filters
    const edisTechnicians = useMemo(() => {
        return professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
    }, [professionals]);

    const isVisibleToUser = (item: { createdBy?: string; assignedTo?: string[] }) => {
        if (currentUser.role === 'admin') return true;
        const isAssigned = item.assignedTo?.includes(currentUser.id);
        const isCreator = item.createdBy === currentUser.id;
        const isLegacy = (!item.assignedTo || item.assignedTo.length === 0) && isCreator;
        return isAssigned || isCreator || isLegacy;
    };

    const allGroups = useMemo<GroupedData[]>(() => {
        const result: GroupedData[] = [];

        // 1. General Tasks
        const myGeneralTasks = generalTasks.filter(isVisibleToUser);
        if (myGeneralTasks.length > 0) {
            const seenGenIds = new Set<string>();
            const genItems: (UnifiedItemData & { createdBy?: string })[] = [];
            myGeneralTasks.forEach(t => {
                if (!seenGenIds.has(t.id)) {
                    seenGenIds.add(t.id);
                    genItems.push({
                        id: t.id,
                        content: t.text,
                        type: 'task',
                        caseId: null,
                        isCompleted: t.completed,
                        assignedTo: t.assignedTo || (t.createdBy ? [t.createdBy] : []),
                        createdBy: t.createdBy
                    });
                }
            });

            result.push({
                caseId: null,
                caseName: 'General / Sin Caso',
                items: genItems
            });
        }

        // 2. Case Items
        const sortedCases = [...cases].sort((a, b) => {
             const aPinned = a.isPinned ? 1 : 0;
             const bPinned = b.isPinned ? 1 : 0;
             return bPinned - aPinned || a.name.localeCompare(b.name);
        });

        sortedCases.forEach(c => {
            const myNotes = (c.myNotes || []).filter(isVisibleToUser);
            const myTasks = (c.tasks || []).filter(isVisibleToUser);

            if (myNotes.length > 0 || myTasks.length > 0) {
                const seenItemIds = new Set<string>();
                const items: (UnifiedItemData & { createdBy?: string })[] = [];

                myNotes.forEach(n => {
                    if (n && n.id && !seenItemIds.has(n.id)) {
                        seenItemIds.add(n.id);
                        items.push({
                            id: n.id,
                            content: n.content,
                            type: 'note' as const,
                            caseId: c.id,
                            color: n.color,
                            assignedTo: n.assignedTo || (n.createdBy ? [n.createdBy] : []),
                            createdBy: n.createdBy
                        });
                    }
                });

                myTasks.forEach(t => {
                    if (t && t.id && !seenItemIds.has(t.id)) {
                        seenItemIds.add(t.id);
                        items.push({
                            id: t.id,
                            content: t.text,
                            type: 'task' as const,
                            caseId: c.id,
                            isCompleted: t.completed,
                            assignedTo: t.assignedTo || (t.createdBy ? [t.createdBy] : []),
                            createdBy: t.createdBy
                        });
                    }
                });

                result.push({
                    caseId: c.id,
                    caseName: c.name + (c.nickname ? ` (${c.nickname})` : ''),
                    items: items
                });
            }
        });

        return result;
    }, [cases, generalTasks, currentUser]);

    // Apply all interactive filters to items and groups
    const filteredGroups = useMemo<GroupedData[]>(() => {
        const query = searchQuery.trim().toLowerCase();

        return allGroups.map(group => {
            // Case filter
            if (selectedCaseId !== 'all') {
                if (selectedCaseId === 'general' && group.caseId !== null) return null;
                if (selectedCaseId !== 'general' && group.caseId !== selectedCaseId) return null;
            }

            const matchingItems = group.items.filter(item => {
                // 1. Text Search
                if (query) {
                    const contentMatch = item.content.toLowerCase().includes(query);
                    const caseMatch = group.caseName.toLowerCase().includes(query);
                    if (!contentMatch && !caseMatch) return false;
                }

                // 2. Type Filter
                if (typeFilter === 'notes' && item.type !== 'note') return false;
                if (typeFilter === 'tasks' && item.type !== 'task') return false;
                if (typeFilter === 'pending' && (item.type !== 'task' || item.isCompleted)) return false;
                if (typeFilter === 'completed' && (item.type !== 'task' || !item.isCompleted)) return false;

                // 3. Assignment Filter
                if (assignmentFilter === 'assigned_to_me') {
                    if (!item.assignedTo?.includes(currentUser.id)) return false;
                } else if (assignmentFilter === 'created_by_me') {
                    if (item.createdBy !== currentUser.id) return false;
                }

                // 4. Technician Filter
                if (selectedTechnicianId !== 'all') {
                    const isAssigned = item.assignedTo?.includes(selectedTechnicianId);
                    const isCreator = item.createdBy === selectedTechnicianId;
                    if (!isAssigned && !isCreator) return false;
                }

                // 5. Color Filter (for notes)
                if (selectedColor !== 'all') {
                    if (item.type === 'note' && item.color !== selectedColor) return false;
                    if (item.type === 'task') return false; // Hide tasks when filtering specifically by note color
                }

                return true;
            });

            if (matchingItems.length === 0) return null;

            return {
                ...group,
                items: matchingItems
            };
        }).filter(Boolean) as GroupedData[];
    }, [allGroups, searchQuery, typeFilter, assignmentFilter, selectedTechnicianId, selectedCaseId, selectedColor, currentUser]);

    // Total counts for stats bar
    const totalItemsCount = useMemo(() => {
        return filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
    }, [filteredGroups]);

    const totalNotesCount = useMemo(() => {
        return filteredGroups.reduce((acc, g) => acc + g.items.filter(i => i.type === 'note').length, 0);
    }, [filteredGroups]);

    const totalTasksCount = useMemo(() => {
        return filteredGroups.reduce((acc, g) => acc + g.items.filter(i => i.type === 'task').length, 0);
    }, [filteredGroups]);

    const hasActiveFilters = searchQuery !== '' || 
        typeFilter !== 'all' || 
        assignmentFilter !== 'all' || 
        selectedTechnicianId !== 'all' || 
        selectedCaseId !== 'all' || 
        selectedColor !== 'all';

    const handleClearFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
        setAssignmentFilter('all');
        setSelectedTechnicianId('all');
        setSelectedCaseId('all');
        setSelectedColor('all');
    };

    const handleOpenModal = (item: UnifiedItemData | null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handlePassTaskToNotebook = (item: UnifiedItemData & { createdBy?: string }) => {
        const taskObj: Task = {
            id: item.id!,
            text: item.content,
            completed: !!item.isCompleted,
            createdBy: item.createdBy,
            assignedTo: item.assignedTo
        };

        if (item.caseId) {
            // Task belongs to a case: convert directly to that case notebook
            if (onTaskToEntry) {
                onTaskToEntry(taskObj, item.caseId);
            } else if (onSelectCaseById) {
                onSelectCaseById(item.caseId, 'timeline');
            }
        } else {
            // General task: open modal to select which case notebook to pass it to
            setTaskForNotebook({ task: taskObj, originalCaseId: null });
            setTargetCaseForNotebook(cases[0]?.id || '');
        }
    };

    const handleConfirmPassGeneralTask = () => {
        if (!taskForNotebook || !targetCaseForNotebook) return;
        if (onTaskToEntry) {
            onTaskToEntry(taskForNotebook.task, targetCaseForNotebook);
        } else if (onSelectCaseById) {
            onSelectCaseById(targetCaseForNotebook, 'timeline');
        }
        setTaskForNotebook(null);
    };

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen pb-28 max-w-7xl">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack} 
                        className="p-2.5 rounded-xl bg-white shadow-xs hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                        title="Volver a casos"
                    >
                        <IoArrowBack className="text-xl" />
                    </button>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2">
                            Mis Notas y Tareas
                        </h2>
                        <p className="text-sm text-slate-500">
                            Gestión centralizada de notas adhesivas y tareas de técnicos EDIS.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => handleOpenModal(null)}
                    className="bg-teal-600 text-white px-4 py-2.5 rounded-xl hover:bg-teal-700 font-semibold flex items-center gap-2 shadow-sm transition-all hover:shadow hover:scale-[1.02]"
                >
                    <IoAddOutline className="text-xl" />
                    <span>Nueva Nota o Tarea</span>
                </button>
            </div>

            {/* FILTER CONTROLS PANEL */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs mb-8 space-y-4">
                {/* Search Bar + Quick Type Buttons */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                    <div className="relative flex-grow">
                        <IoSearchOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar en el texto de notas, tareas o por caso..."
                            className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                title="Borrar búsqueda"
                            >
                                <IoCloseCircleOutline className="text-lg" />
                            </button>
                        )}
                    </div>

                    {/* Type Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
                        <button
                            onClick={() => setTypeFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                typeFilter === 'all'
                                    ? 'bg-slate-800 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setTypeFilter('notes')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                typeFilter === 'notes'
                                    ? 'bg-yellow-400 text-yellow-950 shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <IoDocumentTextOutline className="text-sm" /> Notas
                        </button>
                        <button
                            onClick={() => setTypeFilter('tasks')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                typeFilter === 'tasks'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <IoCheckboxOutline className="text-sm" /> Tareas
                        </button>
                        <button
                            onClick={() => setTypeFilter('pending')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                typeFilter === 'pending'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <IoTimeOutline className="text-sm" /> Pendientes
                        </button>
                        <button
                            onClick={() => setTypeFilter('completed')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                typeFilter === 'completed'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <IoCheckmarkDoneOutline className="text-sm" /> Hechas
                        </button>
                    </div>
                </div>

                {/* Secondary Filter Dropdowns & Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                    {/* Assignment Filter */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Asignación
                        </label>
                        <select
                            value={assignmentFilter}
                            onChange={(e) => setAssignmentFilter(e.target.value as AssignmentFilter)}
                            className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="all">Todas las notas y tareas</option>
                            <option value="assigned_to_me">Asignadas a mí (o a mi equipo)</option>
                            <option value="created_by_me">Creadas por mí</option>
                        </select>
                    </div>

                    {/* Technician EDIS Filter */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Técnico/a EDIS
                        </label>
                        <select
                            value={selectedTechnicianId}
                            onChange={(e) => setSelectedTechnicianId(e.target.value)}
                            className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="all">Todos los técnicos</option>
                            {edisTechnicians.map(t => (
                                <option key={t.id} value={t.id}>
                                    👤 {t.name} {t.id === currentUser.id ? '(Tú)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Case Filter */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Filtrar por Caso
                        </label>
                        <select
                            value={selectedCaseId}
                            onChange={(e) => setSelectedCaseId(e.target.value)}
                            className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="all">Todos los casos y generales</option>
                            <option value="general">📋 General / Sin caso</option>
                            {cases.map(c => (
                                <option key={c.id} value={c.id}>
                                    📁 {c.name} {c.nickname ? `(${c.nickname})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Color Filter (For Notes) */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Color de Nota
                        </label>
                        <div className="flex items-center gap-1.5 py-1">
                            <button
                                onClick={() => setSelectedColor('all')}
                                className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                                    selectedColor === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Cualquiera
                            </button>
                            <button
                                onClick={() => setSelectedColor('yellow')}
                                className={`w-6 h-6 rounded-full bg-yellow-200 border transition-all ${
                                    selectedColor === 'yellow' ? 'ring-2 ring-slate-800 scale-110 border-slate-700' : 'border-transparent hover:scale-105'
                                }`}
                                title="Amarillo"
                            />
                            <button
                                onClick={() => setSelectedColor('pink')}
                                className={`w-6 h-6 rounded-full bg-pink-200 border transition-all ${
                                    selectedColor === 'pink' ? 'ring-2 ring-slate-800 scale-110 border-slate-700' : 'border-transparent hover:scale-105'
                                }`}
                                title="Rosa"
                            />
                            <button
                                onClick={() => setSelectedColor('blue')}
                                className={`w-6 h-6 rounded-full bg-blue-200 border transition-all ${
                                    selectedColor === 'blue' ? 'ring-2 ring-slate-800 scale-110 border-slate-700' : 'border-transparent hover:scale-105'
                                }`}
                                title="Azul"
                            />
                            <button
                                onClick={() => setSelectedColor('green')}
                                className={`w-6 h-6 rounded-full bg-green-200 border transition-all ${
                                    selectedColor === 'green' ? 'ring-2 ring-slate-800 scale-110 border-slate-700' : 'border-transparent hover:scale-105'
                                }`}
                                title="Verde"
                            />
                        </div>
                    </div>
                </div>

                {/* Filter Summary & Reset Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">
                            Mostrando {totalItemsCount} elemento{totalItemsCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>{totalNotesCount} notas</span>
                        <span className="text-slate-400">•</span>
                        <span>{totalTasksCount} tareas</span>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="text-teal-600 hover:text-teal-800 font-semibold hover:underline flex items-center gap-1"
                        >
                            <IoCloseCircleOutline className="text-sm" /> Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* RESULTS LIST */}
            {filteredGroups.length === 0 ? (
                 <div className="text-center py-16 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 max-w-lg mx-auto">
                    <IoFilterOutline className="text-4xl text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-700">No se encontraron elementos</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {hasActiveFilters 
                            ? 'Prueba a ajustar o restablecer los filtros para ver más resultados.'
                            : 'No tienes notas ni tareas asignadas. ¡Crea una nueva!'}
                    </p>
                    <div className="flex justify-center gap-3 mt-4">
                        {hasActiveFilters && (
                            <button 
                                onClick={handleClearFilters} 
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                            >
                                Restablecer filtros
                            </button>
                        )}
                        <button 
                            onClick={() => handleOpenModal(null)} 
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            Crear nota o tarea
                        </button>
                    </div>
                 </div>
            ) : (
                <div className="space-y-8">
                    {filteredGroups.map(group => (
                        <div key={group.caseId || 'general'} className="bg-white/70 backdrop-blur-xs rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    {group.caseId ? (
                                        <span className="w-2.5 h-6 bg-teal-600 rounded-full"></span>
                                    ) : (
                                        <span className="w-2.5 h-6 bg-slate-400 rounded-full"></span>
                                    )}
                                    <span>{group.caseName}</span>
                                </h3>
                                
                                {group.caseId && onSelectCaseById && (
                                    <button
                                        onClick={() => onSelectCaseById(group.caseId!)}
                                        className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                                        title="Abrir ficha del caso"
                                    >
                                        <IoFolderOpenOutline className="text-sm" />
                                        <span>Ir al caso</span>
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {group.items.map(item => {
                                    const isTask = item.type === 'task';
                                    const baseClass = isTask 
                                        ? 'bg-white border-l-4 border-l-indigo-500 shadow-2xs' 
                                        : colorClasses[item.color || 'yellow'];

                                    // Creator and Assignee resolution
                                    const creatorProf = item.createdBy ? professionals.find(p => p.id === item.createdBy) : null;
                                    const isFromOther = item.createdBy && item.createdBy !== currentUser.id;
                                    
                                    const assignedProfs = (item.assignedTo || [])
                                        .map(id => professionals.find(p => p.id === id))
                                        .filter(Boolean) as Professional[];
                                    
                                    const isSentToOthers = item.createdBy === currentUser.id && 
                                        item.assignedTo && 
                                        item.assignedTo.length > 0 && 
                                        item.assignedTo.some(id => id !== currentUser.id);

                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`relative p-4 rounded-xl shadow-xs border border-slate-200/80 transition-all hover:shadow-md group flex flex-col justify-between ${baseClass} hover:z-10`}
                                        >
                                            {/* Top action buttons */}
                                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg p-1 shadow-xs z-10 border border-slate-200">
                                                {/* PASAR TAREA AL CUADERNO */}
                                                {isTask && (
                                                    <button 
                                                        onClick={() => handlePassTaskToNotebook(item)} 
                                                        className="p-1.5 hover:text-teal-700 text-slate-500 hover:bg-teal-50 rounded transition-colors" 
                                                        title="Pasar tarea al cuaderno de campo"
                                                    >
                                                        <IoJournalOutline className="text-base" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleOpenModal(item)} 
                                                    className="p-1.5 hover:text-blue-600 text-slate-500 hover:bg-blue-50 rounded transition-colors" 
                                                    title="Editar"
                                                >
                                                    <IoCreateOutline className="text-base" />
                                                </button>
                                                <button 
                                                    onClick={() => onDeleteItem(item.id!, item.type, item.caseId)} 
                                                    className="p-1.5 hover:text-red-600 text-slate-500 hover:bg-red-50 rounded transition-colors" 
                                                    title="Eliminar"
                                                >
                                                    <IoTrashOutline className="text-base" />
                                                </button>
                                            </div>

                                            <div>
                                                {/* Badges for Sender / Recipient */}
                                                <div className="mb-2.5 pr-14 flex flex-wrap items-center gap-1.5">
                                                    {isFromOther && (
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/80 text-teal-800 text-[11px] font-semibold border border-teal-200 shadow-2xs">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-teal-200 text-teal-900 flex items-center justify-center text-[8px] font-bold overflow-hidden">
                                                                {creatorProf?.avatar ? (
                                                                    <img src={creatorProf.avatar} alt={creatorProf.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{getInitials(creatorProf?.name || 'T')}</span>
                                                                )}
                                                            </div>
                                                            <span>De: {creatorProf?.name?.split(' ')[0] || 'Compañero'}</span>
                                                        </div>
                                                    )}

                                                    {isSentToOthers && (
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/80 text-indigo-800 text-[11px] font-semibold border border-indigo-200 shadow-2xs">
                                                            <IoSendOutline className="text-[10px]" />
                                                            <span>Para: {assignedProfs.map(p => p.name.split(' ')[0]).join(', ')}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content & Checkbox */}
                                                <div className="flex items-start gap-2.5">
                                                    {isTask && (
                                                        <button 
                                                            onClick={() => onToggleTask(item.id!, item.caseId)}
                                                            className={`mt-0.5 flex-shrink-0 text-xl transition-colors ${item.isCompleted ? 'text-teal-600' : 'text-slate-300 hover:text-teal-500'}`}
                                                            title={item.isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                                                        >
                                                            {item.isCompleted ? <IoCheckbox /> : <IoSquareOutline />}
                                                        </button>
                                                    )}
                                                    <p className={`whitespace-pre-wrap text-sm text-slate-800 leading-relaxed break-words ${isTask && item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                                                        {item.content}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Bottom Card Footer with Pass to Notebook Quick Action & Avatars */}
                                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-black/5 text-xs">
                                                {isTask ? (
                                                    <button
                                                        onClick={() => handlePassTaskToNotebook(item)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline transition-colors"
                                                        title="Pasar tarea al cuaderno de campo"
                                                    >
                                                        <IoJournalOutline className="text-xs" />
                                                        <span>Pasar a cuaderno</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 font-medium">Nota adhesiva</span>
                                                )}

                                                {/* Assigned Technicians Avatars */}
                                                {assignedProfs.length > 0 && (
                                                    <div className="flex -space-x-1 pl-2">
                                                        {assignedProfs.map(p => (
                                                            <div 
                                                                key={p.id} 
                                                                className="w-5 h-5 rounded-full bg-white text-slate-700 flex items-center justify-center font-bold text-[9px] border border-slate-200 overflow-hidden shadow-2xs" 
                                                                title={`Asignado a: ${p.name}`}
                                                            >
                                                                {p.avatar ? (
                                                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{getInitials(p.name)}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => handleOpenModal(null)}
                className="fixed bottom-8 right-8 z-40 bg-teal-600 text-white px-5 py-3 rounded-full hover:bg-teal-700 font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                title="Añadir nueva nota o tarea"
            >
                <IoAddOutline className="text-2xl" />
                <span className="hidden sm:inline">Añadir Nota o Tarea</span>
            </button>

            {/* Unified Note / Task Editor Modal */}
            <UnifiedNoteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onSaveItem}
                initialData={editingItem}
                cases={cases}
                professionals={professionals}
                currentUser={currentUser}
            />

            {/* Modal to Select Case when passing General Task to Notebook */}
            {taskForNotebook && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <IoJournalOutline className="text-teal-600 text-xl" />
                                Pasar Tarea al Cuaderno
                            </h3>
                            <button
                                onClick={() => setTaskForNotebook(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                            >
                                <IoCloseOutline className="text-2xl" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-600">
                            Esta tarea es general y no tiene caso asociado. Selecciona el caso en cuyo cuaderno de campo deseas registrar la actuación:
                        </p>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 mb-1">Tarea a convertir:</p>
                            <p className="text-sm font-semibold text-slate-800">"{taskForNotebook.task.text}"</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                Seleccionar Caso Destino:
                            </label>
                            <select
                                value={targetCaseForNotebook}
                                onChange={(e) => setTargetCaseForNotebook(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 bg-slate-50 text-slate-900 border-slate-300 focus:ring-teal-500"
                            >
                                {cases.map(c => (
                                    <option key={c.id} value={c.id}>
                                        📁 {c.name} {c.nickname ? `(${c.nickname})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setTaskForNotebook(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmPassGeneralTask}
                                disabled={!targetCaseForNotebook}
                                className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                            >
                                <IoJournalOutline />
                                Continuar al Cuaderno
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllNotesView;
