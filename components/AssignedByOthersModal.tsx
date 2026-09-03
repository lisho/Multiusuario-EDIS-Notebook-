import React, { useState, useMemo, useEffect } from 'react';
import { Case, Task, MyNote, Professional, User, DashboardView } from '../types';
import { 
    IoCloseOutline, 
    IoPersonAddOutline, 
    IoCheckboxOutline, 
    IoJournalOutline, 
    IoCheckmarkCircleOutline,
    IoArrowForwardOutline,
    IoTimeOutline,
    IoFilterOutline,
    IoFolderOpenOutline,
    IoSendOutline,
    IoCheckmarkDoneCircleOutline
} from 'react-icons/io5';
import TechnicianAvatar from './TechnicianAvatar';

export interface AssignedTaskItem {
    type: 'task';
    task: Task;
    caseData: Case | null;
    caseId: string | null;
    creator: Professional | undefined;
}

export interface AssignedNoteItem {
    type: 'note';
    note: MyNote;
    caseData: Case | null;
    caseId: string | null;
    creator: Professional | undefined;
}

export interface DelegatedTaskItem {
    type: 'task';
    task: Task;
    caseData: Case | null;
    caseId: string | null;
    assignees: Professional[];
}

export interface DelegatedNoteItem {
    type: 'note';
    note: MyNote;
    caseData: Case | null;
    caseId: string | null;
    assignees: Professional[];
}

export type AssignedItem = AssignedTaskItem | AssignedNoteItem;
export type DelegatedItem = DelegatedTaskItem | DelegatedNoteItem;

interface AssignedByOthersModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignedTasks: AssignedTaskItem[];
    assignedNotes: AssignedNoteItem[];
    delegatedTasks?: DelegatedTaskItem[];
    delegatedNotes?: DelegatedNoteItem[];
    initialTab?: 'received' | 'delegated';
    professionals: Professional[];
    currentUser: User;
    onToggleTask: (caseId: string, taskId: string) => void;
    onToggleGeneralTask: (taskId: string) => void;
    onSelectCaseById: (caseId: string, view?: DashboardView) => void;
    onOpenTasksPanel: (caseData?: Case) => void;
    onOpenNotesPanel: () => void;
}

const noteColorClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-950', badge: 'bg-amber-100 text-amber-800' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-950', badge: 'bg-pink-100 text-pink-800' },
    blue: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-950', badge: 'bg-sky-100 text-sky-800' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-950', badge: 'bg-emerald-100 text-emerald-800' },
};

