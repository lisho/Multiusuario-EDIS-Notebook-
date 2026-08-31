import React, { useState, useEffect, useMemo } from 'react';
import { Case, CaseStatus, Professional, ProfessionalRole, User } from '../types';
import { IoCloseOutline, IoSaveOutline, IoPersonOutline, IoCheckmarkCircle, IoPeopleOutline } from 'react-icons/io5';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (caseId: string | null, text: string, assignedTo?: string[]) => void;
  cases: Case[];
  professionals: Professional[];
  currentUser: User | null;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onAddTask, cases, professionals, currentUser }) => {
  const [caseId, setCaseId] = useState('');
  const [text, setText] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const activeCases = useMemo(() => 
    cases.filter(c => c.status !== CaseStatus.Closed).sort((a, b) => a.name.localeCompare(b.name)),
    [cases]
  );

  // Strictly filter only EDIS Technicians for task assignment
  const edisTechnicians = useMemo(() => {
    return professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
  }, [professionals]);

  // If a case is selected, check which EDIS technicians are assigned to that case
  const caseTechnicianIds = useMemo(() => {
    if (!caseId) return [];
    const selectedCase = cases.find(c => c.id === caseId);
    if (!selectedCase || !selectedCase.professionalIds) return [];
    return selectedCase.professionalIds;
  }, [caseId, cases]);

  useEffect(() => {
    if (isOpen) {
      setCaseId('');
      setText('');
      setError(null);
      setAssignedTo(currentUser?.id ? [currentUser.id] : []);
    }
  }, [isOpen, currentUser]);

  const handleAssigneeToggle = (profId: string) => {
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

  const handleSelectAllEdis = () => {
    setAssignedTo(edisTechnicians.map(t => t.id));
  };

  const isOnlyMeSelected = currentUser?.id && assignedTo.length === 1 && assignedTo[0] === currentUser.id;
  const isAllEdisSelected = edisTechnicians.length > 0 && assignedTo.length === edisTechnicians.length;

  const validate = (): boolean => {
    if (!text.trim()) {
      setError('La descripción de la tarea es obligatoria.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const finalAssignedTo = assignedTo.length > 0 ? assignedTo : (currentUser?.id ? [currentUser.id] : undefined);
      onAddTask(caseId || null, text.trim(), finalAssignedTo);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-base">
              ✓
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Crear Nueva Tarea</h2>
              <p className="text-xs text-slate-500">Asigna tareas generales o asociadas a casos a técnicos EDIS</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            title="Cerrar modal"
          >
            <IoCloseOutline className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="case-select" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Destino de la Tarea (Opcional)
            </label>
            <select
              id="case-select"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 text-slate-900 border-slate-300 focus:ring-teal-500"
            >
              <option value="">📋 Tarea General (Sin caso asociado)</option>
              {activeCases.map(c => (
                <option key={c.id} value={c.id}>
                  📁 Caso: {c.name} {c.nickname ? `(${c.nickname})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* EDIS TECHNICIANS ASSIGNMENT SECTION */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <IoPersonOutline className="text-teal-600 text-sm" />
                Asignar a Técnico/a EDIS:
              </label>
              <div className="flex items-center gap-1.5">
                {currentUser && (
                  <button
                    type="button"
                    onClick={handleSelectOnlyMe}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      isOnlyMeSelected
                        ? 'bg-teal-100 text-teal-800 border-teal-300 font-semibold'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Solo a mí
                  </button>
                )}
                {edisTechnicians.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSelectAllEdis}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      isAllEdisSelected
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Todo el equipo EDIS
                  </button>
                )}
              </div>
            </div>

            {edisTechnicians.length > 0 ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {edisTechnicians.map(p => {
                    const isSelected = assignedTo.includes(p.id);
                    const isMe = currentUser && p.id === currentUser.id;
                    const isCaseTech = caseId && caseTechnicianIds.includes(p.id);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAssigneeToggle(p.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-2xs ring-1 ring-teal-400 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-teal-200 text-teal-900 flex items-center justify-center font-bold text-[10px] overflow-hidden flex-shrink-0">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(p.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">
                            {p.name} {isMe ? '(Tú)' : ''}
                          </p>
                          {isCaseTech && (
                            <span className="text-[10px] text-teal-700 font-medium block">
                              En el caso
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <IoCheckmarkCircle className="text-teal-600 text-base flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                No hay técnicos EDIS registrados en el sistema.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="task-text" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Descripción de la Tarea
            </label>
            <textarea
              id="task-text"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 text-slate-900 placeholder:text-slate-400 resize-none ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'
              }`}
              placeholder="Ej. Llamar para coordinar cita con el usuario, preparar informe de seguimiento..."
              required
            />
          </div>

          {error && <p className="text-red-600 text-xs mt-1 font-medium">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <IoSaveOutline className="text-base" />
              Guardar Tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal;