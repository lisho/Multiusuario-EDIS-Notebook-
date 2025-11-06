import React, { useState, useEffect, useRef } from 'react';
import { Case, MyNote, User } from '../types';
import NoteEditorModal from './NoteEditorModal';
import { IoJournalOutline, IoAddOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';

interface MyNotesViewProps {
  caseData: Case;
  onUpdateCase: (updatedCase: Case) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  currentUser: User;
}

const colorClasses = {
    yellow: 'bg-yellow-100 border-yellow-200 rotate-[-2deg] hover:rotate-[-3deg] hover:scale-105',
    pink: 'bg-pink-100 border-pink-200 rotate-[1deg] hover:rotate-[2deg] hover:scale-105',
    blue: 'bg-blue-100 border-blue-200 rotate-[-1deg] hover:rotate-[-2deg] hover:scale-105',
    green: 'bg-green-100 border-green-200 rotate-[2deg] hover:rotate-[3deg] hover:scale-105',
};

const PostItCard: React.FC<{ note: MyNote; onEdit: () => void; onDelete: () => void; }> = ({ note, onEdit, onDelete }) => {
    const baseColorClass = colorClasses[note.color] || colorClasses.yellow;
    
    return (
        <div className={`p-4 border rounded-md shadow-md transform transition-transform duration-200 ease-in-out group ${baseColorClass}`}>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="p-1.5 bg-white/50 rounded-full hover:bg-white/80" title="Editar nota"><IoPencilOutline className="text-slate-600"/></button>
                <button onClick={onDelete} className="p-1.5 bg-white/50 rounded-full hover:bg-white/80" title="Eliminar nota"><IoTrashOutline className="text-red-600"/></button>
            </div>
            <p className="text-slate-800 whitespace-pre-wrap min-h-[100px]">{note.content}</p>
            <p className="text-xs text-slate-500 mt-2 text-right">{new Date(note.createdAt).toLocaleDateString('es-ES')}</p>
        </div>
    );
};


const MyNotesView: React.FC<MyNotesViewProps> = ({ caseData, onUpdateCase, requestConfirmation, currentUser }) => {
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
                createdAt: new Date().toISOString()
            }] : [];
        
        const userNotes = allNotes.filter(note => note.createdBy === currentUser.id);
        
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

    const handleSaveNote = async (noteData: Pick<MyNote, 'content' | 'color'> & { id?: string }) => {
        const allNotesFromCase = Array.isArray(caseData.myNotes) ? [...caseData.myNotes] : [];
        const otherUserNotes = allNotesFromCase.filter(n => n.createdBy !== currentUser.id);
        const currentUserNotes = allNotesFromCase.filter(n => n.createdBy === currentUser.id);

        let updatedCurrentUserNotes: MyNote[];

        if (noteData.id) { // Editing existing note
            updatedCurrentUserNotes = currentUserNotes.map(n => n.id === noteData.id ? { ...n, content: noteData.content, color: noteData.color } : n);
        } else { // Adding new note
            const newNote: MyNote = {
                id: `note-${Date.now()}`,
                content: noteData.content,
                color: noteData.color,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.id,
            };
            updatedCurrentUserNotes = [newNote, ...currentUserNotes];
        }
        
        const updatedNotes = [...otherUserNotes, ...updatedCurrentUserNotes];
        await onUpdateCase({ ...caseData, myNotes: updatedNotes });
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

        const currentUserNotes = [...notes]; // `notes` state is already filtered for the current user
        const draggedItem = currentUserNotes.splice(dragNoteRef.current, 1)[0];
        currentUserNotes.splice(dragOverNoteRef.current, 0, draggedItem);
        
        const allNotesFromCase = Array.isArray(caseData.myNotes) ? caseData.myNotes : [];
        const otherUserNotes = allNotesFromCase.filter(n => n.createdBy !== currentUser.id);
        const finalNotes = [...otherUserNotes, ...currentUserNotes];
        
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
                            <h2 className="text-2xl font-bold text-slate-800">Mis Notas Rápidas</h2>
                             <p className="text-sm text-slate-600">
                                Tu espacio privado para anotaciones. Arrastra las notas para reordenarlas.
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
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-20 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-700">No hay notas todavía</h2>
                        <p className="text-slate-500 mt-2">Crea tu primera nota para empezar a organizarte.</p>
                     </div>
                )}
            </div>

            <NoteEditorModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveNote}
                initialData={editingNote}
            />
        </>
    );
};

export default MyNotesView;