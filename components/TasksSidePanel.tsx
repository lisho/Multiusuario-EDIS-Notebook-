import React, { useState, useMemo, useEffect } from 'react';
import { Case, Task, Professional, ProfessionalRole, DashboardView, User, MyNote } from '../types';
import { 
    IoCloseOutline, 
    IoAddOutline, 
    IoTrashOutline, 
    IoArrowRedoOutline, 
    IoChevronForwardCircleOutline, 
    IoPencilOutline,
    IoCheckmarkOutline,
    IoSearchOutline,
    IoPersonOutline,
    IoPeopleOutline,
    IoCheckmarkCircle,
    IoDocumentTextOutline,
    IoListOutline,
    IoFolderOpenOutline
} from 'react-icons/io5';
import TechnicianAvatar from './TechnicianAvatar';

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

// Color configurations for sticky notes
const noteColorClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    yellow: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-950', badge: 'bg-amber-200 text-amber-900' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-950', badge: 'bg-pink-200 text-pink-900' },
    blue: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-950', badge: 'bg-sky-200 text-sky-900' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-950', badge: 'bg-emerald-200 text-emerald-900' },
};

const colorPills: { id: 'yellow' | 'pink' | 'blue' | 'green'; bg: string; label: string }[] = [
    { id: 'yellow', bg: 'bg-amber-300', label: 'Amarillo' },
    { id: 'pink', bg: 'bg-pink-300', label: 'Rosa' },
    { id: 'blue', bg: 'bg-sky-300', label: 'Azul' },
    { id: 'green', bg: 'bg-emerald-300', label: 'Verde' },
];

/**
 * Reusable component for selecting / assigning professionals
 */
interface ProfessionalAssignSelectorProps {
    professionals: Professional[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    currentUser: User | null;
    label?: string;
    compact?: boolean;
}

const ProfessionalAssignSelector: React.FC<ProfessionalAssignSelectorProps> = ({
    professionals,
    selectedIds,
    onChange,
    currentUser,
    label = "Asignar a:",
    compact = false
}) => {
    const handleToggleId = (id: string) => {
        if (selectedIds.includes(id)) {
            const next = selectedIds.filter(item => item !== id);
            onChange(next.length > 0 ? next : (currentUser ? [currentUser.id] : []));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const handleSelectOnlyMe = () => {
        if (currentUser) {
            onChange([currentUser.id]);
        }
    };

    const handleSelectAll = () => {
        onChange(professionals.map(p => p.id));
    };

    const isAllSelected = professionals.length > 0 && selectedIds.length === professionals.length;
    const isOnlyMeSelected = currentUser && selectedIds.length === 1 && selectedIds[0] === currentUser.id;

    return (
        <div className="space-y-1.5 w-full">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                    <IoPersonOutline className="text-xs text-teal-600" />
                    {label}
                </span>
                <div className="flex items-center gap-1">
                    {currentUser && (
                        <button
                            type="button"
                            onClick={handleSelectOnlyMe}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                isOnlyMeSelected
                                    ? 'bg-teal-100 text-teal-800 border-teal-300 font-semibold'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                        >
                            Solo a mí
                        </button>
                    )}
                    {professionals.length > 1 && (
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                isAllSelected
                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                        >
                            Todos los técnicos
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {professionals.map(p => {
                    const isSelected = selectedIds.includes(p.id);
                    const isMe = currentUser && p.id === currentUser.id;
                    const firstName = p.name.split(' ')[0];

                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => handleToggleId(p.id)}
                            title={`${p.name}${isMe ? ' (Tú)' : ''}`}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all border ${
                                isSelected
                                    ? 'bg-teal-50 border-teal-500 text-teal-900 font-medium shadow-2xs ring-1 ring-teal-400'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <div className="w-4 h-4 rounded-full bg-teal-200 text-teal-900 flex items-center justify-center font-bold text-[8px] overflow-hidden flex-shrink-0">
                                {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(p.name)
                                )}
                            </div>
                            <span className="truncate max-w-[90px]">{isMe ? `${firstName} (Tú)` : firstName}</span>
                            {isSelected && (
                                <IoCheckmarkCircle className="text-teal-600 text-xs flex-shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

interface TaskItemProps {
    task: Task;
    onToggle: () => void;
    onDelete: () => void;
    onConvertToEntry: () => void;
    onUpdate: (updatedTask: Task, targetCaseId: string | null) => void;
    professionals: Professional[];
    currentUser: User | null;
    caseName?: string;
    onSelectCase?: () => void;
    allCases?: Case[];
    currentCaseId?: string | null;
}

const TaskItem: React.FC<TaskItemProps> = ({ 
    task, 
    onToggle, 
    onDelete, 
    onConvertToEntry, 
    onUpdate, 
    professionals, 
    currentUser,
    caseName, 
    onSelectCase,
    allCases = [],
    currentCaseId = null
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const [editAssignedTo, setEditAssignedTo] = useState<string[]>(task.assignedTo || (currentUser ? [currentUser.id] : []));
    const [editCaseId, setEditCaseId] = useState<string>(currentCaseId || '');

    const assignedProfs = (task.assignedTo || [])
        .map(id => professionals.find(p => p.id === id))
        .filter(Boolean) as Professional[];

    const creatorProf = task.createdBy ? professionals.find(p => p.id === task.createdBy) : null;
    const isFromOther = currentUser && task.createdBy && task.createdBy !== currentUser.id;
        
    const handleSaveEdit = () => {
        if (editText.trim()) {
            const targetCase = editCaseId.trim() ? editCaseId.trim() : null;
            onUpdate({ 
                ...task, 
                text: editText.trim(),
                assignedTo: editAssignedTo.length > 0 ? editAssignedTo : (currentUser ? [currentUser.id] : [])
            }, targetCase);
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="p-3 bg-white rounded-lg border-2 border-teal-500 shadow-md space-y-2.5">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={onToggle}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0"
                    />
                    <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); }
                            if (e.key === 'Escape') setIsEditing(false);
                        }}
                        className="flex-grow text-sm text-slate-800 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        autoFocus
                        placeholder="Descripción de la tarea..."
                    />
                </div>

                {allCases.length > 0 && (
                    <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                            <IoFolderOpenOutline className="text-xs text-teal-600" />
                            Asignar a caso:
                        </label>
                        <select
                            value={editCaseId}
                            onChange={(e) => setEditCaseId(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        >
                            <option value="">📋 Tarea General (Sin caso asociado)</option>
                            {allCases.map(c => (
                                <option key={c.id} value={c.id}>
                                    📁 {c.name} {c.nickname ? `(${c.nickname})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                    <ProfessionalAssignSelector
                        professionals={professionals}
                        selectedIds={editAssignedTo}
                        onChange={setEditAssignedTo}
                        currentUser={currentUser}
                        label="Reasignar a:"
                    />
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-xs px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="text-xs px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 font-semibold flex items-center gap-1"
                    >
                        <IoCheckmarkOutline className="text-sm" /> Guardar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all group">
            <input
                type="checkbox"
                checked={task.completed}
                onChange={onToggle}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0"
            />
            <div className="flex-grow min-w-0">
                <p className={`text-sm text-slate-800 break-words ${task.completed ? 'line-through text-slate-400' : ''}`}>
                    {task.text}
                </p>
                
                {/* Meta info: case, creator & assignees */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {caseName && (
                        <button 
                            onClick={onSelectCase} 
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded transition-colors"
                        >
                            📁 {caseName}
                        </button>
                    )}

                    {isFromOther && creatorProf && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            De: {creatorProf.name.split(' ')[0]}
                        </span>
                    )}

                    {assignedProfs.length > 0 && (
                        <div className="flex items-center gap-1 pl-1">
                            <span className="text-[10px] text-slate-400 font-medium">Para:</span>
                            <div className="flex -space-x-1 items-center">
                                {assignedProfs.map(p => (
                                    <TechnicianAvatar
                                        key={p.id}
                                        professional={p}
                                        size="xs"
                                        prefix="Asignado/a a:"
                                        tooltipPosition="top"
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] text-slate-600 font-medium truncate max-w-[120px]">
                                {assignedProfs.map(p => p.name.split(' ')[0]).join(', ')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => {
                        setEditText(task.text);
                        setEditAssignedTo(task.assignedTo || (currentUser ? [currentUser.id] : []));
                        setEditCaseId(currentCaseId || '');
                        setIsEditing(true);
                    }} 
                    className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50" 
                    title="Editar, asignar caso y reasignar tarea"
                >
                    <IoPencilOutline className="text-sm" />
                </button>
                {!task.completed && onConvertToEntry && (
                    <button 
                        onClick={onConvertToEntry} 
                        className="p-1 text-slate-400 hover:text-teal-600 rounded hover:bg-teal-50" 
                        title="Convertir en Entrada de Cuaderno"
                    >
                        <IoArrowRedoOutline className="text-sm" />
                    </button>
                )}
                <button 
                    onClick={onDelete} 
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50" 
                    title="Eliminar Tarea"
                >
                    <IoTrashOutline className="text-sm" />
                </button>
            </div>
        </div>
    );
};

interface NoteItemProps {
    note: MyNote;
    caseId: string | null;
    onUpdate: (updatedNote: MyNote, targetCaseId?: string | null) => void;
    onDelete: () => void;
    professionals?: Professional[];
    currentUser?: User | null;
    caseName?: string;
    onSelectCase?: () => void;
    allCases?: Case[];
}

const NoteItem: React.FC<NoteItemProps> = ({ 
    note, 
    caseId, 
    onUpdate, 
    onDelete, 
    professionals = [], 
    currentUser,
    caseName,
    onSelectCase,
    allCases = []
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(note.content);
    const [editColor, setEditColor] = useState<'yellow' | 'pink' | 'blue' | 'green'>(note.color || 'yellow');
    const [editAssignedTo, setEditAssignedTo] = useState<string[]>(note.assignedTo || (currentUser ? [currentUser.id] : []));
    const [editCaseId, setEditCaseId] = useState<string>(caseId || '');

    const colorConfig = noteColorClasses[note.color || 'yellow'] || noteColorClasses.yellow;

    const creatorProf = note.createdBy ? professionals.find(p => p.id === note.createdBy) : null;
    const isFromOther = currentUser && note.createdBy && note.createdBy !== currentUser.id;
    
    const assignedProfs = (note.assignedTo || [])
        .map(id => professionals.find(p => p.id === id))
        .filter(Boolean) as Professional[];

    const isSentToOthers = currentUser && note.createdBy === currentUser.id && 
        note.assignedTo && 
        note.assignedTo.length > 0 && 
        note.assignedTo.some(id => id !== currentUser.id);

    const handleSave = () => {
        if (editText.trim()) {
            onUpdate({
                ...note,
                content: editText.trim(),
                color: editColor,
                assignedTo: editAssignedTo.length > 0 ? editAssignedTo : (currentUser ? [currentUser.id] : [])
            }, editCaseId || null);
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className={`p-3 rounded-lg border-2 shadow-sm space-y-2.5 ${noteColorClasses[editColor]?.bg || 'bg-amber-50'} ${noteColorClasses[editColor]?.border || 'border-amber-300'}`}>
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full text-sm bg-white/90 border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none text-slate-900"
                    rows={3}
                    autoFocus
                    placeholder="Escribe la nota..."
                />

                <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <IoFolderOpenOutline className="text-xs text-teal-600" />
                        Asociar al caso:
                    </label>
                    <select
                        value={editCaseId}
                        onChange={(e) => setEditCaseId(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                        <option value="">📌 General / Sin caso</option>
                        {allCases.map(c => (
                            <option key={c.id} value={c.id}>
                                📁 {c.name} {c.nickname ? `(${c.nickname})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-700">Color:</span>
                    <div className="flex items-center gap-1.5">
                        {colorPills.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setEditColor(p.id)}
                                className={`w-5 h-5 rounded-full ${p.bg} border transition-transform ${editColor === p.id ? 'ring-2 ring-slate-800 scale-110 border-slate-700' : 'border-transparent hover:scale-105'}`}
                                title={p.label}
                            />
                        ))}
                    </div>
                </div>

                <div className="pt-2 border-t border-black/10">
                    <ProfessionalAssignSelector
                        professionals={professionals}
                        selectedIds={editAssignedTo}
                        onChange={setEditAssignedTo}
                        currentUser={currentUser}
                        label="Reasignar nota a:"
                    />
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-black/10">
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-xs px-2.5 py-1 text-slate-700 hover:bg-black/5 rounded font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="text-xs px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 font-semibold flex items-center gap-1"
                    >
                        <IoCheckmarkOutline className="text-sm" /> Guardar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-3 rounded-lg border shadow-2xs transition-all group ${colorConfig.bg} ${colorConfig.border}`}>
            {/* Header info with sender / recipient badges */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <div className="flex flex-wrap items-center gap-1">
                    {isFromOther && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/90 text-teal-800 text-[10px] font-semibold shadow-2xs">
                            <TechnicianAvatar
                                professional={creatorProf || { name: 'Compañero/a' }}
                                size="xs"
                                prefix="De:"
                                tooltipPosition="top"
                            />
                            De: {creatorProf?.name?.split(' ')[0] || 'Compañero/a'}
                        </span>
                    )}
                    {isSentToOthers && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/90 text-indigo-800 text-[10px] font-semibold shadow-2xs">
                            Para: {assignedProfs.map(p => p.name.split(' ')[0]).join(', ')}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => {
                            setEditText(note.content);
                            setEditColor(note.color || 'yellow');
                            setEditAssignedTo(note.assignedTo || (currentUser ? [currentUser.id] : []));
                            setIsEditing(true);
                        }}
                        className="p-1 text-slate-600 hover:text-blue-600 rounded bg-white/80 hover:bg-white shadow-2xs"
                        title="Editar y reasignar nota"
                    >
                        <IoPencilOutline className="text-xs" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1 text-slate-600 hover:text-red-600 rounded bg-white/80 hover:bg-white shadow-2xs"
                        title="Eliminar nota"
                    >
                        <IoTrashOutline className="text-xs" />
                    </button>
                </div>
            </div>

            <p className={`text-sm whitespace-pre-wrap ${colorConfig.text}`}>
                {note.content}
            </p>
            
            <div className="mt-2.5 pt-1.5 border-t border-black/5 flex justify-between items-center text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                    {assignedProfs.length > 0 && (
                        <div className="flex -space-x-1 items-center">
                            {assignedProfs.map(p => (
                                <TechnicianAvatar
                                    key={p.id}
                                    professional={p}
                                    size="xs"
                                    prefix="Destinatario:"
                                    tooltipPosition="top"
                                />
                            ))}
                        </div>
                    )}
                </div>
                {note.createdAt && (
                    <span className="font-mono text-[10px] text-slate-400">
                        {new Date(note.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                )}
            </div>
        </div>
    );
};

interface TasksSidePanelProps {
    mode: 'closed' | 'single' | 'all' | 'notes';
    caseData?: Case;
    allCases: Case[];
    generalTasks: Task[];
    generalNotes?: MyNote[];
    professionals: Professional[];
    onClose: () => void;
    onAddTask: (caseId: string | null, taskText: string, assignedTo?: string[]) => void;
    onToggleTask: (caseId: string, taskId: string) => void;
    onDeleteTask: (caseId: string, taskId: string) => void;
    onUpdateTask: (caseId: string, updatedTask: Task) => void;
    onToggleGeneralTask: (taskId: string) => void;
    onDeleteGeneralTask: (taskId: string) => void;
    onUpdateGeneralTask: (updatedTask: Task) => void;
    onTaskToEntry: (task: Task) => void;
    onSelectCaseById: (caseId: string, view: DashboardView) => void;
    currentUser: User | null;
    onDeleteNote?: (caseId: string | null, noteId: string) => void;
    onUpdateNote?: (caseId: string | null, note: MyNote) => void;
    onAddNote?: (caseId: string | null, content: string, color?: string, assignedTo?: string[]) => void;
    onUpdateTaskWithCase?: (originalCaseId: string | null, targetCaseId: string | null, updatedTask: Task) => void;
    onUpdateNoteWithCase?: (originalCaseId: string | null, targetCaseId: string | null, updatedNote: MyNote) => void;
}

const TasksSidePanel: React.FC<TasksSidePanelProps> = (props) => {
    const { 
        mode, 
        caseData, 
        allCases, 
        generalTasks, 
        generalNotes = [],
        professionals, 
        onClose, 
        onAddTask, 
        onToggleTask, 
        onDeleteTask, 
        onUpdateTask, 
        onToggleGeneralTask, 
        onDeleteGeneralTask, 
        onUpdateGeneralTask, 
        onTaskToEntry, 
        onSelectCaseById, 
        currentUser,
        onDeleteNote,
        onUpdateNote,
        onAddNote,
        onUpdateTaskWithCase,
        onUpdateNoteWithCase
    } = props;
    
    // Creation State
    const [newItemText, setNewItemText] = useState('');
    const [selectedTargetCaseId, setSelectedTargetCaseId] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<'yellow' | 'pink' | 'blue' | 'green'>('yellow');
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    
    // Strictly filter EDIS Technicians for task assignment
    const edisTechnicians = useMemo(() => {
        return professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
    }, [professionals]);

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
    const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'assigned_to_me' | 'assigned_to_others' | 'created_by_me'>('all');
    
    const isOpen = mode !== 'closed';

    const handleTaskUpdate = (originalCaseId: string | null, targetCaseId: string | null, updatedTask: Task) => {
        if (onUpdateTaskWithCase) {
            onUpdateTaskWithCase(originalCaseId, targetCaseId, updatedTask);
        } else if (originalCaseId === targetCaseId) {
            if (targetCaseId) {
                onUpdateTask(targetCaseId, updatedTask);
            } else {
                onUpdateGeneralTask(updatedTask);
            }
        } else {
            if (originalCaseId) {
                onDeleteTask(originalCaseId, updatedTask.id);
            } else {
                onDeleteGeneralTask(updatedTask.id);
            }
            onAddTask(targetCaseId, updatedTask.text, updatedTask.assignedTo);
        }
    };

    const handleNoteUpdate = (originalCaseId: string | null, targetCaseId: string | null, updatedNote: MyNote) => {
        if (onUpdateNoteWithCase) {
            onUpdateNoteWithCase(originalCaseId, targetCaseId, updatedNote);
        } else if (originalCaseId === targetCaseId) {
            if (onUpdateNote) onUpdateNote(targetCaseId, updatedNote);
        } else {
            if (onDeleteNote) onDeleteNote(originalCaseId, updatedNote.id);
            if (onAddNote) onAddNote(targetCaseId, updatedNote.content, updatedNote.color, updatedNote.assignedTo);
        }
    };

    // Reset / initialize assignee selection when mode or currentUser changes
    useEffect(() => {
        if (currentUser) {
            setSelectedAssignees([currentUser.id]);
        }
        if (mode === 'single' && caseData) {
            setSelectedTargetCaseId(caseData.id);
        } else if (mode === 'notes') {
            setSelectedTargetCaseId('');
        } else if (allCases.length > 0) {
            setSelectedTargetCaseId('');
        }
        setSearchQuery('');
        if (mode === 'notes') {
            setStatusFilter('all');
            setAssigneeFilter('all');
        } else {
            // Por defecto activada la pestaña de pendientes al abrir tareas
            setStatusFilter('pending');
            setAssigneeFilter('all');
        }
    }, [mode, caseData, currentUser, allCases]);

    const isItemVisible = (item: { createdBy?: string; assignedTo?: string[] }) => {
        if (!currentUser) return true;
        if (currentUser.role === 'admin') return true;
        const isAssigned = item.assignedTo?.includes(currentUser.id);
        const isCreator = item.createdBy === currentUser.id;
        const isLegacy = (!item.assignedTo || item.assignedTo.length === 0) && isCreator;
        return isAssigned || isCreator || isLegacy;
    };

    // Filter helper
    const matchesFilter = (item: { text?: string; content?: string; completed?: boolean; createdBy?: string; assignedTo?: string[] }) => {
        const textToSearch = (item.text || item.content || '').toLowerCase();
        if (searchQuery.trim() && !textToSearch.includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Status filter (only for items with completed property)
        if (item.completed !== undefined) {
            if (statusFilter === 'pending' && item.completed === true) return false;
            if (statusFilter === 'completed' && item.completed === false) return false;
        }

        // Assignee / Scope filter
        if (assigneeFilter === 'assigned_to_me') {
            if (!currentUser) return true;
            const isAssigned = item.assignedTo?.includes(currentUser.id);
            const isLegacy = (!item.assignedTo || item.assignedTo.length === 0) && item.createdBy === currentUser.id;
            return !!(isAssigned || isLegacy);
        }
        if (assigneeFilter === 'assigned_to_others') {
            if (!currentUser) return false;
            return item.createdBy === currentUser.id && 
                   !!item.assignedTo && 
                   item.assignedTo.length > 0 && 
                   !item.assignedTo.includes(currentUser.id);
        }
        if (assigneeFilter === 'created_by_me' && currentUser && item.createdBy !== currentUser.id) return false;

        return true;
    };

    // Tasks grouped by case
    const tasksByCase = useMemo<{ [caseId: string]: Task[] }>(() => {
        const grouped: { [caseId: string]: Task[] } = {};
        if (mode === 'all') {
            allCases.forEach(c => {
                if (c.tasks && c.tasks.length > 0) {
                    const visible = c.tasks.filter(isItemVisible).filter(matchesFilter);
                    if (visible.length > 0) {
                        grouped[c.id] = visible;
                    }
                }
            });
        }
        return grouped;
    }, [allCases, mode, currentUser, searchQuery, statusFilter, assigneeFilter]);

    const visibleGeneralTasks = useMemo(() => {
        return generalTasks.filter(isItemVisible).filter(matchesFilter);
    }, [generalTasks, currentUser, searchQuery, statusFilter, assigneeFilter]);

    const visibleGeneralNotes = useMemo(() => {
        if (mode !== 'notes') return [];
        return generalNotes.filter(isItemVisible).filter(matchesFilter);
    }, [generalNotes, mode, currentUser, searchQuery, statusFilter, assigneeFilter]);

    // Single mode tasks
    const singleModeTasks = useMemo(() => {
        if (mode !== 'single' || !caseData) return [];
        return caseData.tasks.filter(isItemVisible).filter(matchesFilter);
    }, [mode, caseData, currentUser, searchQuery, statusFilter, assigneeFilter]);

    // Notes grouped by case
    const notesByCase = useMemo<{ caseItem: Case; notes: MyNote[] }[]>(() => {
        if (mode !== 'notes') return [];
        return allCases
            .map(c => {
                const userNotes = (c.myNotes || []).filter(isItemVisible).filter(matchesFilter);
                return {
                    caseItem: c,
                    notes: userNotes
                };
            })
            .filter(group => group.notes.length > 0);
    }, [allCases, mode, currentUser, searchQuery, statusFilter, assigneeFilter]);

    const totalNotesCount = useMemo(() => {
        const isMyNote = (n: MyNote) => {
            if (!currentUser) return true;
            if (n.assignedTo && n.assignedTo.length > 0) {
                return n.assignedTo.includes(currentUser.id);
            }
            return n.createdBy === currentUser.id;
        };
        const genCount = generalNotes.filter(isMyNote).length;
        const caseCount = allCases.reduce((acc, c) => acc + (c.myNotes || []).filter(isMyNote).length, 0);
        return genCount + caseCount;
    }, [allCases, generalNotes, currentUser]);

    // Cuenta SOLO las tareas pendientes asignadas al usuario actual
    const totalTasksCount = useMemo(() => {
        const isMyPending = (t: Task) => {
            if (t.completed) return false;
            if (!currentUser) return true;
            if (t.assignedTo && t.assignedTo.length > 0) {
                return t.assignedTo.includes(currentUser.id);
            }
            return t.createdBy === currentUser.id;
        };
        const generalCount = generalTasks.filter(isMyPending).length;
        const casesCount = allCases.reduce((acc, c) => acc + (c.tasks || []).filter(isMyPending).length, 0);
        return generalCount + casesCount;
    }, [allCases, generalTasks, currentUser]);

    const handleCreateItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemText.trim()) return;

        const assignees = selectedAssignees.length > 0 ? selectedAssignees : (currentUser ? [currentUser.id] : undefined);

        if (mode === 'notes') {
            if (onAddNote) {
                const targetCaseId = selectedTargetCaseId || null;
                onAddNote(targetCaseId, newItemText.trim(), selectedColor, assignees);
                setNewItemText('');
            }
        } else {
            // Task creation
            const targetCaseId = mode === 'single' ? caseData!.id : (selectedTargetCaseId || null);
            onAddTask(targetCaseId, newItemText.trim(), assignees);
            setNewItemText('');
        }
    };

    if (!isOpen) return null;

    let panelTitle = 'Todas las Tareas';
    let panelIcon = <IoListOutline className="text-xl text-teal-600" />;
    let totalBadgeCount = totalTasksCount;

    if (mode === 'single') {
        panelTitle = `Tareas: ${caseData?.name}`;
        panelIcon = <IoListOutline className="text-xl text-teal-600" />;
        totalBadgeCount = singleModeTasks.filter(t => !t.completed).length;
    } else if (mode === 'notes') {
        panelTitle = 'Notas Adhesivas (Casos y Generales)';
        panelIcon = <IoDocumentTextOutline className="text-xl text-amber-500" />;
        totalBadgeCount = totalNotesCount;
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 transition-opacity" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-50 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                
                {/* PANEL HEADER */}
                <div className="p-4 border-b border-slate-200 bg-white flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {panelIcon}
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-800">{panelTitle}</h3>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                                        {totalBadgeCount}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {mode === 'notes' ? 'Notas de colores ordenadas y asignadas por casos' : 'Gestiona y asigna tareas'}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors" 
                            title="Cerrar panel lateral"
                        >
                            <IoCloseOutline className="text-2xl" />
                        </button>
                    </div>

                    {/* SEARCH & FILTER CONTROLS */}
                    <div className="mt-3.5 space-y-2.5">
                        <div className="relative">
                            <IoSearchOutline className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={mode === 'notes' ? "Buscar notas por texto o caso..." : "Buscar tareas..."}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* FILTER CONTROLS (NO HORIZONTAL SCROLL) */}
                        {mode !== 'notes' ? (
                            <div className="space-y-2">
                                {/* Segmented Status Control */}
                                <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('pending')}
                                        className={`py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                                            statusFilter === 'pending'
                                                ? 'bg-teal-600 text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                        }`}
                                    >
                                        <span>Pendientes</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('completed')}
                                        className={`py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                                            statusFilter === 'completed'
                                                ? 'bg-teal-600 text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                        }`}
                                    >
                                        <span>Completadas</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('all')}
                                        className={`py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                                            statusFilter === 'all'
                                                ? 'bg-teal-600 text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                        }`}
                                    >
                                        <span>Todas</span>
                                    </button>
                                </div>

                                {/* Assignee Filter Pills */}
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setAssigneeFilter('all')}
                                        className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                                            assigneeFilter === 'all'
                                                ? 'bg-slate-800 text-white font-semibold shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                                        }`}
                                    >
                                        Todas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAssigneeFilter('assigned_to_me')}
                                        className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                                            assigneeFilter === 'assigned_to_me'
                                                ? 'bg-teal-700 text-white font-semibold shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                                        }`}
                                    >
                                        Para mí
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAssigneeFilter('assigned_to_others')}
                                        className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                                            assigneeFilter === 'assigned_to_others'
                                                ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                                        }`}
                                    >
                                        Asignadas a otros
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAssigneeFilter('created_by_me')}
                                        className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                                            assigneeFilter === 'created_by_me'
                                                ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                                        }`}
                                    >
                                        Creadas por mí
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Notes Filter */
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setAssigneeFilter('all')}
                                    className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                                        assigneeFilter === 'all'
                                            ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                    }`}
                                >
                                    Todas las notas
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAssigneeFilter('assigned_to_me')}
                                    className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                                        assigneeFilter === 'assigned_to_me'
                                            ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                    }`}
                                >
                                    Mis notas (Para mí)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAssigneeFilter('created_by_me')}
                                    className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                                        assigneeFilter === 'created_by_me'
                                            ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                    }`}
                                >
                                    Creadas por mí
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* SCROLLABLE CONTENT BODY */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    
                    {/* NOTES MODE */}
                    {mode === 'notes' && (
                        <>
                            {/* General notes section */}
                            {visibleGeneralNotes.length > 0 && (
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                                        <div className="min-w-0 flex items-center gap-1.5">
                                            <span className="font-bold text-slate-800 text-sm">📌 Notas Generales (Sin Caso)</span>
                                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">
                                                {visibleGeneralNotes.length}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        {visibleGeneralNotes.map(note => (
                                            <NoteItem 
                                                key={note.id}
                                                note={note}
                                                caseId={null}
                                                onUpdate={(updated, targetCaseId) => handleNoteUpdate(null, targetCaseId ?? null, updated)}
                                                onDelete={() => onDeleteNote && onDeleteNote(null, note.id)}
                                                professionals={professionals}
                                                currentUser={currentUser}
                                                caseName="General / Sin Caso"
                                                allCases={allCases}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Case-associated notes */}
                            {notesByCase.map(({ caseItem, notes }) => (
                                <div key={caseItem.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-800 text-sm truncate">{caseItem.name}</h4>
                                            {caseItem.nickname && (
                                                <span className="text-xs text-slate-500">({caseItem.nickname})</span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => { onSelectCaseById(caseItem.id, 'myNotes'); onClose(); }} 
                                            className="text-xs font-semibold flex items-center gap-1 text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded hover:bg-teal-100 transition-colors flex-shrink-0"
                                            title="Abrir este caso en la pestaña de notas"
                                        >
                                            Ir al caso <IoChevronForwardCircleOutline />
                                        </button>
                                    </div>
                                    <div className="space-y-2.5">
                                        {notes.map(note => (
                                            <NoteItem 
                                                key={note.id}
                                                note={note}
                                                caseId={caseItem.id}
                                                onUpdate={(updated, targetCaseId) => handleNoteUpdate(caseItem.id, targetCaseId || caseItem.id, updated)}
                                                onDelete={() => onDeleteNote && onDeleteNote(caseItem.id, note.id)}
                                                professionals={professionals}
                                                currentUser={currentUser}
                                                caseName={caseItem.name}
                                                onSelectCase={() => { onSelectCaseById(caseItem.id, 'myNotes'); onClose(); }}
                                                allCases={allCases}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {visibleGeneralNotes.length === 0 && notesByCase.length === 0 && (
                                <div className="text-center text-slate-500 py-12 px-4 bg-white rounded-xl border border-dashed border-slate-200">
                                    <IoDocumentTextOutline className="text-4xl text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-700">No hay notas que mostrar</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {searchQuery || assigneeFilter !== 'all'
                                            ? 'Prueba a cambiar los filtros de búsqueda.'
                                            : 'Escribe una nueva nota abajo seleccionando el caso o general y los destinatarios.'}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* TASKS IN SINGLE CASE MODE */}
                    {mode === 'single' && caseData && (
                        <div className="space-y-2">
                            {singleModeTasks.length === 0 ? (
                                <div className="text-center text-slate-500 py-12 px-4 bg-white rounded-xl border border-dashed border-slate-200">
                                    <IoListOutline className="text-4xl text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-700">No hay tareas en este caso</p>
                                    <p className="text-xs text-slate-400 mt-1">Crea una nueva tarea abajo asignada a un técnico o a ti.</p>
                                </div>
                            ) : (
                                singleModeTasks.map(task => (
                                    <TaskItem 
                                        key={task.id} 
                                        task={task} 
                                        onToggle={() => onToggleTask(caseData.id, task.id)} 
                                        onDelete={() => onDeleteTask(caseData.id, task.id)} 
                                        onConvertToEntry={() => { onTaskToEntry(task); onClose(); }} 
                                        onUpdate={(updatedTask, targetCaseId) => handleTaskUpdate(caseData.id, targetCaseId, updatedTask)}
                                        professionals={edisTechnicians} 
                                        currentUser={currentUser}
                                        allCases={allCases}
                                        currentCaseId={caseData.id}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {/* TASKS IN ALL MODE */}
                    {mode === 'all' && (
                        <div className="space-y-4">
                            {/* General Tasks section */}
                            {visibleGeneralTasks.length > 0 && (
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <h4 className="font-bold text-slate-700 text-sm mb-2.5 flex items-center gap-1.5">
                                        <span>📋 Tareas Generales (Sin caso)</span>
                                        <span className="text-xs px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full font-semibold">
                                            {visibleGeneralTasks.length}
                                        </span>
                                    </h4>
                                    <div className="space-y-2">
                                        {visibleGeneralTasks.map(task => (
                                            <TaskItem 
                                                key={task.id} 
                                                task={task} 
                                                onToggle={() => onToggleGeneralTask(task.id)} 
                                                onDelete={() => onDeleteGeneralTask(task.id)} 
                                                onConvertToEntry={() => {}} 
                                                onUpdate={(updatedTask, targetCaseId) => handleTaskUpdate(null, targetCaseId, updatedTask)}
                                                professionals={edisTechnicians} 
                                                currentUser={currentUser}
                                                allCases={allCases}
                                                currentCaseId={null}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Grouped by case */}
                            {Object.keys(tasksByCase).map(caseId => {
                                const tasks = tasksByCase[caseId];
                                const currentCase = allCases.find(c => c.id === caseId);
                                if (!currentCase) return null;
                                return (
                                    <div key={caseId} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-800 text-sm truncate">{currentCase.name}</h4>
                                                {currentCase.nickname && (
                                                    <span className="text-xs text-slate-500">({currentCase.nickname})</span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => { onSelectCaseById(caseId, 'tasks'); onClose(); }} 
                                                className="text-xs font-semibold flex items-center gap-1 text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded hover:bg-teal-100 transition-colors flex-shrink-0"
                                                title="Ver tareas dentro del caso"
                                            >
                                                Ir al caso <IoChevronForwardCircleOutline />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {tasks.map(task => (
                                                <TaskItem 
                                                    key={task.id} 
                                                    task={task} 
                                                    onToggle={() => onToggleTask(caseId, task.id)} 
                                                    onDelete={() => onDeleteTask(caseId, task.id)} 
                                                    onConvertToEntry={() => { onSelectCaseById(caseId, 'tasks'); onTaskToEntry(task); }} 
                                                    onUpdate={(updatedTask, targetCaseId) => handleTaskUpdate(caseId, targetCaseId, updatedTask)}
                                                    professionals={edisTechnicians} 
                                                    currentUser={currentUser}
                                                    allCases={allCases}
                                                    currentCaseId={caseId}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {visibleGeneralTasks.length === 0 && Object.keys(tasksByCase).length === 0 && (
                                <div className="text-center text-slate-500 py-12 px-4 bg-white rounded-xl border border-dashed border-slate-200">
                                    <IoListOutline className="text-4xl text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-700">No hay tareas que coincidan con la búsqueda</p>
                                    <p className="text-xs text-slate-400 mt-1">Añade una nueva tarea abajo asignada a un técnico o caso.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* BOTTOM CREATION BAR (FOR NOTES & TASKS WITH COMPLETE ASSIGNMENT CAPABILITY) */}
                <div className="p-4 border-t border-amber-200 bg-amber-50/90 flex-shrink-0 shadow-lg space-y-3">
                    {mode === 'notes' ? (
                        <form onSubmit={handleCreateItem} className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-grow">
                                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                                        Asociar a:
                                    </label>
                                    <select
                                        value={selectedTargetCaseId}
                                        onChange={(e) => setSelectedTargetCaseId(e.target.value)}
                                        className="w-full text-xs border border-amber-300/80 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none shadow-2xs"
                                    >
                                        <option value="">📌 General / Sin caso</option>
                                        {allCases.map(c => (
                                            <option key={c.id} value={c.id}>
                                                📁 {c.name} {c.nickname ? `(${c.nickname})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-shrink-0">
                                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                                        Color:
                                    </label>
                                    <div className="flex items-center gap-1">
                                        {colorPills.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setSelectedColor(p.id)}
                                                className={`w-6 h-6 rounded-full ${p.bg} border transition-all ${selectedColor === p.id ? 'ring-2 ring-slate-800 scale-110 border-slate-700' : 'border-transparent hover:scale-105'}`}
                                                title={p.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* PROFESSIONAL ASSIGNMENT PICKER */}
                            <ProfessionalAssignSelector
                                professionals={edisTechnicians}
                                selectedIds={selectedAssignees}
                                onChange={setSelectedAssignees}
                                currentUser={currentUser}
                                label="Asignar nota a técnico/a EDIS:"
                            />

                            <div className="flex gap-2 items-end">
                                <textarea
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    placeholder="Escribe una nota adhesiva..."
                                    rows={2}
                                    className="flex-grow px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white text-slate-900 placeholder:text-slate-400 border-amber-300/80 focus:ring-amber-500 resize-none shadow-2xs"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newItemText.trim()}
                                    className="h-10 bg-teal-600 disabled:opacity-50 text-white px-3.5 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors flex-shrink-0 text-sm font-semibold gap-1.5 shadow-2xs" 
                                    title="Añadir Nota"
                                >
                                    <IoAddOutline className="text-lg" /> Añadir Nota
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleCreateItem} className="space-y-3">
                            {mode === 'all' && (
                                <div>
                                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                                        Destino de la tarea:
                                    </label>
                                    <select
                                        value={selectedTargetCaseId}
                                        onChange={(e) => setSelectedTargetCaseId(e.target.value)}
                                        className="w-full text-xs border border-amber-300/80 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none shadow-2xs"
                                    >
                                        <option value="">📋 Tarea General (Sin caso asociado)</option>
                                        {allCases.map(c => (
                                            <option key={c.id} value={c.id}>
                                                📁 {c.name} {c.nickname ? `(${c.nickname})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* PROFESSIONAL ASSIGNMENT PICKER */}
                            <ProfessionalAssignSelector
                                professionals={edisTechnicians}
                                selectedIds={selectedAssignees}
                                onChange={setSelectedAssignees}
                                currentUser={currentUser}
                                label="Asignar tarea a técnico/a EDIS:"
                            />

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    placeholder={
                                        mode === 'single'
                                            ? `Añadir tarea a ${caseData?.name}...`
                                            : selectedTargetCaseId
                                                ? "Añadir tarea al caso seleccionado..."
                                                : "Añadir tarea general..."
                                    }
                                    className="flex-grow px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white text-slate-900 placeholder:text-slate-400 border-amber-300/80 focus:ring-amber-500 shadow-2xs"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newItemText.trim()}
                                    className="bg-teal-600 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors flex-shrink-0 text-sm font-semibold gap-1 shadow-2xs" 
                                    title="Añadir Tarea"
                                >
                                    <IoAddOutline className="text-lg" /> Añadir
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

export default TasksSidePanel;
