import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Case, MyNote, Professional, User } from '../types';
import NoteEditorModal from './NoteEditorModal';
import { IoJournalOutline, IoAddOutline, IoPencilOutline, IoTrashOutline, IoPersonOutline, IoSendOutline } from 'react-icons/io5';
import TechnicianAvatar from './TechnicianAvatar';

interface MyNotesViewProps {
  caseData: Case;
  onUpdateCase: (updatedCase: Case) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  currentUser: User;
  professionals?: Professional[];
}

const colorClasses = {
    yellow: 'bg-yellow-100 border-yellow-200 rotate-[-2deg] hover:rotate-[-3deg] hover:scale-105',
    pink: 'bg-pink-100 border-pink-200 rotate-[1deg] hover:rotate-[2deg] hover:scale-105',
    blue: 'bg-blue-100 border-blue-200 rotate-[-1deg] hover:rotate-[-2deg] hover:scale-105',
    green: 'bg-green-100 border-green-200 rotate-[2deg] hover:rotate-[3deg] hover:scale-105',
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const PostItCard: React.FC<{ 
    note: MyNote; 
    onEdit: () => void; 
    onDelete: () => void; 
    currentUser: User;
    professionals?: Professional[];
}> = ({ note, onEdit, onDelete, currentUser, professionals = [] }) => {
    const baseColorClass = colorClasses[note.color] || colorClasses.yellow;
    
    // Find creator professional
    const creatorProf = note.createdBy ? professionals.find(p => p.id === note.createdBy) : null;
    const isFromOther = note.createdBy && note.createdBy !== currentUser.id;
    
    // Find assigned professionals
    const assignedProfs = (note.assignedTo || [])
        .map(id => professionals.find(p => p.id === id))
        .filter(Boolean) as Professional[];
    
    const isSentToOthers = note.createdBy === currentUser.id && 
        note.assignedTo && 
        note.assignedTo.length > 0 && 
        note.assignedTo.some(id => id !== currentUser.id);

    return (
        <div className={`p-4 border rounded-md shadow-md transform transition-transform duration-200 ease-in-out group relative flex flex-col justify-between ${baseColorClass}`}>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={onEdit} className="p-1.5 bg-white/70 rounded-full hover:bg-white text-slate-600 shadow-xs" title="Editar nota">
                    <IoPencilOutline className="text-sm"/>
                </button>
                <button onClick={onDelete} className="p-1.5 bg-white/70 rounded-full hover:bg-white text-red-600 shadow-xs" title="Eliminar nota">
                    <IoTrashOutline className="text-sm"/>
                </button>
            </div>

            {/* Creator / Recipient badges */}
            <div className="mb-2 pr-12">
                {isFromOther && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/90 text-teal-800 text-xs font-semibold shadow-xs">
                        <TechnicianAvatar
                            professional={creatorProf || { name: 'Compañero/a' }}
                            size="xs"
                            prefix="De:"
                            tooltipPosition="top"
                        />
                        <span>De: {creatorProf?.name || 'Compañero/a'}</span>
                    </div>
                )}

                {isSentToOthers && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/90 text-indigo-800 text-xs font-semibold shadow-xs">
                        <IoSendOutline className="text-xs" />
                        <span>Para: {assignedProfs.map(p => p.name).join(', ')}</span>
                    </div>
                )}
            </div>

            <p className="text-slate-800 whitespace-pre-wrap min-h-[90px] text-sm leading-relaxed">{note.content}</p>
            
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-black/5 text-xs text-slate-500">
                <div className="flex -space-x-1 items-center">
                    {assignedProfs.map(p => (
                        <TechnicianAvatar
                            key={p.id}
                            professional={p}
                            size="sm"
                            prefix="Asignada a:"
                            tooltipPosition="top"
                        />
                    ))}
                </div>
                <span>{new Date(note.createdAt).toLocaleDateString('es-ES')}</span>
            </div>
        </div>
    );
};


