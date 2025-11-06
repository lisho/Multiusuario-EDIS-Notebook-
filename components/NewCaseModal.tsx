import React, { useState } from 'react';
import { IoCloseOutline, IoSaveOutline } from 'react-icons/io5';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCase: (newCaseData: { name: string }) => void;
}

const NewCaseModal: React.FC<NewCaseModalProps> = ({ isOpen, onClose, onAddCase }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!name.trim()) {
      setError('El nombre del caso es obligatorio.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onAddCase({ name: name.trim() });
      setName('');
      onClose(); // Close modal on successful submission
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Crear Nuevo Caso</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <IoCloseOutline className="text-2xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="case-name" className="block text-slate-700 font-semibold mb-2">Nombre Completo</label>
            <input
              id="case-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 placeholder:text-slate-500 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`}
              placeholder="Ej. Juan Pérez"
              required
              autoFocus
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="p-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200" title="Cancelar">
              <IoCloseOutline className="text-2xl" />
            </button>
            <button type="submit" className="p-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700" title="Crear Caso">
              <IoSaveOutline className="text-2xl" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCaseModal;