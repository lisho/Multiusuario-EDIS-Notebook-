import React, { useState, useEffect } from 'react';
import { MyNote, Professional, ProfessionalRole, User } from '../types';
import { IoCloseOutline, IoSaveOutline, IoPersonOutline } from 'react-icons/io5';

interface NoteEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (noteData: Pick<MyNote, 'content' | 'color' | 'assignedTo'> & { id?: string }) => void;
    initialData?: MyNote | null;
    professionals?: Professional[];
    currentUser?: User | null;
    caseProfessionalIds?: string[];
}

const colors: MyNote['color'][] = ['yellow', 'pink', 'blue', 'green'];
const colorClasses = {
    yellow: 'bg-yellow-200 hover:ring-yellow-400',
    pink: 'bg-pink-200 hover:ring-pink-400',
    blue: 'bg-blue-200 hover:ring-blue-400',
    green: 'bg-green-200 hover:ring-green-400',
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    professionals = [],
    currentUser,
    caseProfessionalIds
}) => {
    const [content, setContent] = useState('');
    const [color, setColor] = useState<MyNote['color']>('yellow');
    const [assignedTo, setAssignedTo] = useState<string[]>([]);

    const availableProfessionals = React.useMemo(() => {
        const edisProfs = professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
        if (caseProfessionalIds && caseProfessionalIds.length > 0) {
            const caseProfs = edisProfs.filter(p => caseProfessionalIds.includes(p.id));
            return caseProfs.length > 0 ? caseProfs : edisProfs;
        }
        return edisProfs;
    }, [professionals, caseProfessionalIds]);

    useEffect(() => {
        if (isOpen) {
            setContent(initialData?.content || '');
            setColor(initialData?.color || 'yellow');
            if (initialData?.assignedTo && initialData.assignedTo.length > 0) {
                setAssignedTo(initialData.assignedTo);
            } else if (initialData?.createdBy) {
                setAssignedTo([initialData.createdBy]);
            } else if (currentUser?.id) {
                setAssignedTo([currentUser.id]);
            } else {
                setAssignedTo([]);
            }
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

    const handleSave = () => {
        if (content.trim()) {
            const finalAssignedTo = assignedTo.length > 0 ? assignedTo : (currentUser?.id ? [currentUser.id] : []);
            onSave({ 
                id: initialData?.id, 
                content: content.trim(), 
                color,
                assignedTo: finalAssignedTo
            });
        }
    };
    
    if (!isOpen) return null;

    const isOnlyMe = currentUser?.id && assignedTo.length === 1 && assignedTo[0] === currentUser.id;
    const isAllSelected = availableProfessionals.length > 0 && assignedTo.length === availableProfessionals.length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">
                        {initialData ? 'Editar Nota' : 'Nueva Nota Rápida'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 rounded-full p-1 hover:bg-slate-100 transition-colors">
                        <IoCloseOutline className="text-2xl" />
                    </button>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto">
                    {/* Note Content */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contenido</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            rows={5}
                            className="w-full rounded-lg border shadow-sm focus:outline-none focus:ring-2 text-base p-3 bg-slate-50 text-slate-900 placeholder:text-slate-400 border-slate-300 focus:ring-teal-500"
                            placeholder="Escribe aquí tu nota..."
                            autoFocus
                        />
                    </div>

                    {/* Assign / Direct to Technicians */}
                    {availableProfessionals.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Asignar nota a técnico/a EDIS:
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
                                            Todo el equipo
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto space-y-1">
                                {availableProfessionals.map(p => {
                                    const isSelected = assignedTo.includes(p.id);
                                    const isCurrent = currentUser?.id === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleToggleAssignee(p.id)}
                                            className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-all ${isSelected ? 'bg-teal-50 border border-teal-300 shadow-xs' : 'hover:bg-slate-100 border border-transparent'}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs border border-white overflow-hidden">
                                                    {p.avatar ? (
                                                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{getInitials(p.name)}</span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-slate-800">
                                                    {p.name} {isCurrent ? '(Tú)' : ''}
                                                </span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}} // Controlled via parent button click
                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 pointer-events-none"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Solo los técnicos asignados podrán ver esta nota en su panel y caso.
                            </p>
                        </div>
                    )}

                    {/* Color Picker */}
                    <div>
                        <p className="text-sm font-semibold text-slate-700 mb-2">Color:</p>
                        <div className="flex gap-3">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full transition-all ring-2 ${color === c ? 'ring-offset-2 ring-teal-500 scale-110' : 'ring-transparent'} ${colorClasses[c]}`}
                                    title={`Color ${c}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="py-2 px-4 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSave} 
                        className="py-2 px-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2 transition-colors text-sm shadow-sm"
                    >
                        <IoSaveOutline className="text-base" />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoteEditorModal;