const MyNotesView: React.FC<MyNotesViewProps> = ({ caseData, onUpdateCase, requestConfirmation, currentUser, professionals = [] }) => {
    const [notes, setNotes] = useState<MyNote[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<MyNote | null>(null);

    const dragNoteRef = useRef<number | null>(null);
    const dragOverNoteRef = useRef<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const allNotes: MyNote[] = Array.isArray(caseData.myNotes) ? caseData.myNotes :
            (typeof caseData.myNotes === 'string' && (caseData.myNotes as string).trim() !== '') ?
            [{
                id: `note-${Date.now()}`,
                content: caseData.myNotes as string,
                color: 'yellow',
                createdAt: new Date().toISOString(),
                createdBy: currentUser.id,
                assignedTo: [currentUser.id]
            }] : [];
        
        // Filter notes visible to this user:
        // 1. Admin sees all notes
        // 2. Assigned to current user
        // 3. Created by current user (even if assigned to someone else, creator can see it)
        // 4. Fallback: unassigned notes created by current user
        const userNotes = allNotes.filter(note => {
            if (currentUser.role === 'admin') return true;
            const isAssigned = note.assignedTo?.includes(currentUser.id);
            const isCreator = note.createdBy === currentUser.id;
            const isLegacy = (!note.assignedTo || note.assignedTo.length === 0) && isCreator;
            return isAssigned || isCreator || isLegacy;
        });
        
        setNotes(userNotes);
    }, [caseData.myNotes, caseData.id, currentUser]);

    const handleOpenModal = (note: MyNote | null) => {
        setEditingNote(note);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingNote(null);
    };

    const handleSaveNote = async (noteData: Pick<MyNote, 'content' | 'color' | 'assignedTo'> & { id?: string }) => {
        const allNotesFromCase = Array.isArray(caseData.myNotes) ? [...caseData.myNotes] : [];
        const finalAssignedTo = noteData.assignedTo && noteData.assignedTo.length > 0 ? noteData.assignedTo : [currentUser.id];

        let updatedAllNotes: MyNote[];

        if (noteData.id) { // Editing existing note
            updatedAllNotes = allNotesFromCase.map(n => 
                n.id === noteData.id 
                    ? { 
                        ...n, 
                        content: noteData.content, 
                        color: noteData.color,
                        assignedTo: finalAssignedTo
                      } 
                    : n
            );
        } else { // Adding new note
            const newNote: MyNote = {
                id: `note-${Date.now()}`,
                content: noteData.content,
                color: noteData.color,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.id,
                assignedTo: finalAssignedTo
            };
            updatedAllNotes = [newNote, ...allNotesFromCase];
        }
        
        await onUpdateCase({ ...caseData, myNotes: updatedAllNotes });
        handleCloseModal();
    };

    const handleDeleteNote = (noteId: string) => {
        requestConfirmation(
            'Eliminar Nota',
            '¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer.',
            async () => {
                const allNotesFromCase = Array.isArray(caseData.myNotes) ? caseData.myNotes : [];
                const updatedNotes = allNotesFromCase.filter(n => n.id !== noteId);
                await onUpdateCase({ ...caseData, myNotes: updatedNotes });
            }
        );
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragNoteRef.current = index;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => setIsDragging(true), 0);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        dragOverNoteRef.current = index;
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (dragNoteRef.current === null || dragOverNoteRef.current === null || dragNoteRef.current === dragOverNoteRef.current) {
            setIsDragging(false);
            return;
        }

        const currentUserNotes = [...notes];
        const draggedItem = currentUserNotes.splice(dragNoteRef.current, 1)[0];
        currentUserNotes.splice(dragOverNoteRef.current, 0, draggedItem);
        
        const allNotesFromCase = Array.isArray(caseData.myNotes) ? caseData.myNotes : [];
        const nonVisibleNotes = allNotesFromCase.filter(n => !currentUserNotes.some(un => un.id === n.id));
        const finalNotes = [...currentUserNotes, ...nonVisibleNotes];
        
        setNotes(currentUserNotes);
        onUpdateCase({ ...caseData, myNotes: finalNotes });

        dragNoteRef.current = null;
        dragOverNoteRef.current = null;
        setIsDragging(false);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        dragNoteRef.current = null;
        dragOverNoteRef.current = null;
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3">
                        <IoJournalOutline className="text-2xl text-teal-600" />
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Notas del Caso</h2>
                            <p className="text-sm text-slate-600">
                                Tus notas personales y notas compartidas con otros técnicos del caso.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal(null)}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-semibold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
                    >
                        <IoAddOutline className="text-xl" />
                        Añadir Nota
                    </button>
                </div>

                {notes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 p-2" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                        {notes.map((note, index) => (
                            <div
                                key={note.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`transition-opacity ${isDragging && dragNoteRef.current === index ? 'opacity-40' : 'opacity-100'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                            >
                                <PostItCard 
                                    note={note}
                                    onEdit={() => handleOpenModal(note)}
                                    onDelete={() => handleDeleteNote(note.id)}
                                    currentUser={currentUser}
                                    professionals={professionals}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-20 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-700">No hay notas todavía</h2>
                        <p className="text-slate-500 mt-2">Crea tu primera nota personal o escribe una nota para otro técnico.</p>
                     </div>
                )}
            </div>

            <NoteEditorModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveNote}
                initialData={editingNote}
                professionals={professionals}
                currentUser={currentUser}
                caseProfessionalIds={caseData.professionalIds}
            />
        </>
    );
};

export default MyNotesView;