const AssignedByOthersModal: React.FC<AssignedByOthersModalProps> = ({
    isOpen,
    onClose,
    assignedTasks,
    assignedNotes,
    delegatedTasks = [],
    delegatedNotes = [],
    initialTab = 'received',
    professionals,
    currentUser,
    onToggleTask,
    onToggleGeneralTask,
    onSelectCaseById,
    onOpenTasksPanel,
    onOpenNotesPanel,
}) => {
    const [activeDirectionTab, setActiveDirectionTab] = useState<'received' | 'delegated'>(initialTab);
    const [filterType, setFilterType] = useState<'all' | 'tasks' | 'notes'>('all');
    const [filterTargetUserId, setFilterTargetUserId] = useState<string>('all');
    const [showCompletedTasks, setShowCompletedTasks] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveDirectionTab(initialTab);
            setFilterType('all');
            setFilterTargetUserId('all');
            setShowCompletedTasks(false);
        }
    }, [isOpen, initialTab]);

    // Received Items stats
    const pendingReceivedTasks = assignedTasks.filter(item => !item.task.completed);
    const completedReceivedTasks = assignedTasks.filter(item => item.task.completed);

    // Delegated Items stats
    const pendingDelegatedTasks = delegatedTasks.filter(item => !item.task.completed);
    const completedDelegatedTasks = delegatedTasks.filter(item => item.task.completed);

    // Unique list of colleagues for filter
    const receivedAssigners = Array.from(
        new Set([
            ...assignedTasks.map(t => t.task.createdBy).filter(Boolean),
            ...assignedNotes.map(n => n.note.createdBy).filter(Boolean),
        ])
    )
        .filter(id => id !== currentUser.id)
        .map(id => professionals.find(p => p.id === id))
        .filter(Boolean) as Professional[];

    const delegatedAssignees = Array.from(
        new Set([
            ...delegatedTasks.flatMap(t => t.task.assignedTo || []),
            ...delegatedNotes.flatMap(n => n.note.assignedTo || []),
        ])
    )
        .filter(id => id !== currentUser.id)
        .map(id => professionals.find(p => p.id === id))
        .filter(Boolean) as Professional[];

    // Filtered Items depending on active direction tab
    const filteredItems = useMemo(() => {
        if (activeDirectionTab === 'received') {
            const items: AssignedItem[] = [];
            if (filterType === 'all' || filterType === 'tasks') {
                const tasksToInclude = showCompletedTasks ? assignedTasks : pendingReceivedTasks;
                tasksToInclude.forEach(t => items.push(t));
            }
            if (filterType === 'all' || filterType === 'notes') {
                assignedNotes.forEach(n => items.push(n));
            }

            let result = items;
            if (filterTargetUserId !== 'all') {
                result = result.filter(item => {
                    const creatorId = item.type === 'task' ? item.task.createdBy : item.note.createdBy;
                    return creatorId === filterTargetUserId;
                });
            }
            return result;
        } else {
            const items: DelegatedItem[] = [];
            if (filterType === 'all' || filterType === 'tasks') {
                const tasksToInclude = showCompletedTasks ? delegatedTasks : pendingDelegatedTasks;
                tasksToInclude.forEach(t => items.push(t));
            }
            if (filterType === 'all' || filterType === 'notes') {
                delegatedNotes.forEach(n => items.push(n));
            }

            let result = items;
            if (filterTargetUserId !== 'all') {
                result = result.filter(item => {
                    const assignedList = item.type === 'task' ? item.task.assignedTo : item.note.assignedTo;
                    return assignedList?.includes(filterTargetUserId);
                });
            }
            return result;
        }
    }, [
        activeDirectionTab,
        filterType,
        filterTargetUserId,
        showCompletedTasks,
        assignedTasks,
        pendingReceivedTasks,
        assignedNotes,
        delegatedTasks,
        pendingDelegatedTasks,
        delegatedNotes
    ]);

    const timeSinceSpanish = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'hace momentos';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `hace ${days}d`;
    };

    const handleTaskCheck = (item: AssignedTaskItem | DelegatedTaskItem) => {
        if (item.caseId) {
            onToggleTask(item.caseId, item.task.id);
        } else {
            onToggleGeneralTask(item.task.id);
        }
    };

    const handleGoToCase = (caseId: string) => {
        onSelectCaseById(caseId);
        onClose();
    };

    const totalReceivedPending = pendingReceivedTasks.length + assignedNotes.length;
    const totalDelegatedPending = pendingDelegatedTasks.length + delegatedNotes.length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${activeDirectionTab === 'received' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'} shadow-xs`}>
                            {activeDirectionTab === 'received' ? <IoPersonAddOutline className="text-2xl" /> : <IoSendOutline className="text-2xl" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {activeDirectionTab === 'received' ? 'Asignaciones Recibidas' : 'Tareas Asignadas a Otros'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {activeDirectionTab === 'received' 
                                    ? 'Tareas y notas asignadas a ti por otros compañeros' 
                                    : 'Tareas y notas que has delegado a otros miembros del equipo'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Cerrar modal"
                    >
                        <IoCloseOutline className="text-2xl" />
                    </button>
                </div>

                {/* Primary Tabs: Recibidas vs Asignadas a otros */}
                <div className="flex border-b border-slate-200 bg-slate-100/80 px-6 pt-2">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveDirectionTab('received');
                            setFilterTargetUserId('all');
                        }}
                        className={`py-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeDirectionTab === 'received'
                                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <IoPersonAddOutline className="text-sm" />
                        <span>Recibidas (De otros a mí)</span>
                        <span className={`text-[11px] px-2 py-0.2 rounded-full font-semibold ${
                            activeDirectionTab === 'received' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {totalReceivedPending}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveDirectionTab('delegated');
                            setFilterTargetUserId('all');
                        }}
                        className={`py-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeDirectionTab === 'delegated'
                                ? 'border-amber-600 text-amber-800 bg-white rounded-t-lg shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <IoSendOutline className="text-sm" />
                        <span>Delegadas (De mí a otros)</span>
                        <span className={`text-[11px] px-2 py-0.2 rounded-full font-semibold ${
                            activeDirectionTab === 'delegated' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {totalDelegatedPending}
                        </span>
                    </button>
                </div>

                {/* Filter and stats bar */}
                <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm">
                    {/* Type Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                filterType === 'all' 
                                    ? 'bg-indigo-600 text-white shadow-xs' 
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            Todo ({activeDirectionTab === 'received' 
                                ? pendingReceivedTasks.length + assignedNotes.length 
                                : pendingDelegatedTasks.length + delegatedNotes.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('tasks')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                                filterType === 'tasks' 
                                    ? 'bg-indigo-600 text-white shadow-xs' 
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <IoCheckboxOutline />
                            Tareas ({activeDirectionTab === 'received' ? pendingReceivedTasks.length : pendingDelegatedTasks.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('notes')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                                filterType === 'notes' 
                                    ? 'bg-indigo-600 text-white shadow-xs' 
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <IoJournalOutline />
                            Notas ({activeDirectionTab === 'received' ? assignedNotes.length : delegatedNotes.length})
                        </button>
                    </div>

                    {/* Filter by assigner/assignee & toggle completed */}
                    <div className="flex items-center gap-3">
                        {activeDirectionTab === 'received' && receivedAssigners.length > 1 && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <IoFilterOutline className="text-slate-400" />
                                <span>De:</span>
                                <select
                                    value={filterTargetUserId}
                                    onChange={(e) => setFilterTargetUserId(e.target.value)}
                                    className="text-xs bg-white border border-slate-200 rounded-md py-1 px-2 text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="all">Todos los compañeros</option>
                                    {receivedAssigners.map(prof => (
                                        <option key={prof.id} value={prof.id}>{prof.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {activeDirectionTab === 'delegated' && delegatedAssignees.length > 1 && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <IoFilterOutline className="text-slate-400" />
                                <span>Para:</span>
                                <select
                                    value={filterTargetUserId}
                                    onChange={(e) => setFilterTargetUserId(e.target.value)}
                                    className="text-xs bg-white border border-slate-200 rounded-md py-1 px-2 text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="all">Todos los asignados</option>
                                    {delegatedAssignees.map(prof => (
                                        <option key={prof.id} value={prof.id}>{prof.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {filterType !== 'notes' && (
                            (activeDirectionTab === 'received' ? completedReceivedTasks.length > 0 : completedDelegatedTasks.length > 0) && (
                                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={showCompletedTasks}
                                        onChange={(e) => setShowCompletedTasks(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                    />
                                    <span>
                                        Ver completadas ({activeDirectionTab === 'received' ? completedReceivedTasks.length : completedDelegatedTasks.length})
                                    </span>
                                </label>
                            )
                        )}
                    </div>
                </div>

                {/* Items List */}
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3.5">
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item) => {
                            if (item.type === 'task') {
                                const isCompleted = item.task.completed;
                                const isReceived = activeDirectionTab === 'received';
                                const assignedProfs = isReceived 
                                    ? [] 
                                    : (item as DelegatedTaskItem).assignees;

                                return (
                                    <div
                                        key={`task-${item.task.id}`}
                                        className={`p-4 rounded-xl border transition-all ${
                                            isCompleted 
                                                ? 'bg-slate-50/70 border-slate-200 opacity-60' 
                                                : 'bg-white border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleTaskCheck(item)}
                                                    className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    title={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isCompleted}
                                                        onChange={() => handleTaskCheck(item)}
                                                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </button>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                                            {item.task.text}
                                                        </p>
                                                        {!isReceived && (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                isCompleted 
                                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                                    : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {isCompleted ? '✓ Completada por el técnico' : '⏳ Pendiente de realización'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Context badges */}
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        {item.caseData ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleGoToCase(item.caseData!.id)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
                                                                title="Ir al caso"
                                                            >
                                                                <IoFolderOpenOutline className="text-teal-600" />
                                                                <span>{item.caseData.name}{item.caseData.nickname ? ` (${item.caseData.nickname})` : ''}</span>
                                                                <IoArrowForwardOutline className="text-[10px]" />
                                                            </button>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                                <IoCheckboxOutline className="text-slate-500" />
                                                                <span>Tarea General</span>
                                                            </span>
                                                        )}

                                                        {isReceived && (item as AssignedTaskItem).creator && (
                                                            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-900 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                                                <TechnicianAvatar professional={(item as AssignedTaskItem).creator!} size="sm" />
                                                                <span>Asignada por: <strong>{(item as AssignedTaskItem).creator!.name}</strong></span>
                                                            </div>
                                                        )}

                                                        {!isReceived && assignedProfs.length > 0 && (
                                                            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                                <div className="flex -space-x-1">
                                                                    {assignedProfs.map(p => (
                                                                        <TechnicianAvatar key={p.id} professional={p} size="sm" />
                                                                    ))}
                                                                </div>
                                                                <span>Delegada a: <strong>{assignedProfs.map(p => p.name).join(', ')}</strong></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {item.caseData && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleGoToCase(item.caseData!.id)}
                                                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline flex-shrink-0 cursor-pointer"
                                                >
                                                    Abrir caso &rarr;
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            if (item.type === 'note') {
                                const isReceived = activeDirectionTab === 'received';
                                const color = item.note.color || 'yellow';
                                const colorStyle = noteColorClasses[color] || noteColorClasses.yellow;
                                const assignedProfs = isReceived ? [] : (item as DelegatedNoteItem).assignees;

                                return (
                                    <div
                                        key={`note-${item.note.id}`}
                                        className={`p-4 rounded-xl border ${colorStyle.bg} ${colorStyle.border} shadow-xs hover:shadow-sm transition-all`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colorStyle.badge}`}>
                                                        {isReceived ? 'Nota asignada a ti' : 'Nota compartida por ti'}
                                                    </span>
                                                    {item.note.createdAt && (
                                                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                                            <IoTimeOutline className="text-xs" />
                                                            {timeSinceSpanish(item.note.createdAt)}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className={`text-sm ${colorStyle.text} whitespace-pre-wrap leading-relaxed`}>
                                                    {item.note.content}
                                                </p>

                                                {/* Context badges */}
                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    {item.caseData ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGoToCase(item.caseData!.id)}
                                                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-teal-800 border border-teal-200 hover:bg-white transition-colors cursor-pointer"
                                                            title="Ir al caso"
                                                        >
                                                            <IoFolderOpenOutline className="text-teal-600" />
                                                            <span>{item.caseData.name}{item.caseData.nickname ? ` (${item.caseData.nickname})` : ''}</span>
                                                            <IoArrowForwardOutline className="text-[10px]" />
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-slate-700 border border-slate-200">
                                                            <IoJournalOutline className="text-slate-500" />
                                                            <span>Nota General</span>
                                                        </span>
                                                    )}

                                                    {isReceived && (item as AssignedNoteItem).creator && (
                                                        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-900 bg-white/80 border border-indigo-100 px-2 py-0.5 rounded-full">
                                                            <TechnicianAvatar professional={(item as AssignedNoteItem).creator!} size="sm" />
                                                            <span>Creada por: <strong>{(item as AssignedNoteItem).creator!.name}</strong></span>
                                                        </div>
                                                    )}

                                                    {!isReceived && assignedProfs.length > 0 && (
                                                        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-900 bg-white/80 border border-amber-200 px-2 py-0.5 rounded-full">
                                                            <div className="flex -space-x-1">
                                                                {assignedProfs.map(p => (
                                                                    <TechnicianAvatar key={p.id} professional={p} size="sm" />
                                                                ))}
                                                            </div>
                                                            <span>Enviada a: <strong>{assignedProfs.map(p => p.name).join(', ')}</strong></span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                {item.caseData ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGoToCase(item.caseData!.id)}
                                                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline cursor-pointer"
                                                    >
                                                        Abrir caso &rarr;
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onOpenNotesPanel();
                                                            onClose();
                                                        }}
                                                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline cursor-pointer"
                                                    >
                                                        Ver en panel &rarr;
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return null;
                        })
                    ) : (
                        <div className="text-center py-12 px-4">
                            <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-600 mb-3">
                                <IoCheckmarkCircleOutline className="text-3xl" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-800">
                                {activeDirectionTab === 'received' ? 'No tienes asignaciones pendientes' : 'No tienes tareas delegadas pendientes'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                {activeDirectionTab === 'received'
                                    ? 'No tienes tareas ni notas pendientes asignadas por otros compañeros con los filtros seleccionados.'
                                    : 'No tienes tareas ni notas pendientes asignadas a otros compañeros de equipo con los filtros seleccionados.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                onOpenTasksPanel();
                                onClose();
                            }}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                        >
                            <IoCheckboxOutline /> Abrir panel de tareas
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                            type="button"
                            onClick={() => {
                                onOpenNotesPanel();
                                onClose();
                            }}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                        >
                            <IoJournalOutline /> Abrir panel de notas
                        </button>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="py-2 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignedByOthersModal;
