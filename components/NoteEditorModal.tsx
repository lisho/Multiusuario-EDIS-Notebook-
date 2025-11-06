import React, { useState, useEffect } from 'react';
import { MyNote } from '../types';
import { IoCloseOutline, IoSaveOutline } from 'react-icons/io5';

interface NoteEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (noteData: Pick<MyNote, 'content' | 'color'> & { id?: string }) => void;
    initialData?: MyNote | null;
}

const colors: MyNote['color'][] = ['yellow', 'pink', 'blue', 'green'];
const colorClasses = {
    yellow: 'bg-yellow-200 hover:ring-yellow-400',
    pink: 'bg-pink-200 hover:ring-pink-400',
    blue: 'bg-blue-200 hover:ring-blue-400',
    green: 'bg-green-200 hover:ring-green-400',
};

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [content, setContent] = useState('');
    const [color, setColor] = useState<MyNote['color']>('yellow');

    useEffect(() => {
        if (isOpen) {
            setContent(initialData?.content || '');
            setColor(initialData?.color || 'yellow');
        }
    }, [isOpen, initialData]);

    const handleSave = () => {
        if (content.trim()) {
            onSave({ id: initialData?.id, content: content.trim(), color });
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Editar Nota' : 'Nueva Nota Rápida'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-2xl" /></button>
                </div>
                <div className="p-6">
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={8}
                        className="w-full rounded-lg border shadow-sm focus:outline-none focus:ring-2 text-base p-3 bg-slate-100 text-slate-900 placeholder:text-slate-500 border-slate-300 focus:ring-teal-500"
                        placeholder="Escribe aquí tu nota..."
                        autoFocus
                    />
                    <div className="mt-4 flex items-center gap-3">
                        <p className="text-sm font-medium text-slate-600">Color:</p>
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full transition-all ring-2 ${color === c ? 'ring-offset-2 ring-teal-500' : 'ring-transparent'} ${colorClasses[c]}`}
                                title={`Color ${c}`}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-4 p-4 mt-auto border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="py-2 px-4 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold">Cancelar</button>
                    <button type="button" onClick={handleSave} className="py-2 px-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2">
                        <IoSaveOutline />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoteEditorModal;
