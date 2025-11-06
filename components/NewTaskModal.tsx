import React, { useState, useEffect, useMemo } from 'react';
import { Case, CaseStatus, Professional, User } from '../types';
import { IoCloseOutline, IoSaveOutline } from 'react-icons/io5';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (caseId: string | null, text: string, assignedTo?: string[]) => void;
  cases: Case[];
  professionals: Professional[];
  currentUser: User | null;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onAddTask, cases, professionals, currentUser }) => {
  const [caseId, setCaseId] = useState('');
  const [text, setText] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const activeCases = cases.filter(c => c.status !== CaseStatus.Closed).sort((a,b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (isOpen) {
      setCaseId('');
      setText('');
      setError(null);
      setAssignedTo(currentUser?.id ? [currentUser.id] : []);
    }
  }, [isOpen, currentUser]);

  const assignedProfessionalsForSelectedCase = useMemo(() => {
    if (!caseId) return [];
    const selectedCase = cases.find(c => c.id === caseId);
    if (!selectedCase || !selectedCase.professionalIds) return [];
    // Filter out admins from the assignment list
    return professionals.filter(p => selectedCase.professionalIds!.includes(p.id) && p.systemRole !== 'admin');
  }, [caseId, cases, professionals]);

  const handleAssigneeToggle = (profId: string) => {
    setAssignedTo(prev =>
      prev.includes(profId)
        ? prev.filter(id => id !== profId)
        : [...prev, profId]
    );
  };


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
      onAddTask(caseId || null, text.trim(), caseId ? assignedTo : undefined);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Crear Nueva Tarea</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <IoCloseOutline className="text-2xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="case-select" className="block text-slate-700 font-semibold mb-2">Asignar a Caso (Opcional)</label>
            <select
              id="case-select"
              value={caseId}
              onChange={(e) => {
                  setCaseId(e.target.value);
                  // Reset assignees to current user when changing case
                  setAssignedTo(currentUser ? [currentUser.id] : []);
              }}
              className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 border-slate-300 focus:ring-teal-500`}
            >
              <option value="">-- Tarea General (sin caso) --</option>
              {activeCases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.nickname ? `(${c.nickname})` : ''}
                </option>
              ))}
            </select>
          </div>
           {caseId && (
            <div>
              <label htmlFor="assignee-select" className="block text-slate-700 font-semibold mb-2">Asignar Tarea A</label>
              <div className="p-2 bg-slate-100 border border-slate-300 rounded-lg max-h-32 overflow-y-auto">
                {assignedProfessionalsForSelectedCase.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-200">
                        <input
                            type="checkbox"
                            checked={assignedTo.includes(p.id)}
                            onChange={() => handleAssigneeToggle(p.id)}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-slate-800">{p.name}</span>
                    </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label htmlFor="task-text" className="block text-slate-700 font-semibold mb-2">Descripción de la Tarea</label>
            <input
              id="task-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 placeholder:text-slate-500 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`}
              placeholder="Ej. Llamar para coordinar cita..."
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          <div className="flex justify-end gap-4 pt-2">
            <button type="button" onClick={onClose} className="p-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200" title="Cancelar">
              <IoCloseOutline className="text-2xl" />
            </button>
            <button type="submit" className="p-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700" title="Crear Tarea">
              <IoSaveOutline className="text-2xl" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal;