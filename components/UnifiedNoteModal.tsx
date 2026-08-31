
import React, { useState, useEffect, useMemo } from 'react';
import { Case, MyNote, Professional, Task, User, ProfessionalRole } from '../types';
import { IoCloseOutline, IoSaveOutline, IoDocumentTextOutline, IoCheckboxOutline, IoPeopleOutline } from 'react-icons/io5';

export type UnifiedItemType = 'note' | 'task';

export interface UnifiedItemData {
    id?: string;
    content: string;
    type: UnifiedItemType;
    caseId: string | null; // null means General
    color?: MyNote['color'];
    isCompleted?: boolean;
    assignedTo?: string[];
}

interface UnifiedNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: UnifiedItemData) => void;
    initialData?: UnifiedItemData | null;
    cases: Case[];
    professionals?: Professional[];
    currentUser?: User | null;
}

const colors: MyNote['color'][] = ['yellow', 'pink', 'blue', 'green'];
const colorClasses = {
    yellow: 'bg-yellow-200 hover:ring-yellow-400',
    pink: 'bg-pink-200 hover:ring-pink-400',
    blue: 'bg-blue-200 hover:ring-blue-400',
    green: 'bg-green-200 hover:ring-green-400',
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const UnifiedNoteModal: React.FC<UnifiedNoteModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    cases,
    professionals = [],
    currentUser
}) => {
    const [content, setContent] = useState('');
    const [type, setType] = useState<UnifiedItemType>('note');
    const [caseId, setCaseId] = useState<string>('');
    const [color, setColor] = useState<MyNote['color']>('yellow');
    const [assignedTo, setAssignedTo] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const availableProfessionals = useMemo(() => {
        const edisList = professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
        if (caseId) {
            const selectedCase = cases.find(c => c.id === caseId);
            if (selectedCase?.professionalIds && selectedCase.professionalIds.length > 0) {
                const caseProfs = edisList.filter(p => selectedCase.professionalIds!.includes(p.id));
                return caseProfs.length > 0 ? caseProfs : edisList;
            }
        }
        return edisList;
    }, [professionals, cases, caseId]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setContent(initialData.content);
                setType(initialData.type);
                setCaseId(initialData.caseId || '');
                setColor(initialData.color || 'yellow');
                setAssignedTo(initialData.assignedTo && initialData.assignedTo.length > 0 ? initialData.assignedTo : (currentUser?.id ? [currentUser.id] : []));
            } else {
                // Defaults
                setContent('');
                setType('note');
                setCaseId('');
                setColor('yellow');
                setAssignedTo(currentUser?.id ? [currentUser.id] : []);
            }
            setError(null);
        }
    }, [isOpen, initialData, currentUser]);

    const handleToggleAssignee = (profId: string) => {
        setAssignedTo(prev => 
            prev.includes(profId) 
                ? prev.filter(id => id !== profId) 
                : [...prev, profId]
        );
    };

    const handleSelectOnlyMe = () => {
        if (currentUser?.id) {
            setAssignedTo([currentUser.id]);
        }
    };

    const handleSelectAllTeam = () => {
        setAssignedTo(availableProfessionals.map(p => p.id));
    };

    const validate = () => {
        if (!content.trim()) {
            setError('El contenido no puede estar vacío.');
            return false;
        }
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const finalAssignedTo = assignedTo.length > 0 ? assignedTo : (currentUser?.id ? [currentUser.id] : []);

        onSave({
            id: initialData?.id,
            content: content.trim(),
            type,
            caseId: caseId || null,
            color: type === 'note' ? color : undefined,
            isCompleted: initialData?.isCompleted || false,
            assignedTo: finalAssignedTo,
        });
        onClose();
    };

    const handleTypeChange = (newType: UnifiedItemType) => {
        setType(newType);
        // If changing to task, ensure assignedTo contains valid technicians
        if (newType === 'task') {
            const edisIds = professionals.filter(p => p.role === ProfessionalRole.EdisTechnician).map(p => p.id);
            setAssignedTo(prev => {
                const filtered = prev.filter(id => edisIds.includes(id));
                return filtered.length > 0 ? filtered : (currentUser?.id && edisIds.includes(currentUser.id) ? [currentUser.id] : (edisIds[0] ? [edisIds[0]] : []));
            });
        }
    };

    if (!isOpen) return null;

    const isOnlyMe = currentUser?.id && assignedTo.length === 1 && assignedTo[0] === currentUser.id;
    const isAllSelected = availableProfessionals.length > 0 && assignedTo.length === availableProfessionals.length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">
                        {initialData ? (type === 'note' ? 'Editar Nota' : 'Editar Tarea') : 'Nueva Nota o Tarea'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 rounded-full p-1 hover:bg-slate-100 transition-colors">
                        <IoCloseOutline className="text-2xl" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                    
                    {/* Type Selector */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => handleTypeChange('note')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-colors ${type === 'note' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <IoDocumentTextOutline className="text-lg" /> Nota
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('task')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-colors ${type === 'task' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <IoCheckboxOutline className="text-lg" /> Tarea
                        </button>
                    </div>

                    {/* Case Selector */}
                    <div>
                        <label htmlFor="caseSelect" className="block text-slate-700 font-semibold mb-2">Asociar a Caso</label>
                        <select
                            id="caseSelect"
                            value={caseId}
                            onChange={(e) => setCaseId(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white border-slate-300 text-slate-900"
                        >
                            <option value="">-- General / Sin Caso --</option>
                            {cases.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.nickname ? `(${c.nickname})` : ''}
                                </option>
                            ))}
                        </select>
                        {type === 'note' && !caseId && (
                            <p className="text-xs text-amber-600 mt-1">
                                * Las notas generales se guardarán como tareas sin fecha.
                            </p>
                        )}
                    </div>

                    {/* Assignee / Recipient Selector */}
                    {availableProfessionals.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-semibold text-slate-700">
                                    {type === 'note' ? 'Asignar nota a técnico/a EDIS:' : 'Asignar tarea a técnico/a EDIS:'}
                                </label>
                                <div className="flex items-center gap-1.5">
                                    {currentUser && (
                                        <button
                                            type="button"
                                            onClick={handleSelectOnlyMe}
                                            className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors ${isOnlyMe ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'text-slate-500 hover:text-teal-600 bg-slate-100'}`}
                                        >
                                            Solo para mí
                                        </button>
                                    )}
                                    {availableProfessionals.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={handleSelectAllTeam}
                                            className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors ${isAllSelected ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' : 'text-slate-500 hover:text-indigo-600 bg-slate-100'}`}
                                        >
                                            Todos los técnicos
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-32 overflow-y-auto space-y-1">
                                {availableProfessionals.map(p => {
                                    const isSelected = assignedTo.includes(p.id);
                                    const isCurrent = currentUser?.id === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleToggleAssignee(p.id)}
                                            className={`w-full flex items-center justify-between p-1.5 rounded-md text-left transition-all ${isSelected ? 'bg-teal-50 border border-teal-300 shadow-xs' : 'hover:bg-slate-100 border border-transparent'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px] border border-white overflow-hidden">
                                                    {p.avatar ? (
                                                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{getInitials(p.name)}</span>
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-slate-800">
                                                    {p.name} {isCurrent ? '(Tú)' : ''}
                                                </span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 pointer-events-none"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div>
                        <label className="block text-slate-700 font-semibold mb-2">Contenido</label>
                        <textarea
                            value={content}
                            onChange={(e) => { setContent(e.target.value); setError(null); }}
                            rows={4}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 text-slate-900 placeholder:text-slate-400 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`}
                            placeholder={type === 'note' ? "Escribe tu nota..." : "Describe la tarea a realizar..."}
                            autoFocus
                        />
                        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    </div>

                    {/* Color Selector (Only for Notes) */}
                    {type === 'note' && (
                        <div>
                            <label className="block text-slate-700 font-semibold mb-2">Color</label>
                            <div className="flex gap-3">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-all ring-2 ${color === c ? 'ring-offset-2 ring-teal-500 scale-110' : 'ring-transparent'} ${colorClasses[c]}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </form>

                <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold transition-colors">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSubmit} className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2 shadow-sm transition-colors">
                        <IoSaveOutline />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnifiedNoteModal;
