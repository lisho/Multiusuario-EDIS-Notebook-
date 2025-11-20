
import React, { useState, useEffect } from 'react';
import { Case, MyNote, Task } from '../types';
import { IoCloseOutline, IoSaveOutline, IoDocumentTextOutline, IoCheckboxOutline } from 'react-icons/io5';

export type UnifiedItemType = 'note' | 'task';

export interface UnifiedItemData {
    id?: string;
    content: string;
    type: UnifiedItemType;
    caseId: string | null; // null means General
    color?: MyNote['color'];
    isCompleted?: boolean;
}

interface UnifiedNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: UnifiedItemData) => void;
    initialData?: UnifiedItemData | null;
    cases: Case[];
}

const colors: MyNote['color'][] = ['yellow', 'pink', 'blue', 'green'];
const colorClasses = {
    yellow: 'bg-yellow-200 hover:ring-yellow-400',
    pink: 'bg-pink-200 hover:ring-pink-400',
    blue: 'bg-blue-200 hover:ring-blue-400',
    green: 'bg-green-200 hover:ring-green-400',
};

const UnifiedNoteModal: React.FC<UnifiedNoteModalProps> = ({ isOpen, onClose, onSave, initialData, cases }) => {
    const [content, setContent] = useState('');
    const [type, setType] = useState<UnifiedItemType>('note');
    const [caseId, setCaseId] = useState<string>('');
    const [color, setColor] = useState<MyNote['color']>('yellow');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setContent(initialData.content);
                setType(initialData.type);
                setCaseId(initialData.caseId || '');
                setColor(initialData.color || 'yellow');
            } else {
                // Defaults
                setContent('');
                setType('note');
                setCaseId('');
                setColor('yellow');
            }
            setError(null);
        }
    }, [isOpen, initialData]);

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

        onSave({
            id: initialData?.id,
            content: content.trim(),
            type,
            caseId: caseId || null,
            color: type === 'note' ? color : undefined,
            isCompleted: initialData?.isCompleted || false,
        });
        onClose();
    };

    const handleTypeChange = (newType: UnifiedItemType) => {
        setType(newType);
        // If switching to note and no case is selected, warn or handle logic if you strictly don't support general notes
        // But for this UI, we let the parent handle data storage.
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">
                        {initialData ? 'Editar Nota/Tarea' : 'Nueva Nota o Tarea'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <IoCloseOutline className="text-2xl" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    
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

                    {/* Content */}
                    <div>
                        <label className="block text-slate-700 font-semibold mb-2">Contenido</label>
                        <textarea
                            value={content}
                            onChange={(e) => { setContent(e.target.value); setError(null); }}
                            rows={5}
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
                                        className={`w-8 h-8 rounded-full transition-all ring-2 ${color === c ? 'ring-offset-2 ring-teal-500' : 'ring-transparent'} ${colorClasses[c]}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </form>

                <div className="flex justify-end gap-4 p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSubmit} className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2">
                        <IoSaveOutline />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnifiedNoteModal;
