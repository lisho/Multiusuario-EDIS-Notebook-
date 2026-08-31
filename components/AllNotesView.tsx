
import React, { useMemo, useState } from 'react';
import { Case, Task, MyNote, User, Professional } from '../types';
import { IoAddOutline, IoCheckbox, IoSquareOutline, IoArrowBack, IoCreateOutline, IoTrashOutline, IoSendOutline } from 'react-icons/io5';
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
}

// Helper to organize data
interface GroupedData {
    caseId: string | null; // null for general
    caseName: string;
    items: (UnifiedItemData & { createdBy?: string })[];
}

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
    professionals = []
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<UnifiedItemData | null>(null);

    const isVisibleToUser = (item: { createdBy?: string; assignedTo?: string[] }) => {
        if (currentUser.role === 'admin') return true;
        const isAssigned = item.assignedTo?.includes(currentUser.id);
        const isCreator = item.createdBy === currentUser.id;
        const isLegacy = (!item.assignedTo || item.assignedTo.length === 0) && isCreator;
        return isAssigned || isCreator || isLegacy;
    };

    const groups = useMemo<GroupedData[]>(() => {
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
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Mis Notas y Tareas</h2>
                        <p className="text-sm text-slate-500">Notas y tareas asignadas o dirigidas a ti en todos tus casos.</p>
                    </div>
                </div>
            </div>

            {groups.length === 0 ? (
                 <div className="text-center py-20 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200">
                    <h3 className="text-xl font-semibold text-slate-700">Todo limpio</h3>
                    <p className="text-slate-500 mt-2">No tienes notas ni tareas asignadas. ¡Buen trabajo!</p>
                    <button onClick={() => handleOpenModal(null)} className="mt-4 text-teal-600 font-semibold hover:underline">
                        Crear una nota o tarea
                    </button>
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
                                            className={`relative p-4 rounded-lg shadow-sm border border-slate-100 transition-all hover:shadow-md group flex flex-col justify-between ${baseClass} ${rotation} hover:rotate-0 hover:z-10`}
                                        >
                                            {/* Actions Overlay */}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/70 rounded-md p-0.5 backdrop-blur-sm z-10">
                                                <button onClick={() => handleOpenModal(item)} className="p-1.5 hover:text-teal-600 text-slate-500" title="Editar">
                                                    <IoCreateOutline />
                                                </button>
                                                <button onClick={() => onDeleteItem(item.id!, item.type, item.caseId)} className="p-1.5 hover:text-red-600 text-slate-500" title="Eliminar">
                                                    <IoTrashOutline />
                                                </button>
                                            </div>

                                            <div>
                                                {/* Badges for Sender / Recipient */}
                                                <div className="mb-2 pr-12">
                                                    {isFromOther && (
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/80 text-teal-800 text-[11px] font-semibold">
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
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/80 text-indigo-800 text-[11px] font-semibold">
                                                            <IoSendOutline className="text-[10px]" />
                                                            <span>Para: {assignedProfs.map(p => p.name.split(' ')[0]).join(', ')}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex items-start gap-3">
                                                    {isTask && (
                                                        <button 
                                                            onClick={() => onToggleTask(item.id!, item.caseId)}
                                                            className={`mt-0.5 flex-shrink-0 text-xl ${item.isCompleted ? 'text-teal-600' : 'text-slate-300 hover:text-teal-500'}`}
                                                        >
                                                            {item.isCompleted ? <IoCheckbox /> : <IoSquareOutline />}
                                                        </button>
                                                    )}
                                                    <p className={`whitespace-pre-wrap text-sm text-slate-800 leading-relaxed ${isTask && item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                                                        {item.content}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Assigned Technicians Avatars Footer */}
                                            {assignedProfs.length > 0 && (
                                                <div className="flex justify-end items-center mt-3 pt-2 border-t border-black/5">
                                                    <div className="flex -space-x-1">
                                                        {assignedProfs.map(p => (
                                                            <div key={p.id} className="w-5 h-5 rounded-full bg-white text-slate-700 flex items-center justify-center font-bold text-[9px] border border-slate-200 overflow-hidden" title={`Asignado a ${p.name}`}>
                                                                {p.avatar ? (
                                                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{getInitials(p.name)}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
                <span className="hidden sm:inline">Añadir Nota o Tarea</span>
            </button>

            <UnifiedNoteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onSaveItem}
                initialData={editingItem}
                cases={cases}
                professionals={professionals}
                currentUser={currentUser}
            />
        </div>
    );
};

export default AllNotesView;
