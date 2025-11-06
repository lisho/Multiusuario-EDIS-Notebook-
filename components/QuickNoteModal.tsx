import React, { useState, useEffect } from 'react';
import { IoCloseOutline, IoSaveOutline } from 'react-icons/io5';

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteContent: string) => void;
  caseName: string;
}

const QuickNoteModal: React.FC<QuickNoteModalProps> = ({ isOpen, onClose, onSave, caseName }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setError(null);
    }
  }, [isOpen]);

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
      onSave(content.trim());
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Añadir Nota Rápida</h2>
            <p className="text-sm text-slate-500">Para el caso de: {caseName}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <IoCloseOutline className="text-2xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="note-content" className="block text-slate-700 font-semibold mb-2">Contenido de la nota</label>
            <textarea
              id="note-content"
              rows={5}
              value={content}
              onChange={handleContentChange}
              className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 placeholder:text-slate-500 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`}
              placeholder="Escribe tu nota aquí..."
              required
              autoFocus
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="p-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200" title="Cancelar">
              <IoCloseOutline className="text-2xl" />
            </button>
            <button type="submit" className="p-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700" title="Guardar Nota">
              <IoSaveOutline className="text-2xl" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickNoteModal;
