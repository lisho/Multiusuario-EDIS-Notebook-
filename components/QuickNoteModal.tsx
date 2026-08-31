import React, { useState, useEffect, useMemo } from 'react';
import { IoCloseOutline, IoSaveOutline } from 'react-icons/io5';
import { Professional, ProfessionalRole, User } from '../types';

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteContent: string, assignedTo?: string[]) => void;
  caseName: string;
  professionals?: Professional[];
  currentUser?: User | null;
  caseProfessionalIds?: string[];
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const QuickNoteModal: React.FC<QuickNoteModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  caseName,
  professionals = [],
  currentUser,
  caseProfessionalIds
}) => {
  const [content, setContent] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const availableProfessionals = useMemo(() => {
    const edisProfs = professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
    if (caseProfessionalIds && caseProfessionalIds.length > 0) {
      const caseProfs = edisProfs.filter(p => caseProfessionalIds.includes(p.id));
      return caseProfs.length > 0 ? caseProfs : edisProfs;
    }
    return edisProfs;
  }, [professionals, caseProfessionalIds]);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setError(null);
      setAssignedTo(currentUser?.id ? [currentUser.id] : []);
    }
  }, [isOpen, currentUser]);

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

  const validate = (): boolean => {
    if (!content.trim()) {
      setError('La nota no puede estar vacía.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const finalAssignedTo = assignedTo.length > 0 ? assignedTo : (currentUser?.id ? [currentUser.id] : []);
      onSave(content.trim(), finalAssignedTo);
      setContent('');
      onClose();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) return null;

  const isOnlyMe = currentUser?.id && assignedTo.length === 1 && assignedTo[0] === currentUser.id;
  const isAllSelected = availableProfessionals.length > 0 && assignedTo.length === availableProfessionals.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Añadir Nota Rápida</h2>
            <p className="text-sm text-slate-500">Para el caso de: {caseName}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 rounded-full p-1 hover:bg-slate-100 transition-colors">
            <IoCloseOutline className="text-2xl" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
          <div>
            <label htmlFor="note-content" className="block text-slate-700 font-semibold mb-2">Contenido de la nota</label>
            <textarea
              id="note-content"
              rows={4}
              value={content}
              onChange={handleContentChange}
              className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 text-slate-900 placeholder:text-slate-400 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`}
              placeholder="Escribe tu nota aquí..."
              required
              autoFocus
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>

          {/* Recipient Selection */}
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
                      className={`w-full flex items-center justify-between p-1.5 rounded-md text-left transition-all ${isSelected ? 'bg-teal-50 border border-teal-300' : 'hover:bg-slate-100 border border-transparent'}`}
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

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
              <IoSaveOutline />
              Guardar Nota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickNoteModal;
