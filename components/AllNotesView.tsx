
import React, { useMemo, useState } from 'react';
import { Case, Task, MyNote, User } from '../types';
import { IoAddOutline, IoCheckbox, IoSquareOutline, IoArrowBack, IoCreateOutline, IoTrashOutline } from 'react-icons/io5';
import UnifiedNoteModal, { UnifiedItemData } from './UnifiedNoteModal';

interface AllNotesViewProps {
    cases: Case[];
    generalTasks: Task[];
    onBack: () => void;
    currentUser: User;
    onSaveItem: (data: UnifiedItemData) => void;
    onDeleteItem: (id: string, type: 'note' | 'task', caseId: string | null) => void;
    onToggleTask: (id: string, caseId: string | null) => void;
}

// Helper to organize data
interface GroupedData {
    caseId: string | null; // null for general
    caseName: string;
    items: UnifiedItemData[];
}

const colorClasses = {
    yellow: 'bg-yellow-100 border-yellow-200',
    pink: 'bg-pink-100 border-pink-200',
    blue: 'bg-blue-100 border-blue-200',
    green: 'bg-green-100 border-green-200',
    white: 'bg-white border-slate-200'
};

const AllNotesView: React.FC<AllNotesViewProps> = ({ cases, generalTasks, onBack, currentUser, onSaveItem, onDeleteItem, onToggleTask }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<UnifiedItemData | null>(null);

    const groups = useMemo<GroupedData[]>(() => {
        const result: GroupedData[] = [];

        // 1. General Tasks
        const myGeneralTasks = generalTasks.filter(t => t.createdBy === currentUser.id);
        if (myGeneralTasks.length > 0) {
            result.push({
                caseId: null,
                caseName: 'General / Sin Caso',
                items: myGeneralTasks.map(t => ({
                    id: t.id,
                    content: t.text,
                    type: 'task',
                    caseId: null,
                    isCompleted: t.completed
                }))
            });
        }

        // 2. Case Items
        const sortedCases = [...cases].sort((a, b) => {
             const aPinned = a.isPinned ? 1 : 0;
             const bPinned = b.isPinned ? 1 : 0;
             return bPinned - aPinned || a.name.localeCompare(b.name);
        });

        sortedCases.forEach(c => {
            const myNotes = (c.myNotes || []).filter(n => n.createdBy === currentUser.id);
            // Check if tasks are assigned to user or created by user (Tasks usually assignedTo array)
            const myTasks = c.tasks.filter(t => t.assignedTo?.includes(currentUser.id) || t.createdBy === currentUser.id);

            if (myNotes.length > 0 || myTasks.length > 0) {
                const items: UnifiedItemData[] = [
                    ...myNotes.map(n => ({
                        id: n.id,
                        content: n.content,
                        type: 'note' as const,
                        caseId: c.id,
                        color: n.color
                    })),
                    ...myTasks.map(t => ({
                        id: t.id,
                        content: t.text,
                        type: 'task' as const,
                        caseId: c.id,
                        isCompleted: t.completed
                    }))
                ];

                result.push({
                    caseId: c.id,
                    caseName: c.name + (c.nickname ? ` (${c.nickname})` : ''),
                    items: items
                });
            }
        });

        return result;
    }, [cases, generalTasks, currentUser]);

    const handleOpenModal = (item: UnifiedItemData | null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full bg-white shadow-sm hover:bg-slate-100 text-slate-600 transition-colors">
                        <IoArrowBack className="text-xl" />
                    </button>
                    <h2 className="text-3xl font-bold text-slate-800">Mis Notas y Tareas</h2>
                </div>
            </div>

            {groups.length === 0 ? (
                 <div className="text-center py-20 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200">
                    <h3 className="text-xl font-semibold text-slate-700">Todo limpio</h3>
                    <p className="text-slate-500 mt-2">No tienes notas ni tareas pendientes. ¡Buen trabajo!</p>
                    <button onClick={() => handleOpenModal(null)} className="mt-4 text-teal-600 hover:underline">Crear mi primera nota</button>
                 </div>
            ) : (
                <div className="space-y-10">
                    {groups.map(group => (
                        <div key={group.caseId || 'general'} className="bg-white/50 rounded-xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                {group.caseId ? <span className="w-2 h-6 bg-teal-500 rounded-full"></span> : <span className="w-2 h-6 bg-slate-400 rounded-full"></span>}
                                {group.caseName}
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {group.items.map(item => {
                                    const isTask = item.type === 'task';
                                    const baseClass = isTask ? 'bg-white border-l-4 border-l-indigo-400' : colorClasses[item.color || 'yellow'];
                                    const rotation = !isTask ? (Math.random() > 0.5 ? 'rotate-1' : '-rotate-1') : '';

                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`relative p-4 rounded-lg shadow-sm border border-slate-100 transition-all hover:shadow-md group ${baseClass} ${rotation} hover:rotate-0 hover:z-10`}
                                        >
                                            {/* Actions Overlay */}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-md p-0.5 backdrop-blur-sm">
                                                <button onClick={() => handleOpenModal(item)} className="p-1.5 hover:text-teal-600 text-slate-500" title="Editar">
                                                    <IoCreateOutline />
                                                </button>
                                                <button onClick={() => onDeleteItem(item.id!, item.type, item.caseId)} className="p-1.5 hover:text-red-600 text-slate-500" title="Eliminar">
                                                    <IoTrashOutline />
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <div className="flex items-start gap-3">
                                                {isTask && (
                                                    <button 
                                                        onClick={() => onToggleTask(item.id!, item.caseId)}
                                                        className={`mt-1 flex-shrink-0 text-xl ${item.isCompleted ? 'text-teal-600' : 'text-slate-300 hover:text-teal-500'}`}
                                                    >
                                                        {item.isCompleted ? <IoCheckbox /> : <IoSquareOutline />}
                                                    </button>
                                                )}
                                                <p className={`whitespace-pre-wrap text-sm text-slate-800 ${isTask && item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                                                    {item.content}
                                                </p>
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
                className="fixed bottom-8 right-8 z-50 bg-teal-600 text-white px-6 py-3 rounded-full hover:bg-teal-700 font-semibold flex items-center gap-2 shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
            >
                <IoAddOutline className="text-2xl" />
                <span className="hidden sm:inline">Añadir Nota</span>
            </button>

            <UnifiedNoteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onSaveItem}
                initialData={editingItem}
                cases={cases}
            />
        </div>
    );
};

export default AllNotesView;
