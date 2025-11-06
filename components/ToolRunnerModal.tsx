import React, { useState, useEffect } from 'react';
import { AdminTool, ToolField, FieldType } from '../types';
import { IoDocumentTextOutline, IoCloseOutline, IoSaveOutline } from 'react-icons/io5';

interface ToolRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (answers: Record<string, any>) => void;
  tool: AdminTool;
  initialAnswers?: Record<string, any>;
}

const ToolRunnerModal: React.FC<ToolRunnerModalProps> = ({ isOpen, onClose, onSave, tool, initialAnswers }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
        const defaultAnswers = tool.fields.reduce((acc, field) => {
            acc[field.id] = field.type === FieldType.Checkbox ? false : '';
            return acc;
        }, {} as Record<string, any>);
      setAnswers(initialAnswers || defaultAnswers);
    }
  }, [isOpen, tool, initialAnswers]);

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(answers);
  };

  if (!isOpen) return null;
  
  const formInputStyle = "w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-100 text-slate-900 placeholder:text-slate-500";

  const renderField = (field: ToolField) => {
    const value = answers[field.id];

    switch (field.type) {
      case FieldType.Text:
        return <input type="text" value={value} onChange={e => handleAnswerChange(field.id, e.target.value)} className={formInputStyle} placeholder={field.placeholder} />;
      case FieldType.Textarea:
        return <textarea value={value} onChange={e => handleAnswerChange(field.id, e.target.value)} className={formInputStyle} placeholder={field.placeholder} rows={4} />;
      case FieldType.Date:
        return <input type="date" value={value} onChange={e => handleAnswerChange(field.id, e.target.value)} className={formInputStyle} />;
      case FieldType.Checkbox:
        return (
          <div className="flex items-center h-full">
            <input type="checkbox" checked={!!value} onChange={e => handleAnswerChange(field.id, e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
          </div>
        );
      case FieldType.Select:
        return (
          <select value={value} onChange={e => handleAnswerChange(field.id, e.target.value)} className={formInputStyle}>
            <option value="">Selecciona...</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <IoDocumentTextOutline className="text-2xl text-teal-600" />
            <div>
                <h2 className="text-2xl font-bold text-slate-800">{tool.name}</h2>
                <p className="text-sm text-slate-500">{tool.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
            {tool.fields.map(field => (
                <div key={field.id}>
                    <label className="block text-sm text-slate-700 font-semibold mb-1">{field.label}</label>
                    {renderField(field)}
                </div>
            ))}
        </form>
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="p-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200" title="Cancelar">
            <IoCloseOutline className="text-2xl" />
          </button>
          <button type="submit" onClick={handleSubmit} className="p-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700" title="Guardar Registro">
            <IoSaveOutline className="text-2xl" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolRunnerModal;