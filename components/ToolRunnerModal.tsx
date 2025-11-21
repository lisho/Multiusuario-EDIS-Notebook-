
import React, { useState, useEffect, useMemo } from 'react';
import { AdminTool, ToolField, FieldType, Case } from '../types';
import { IoDocumentTextOutline, IoCloseOutline, IoSaveOutline, IoPrintOutline, IoCreateOutline } from 'react-icons/io5';

interface ToolRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (answers: Record<string, any>) => void;
  tool: AdminTool;
  initialAnswers?: Record<string, any>;
  caseData?: Case;
}

const ToolRunnerModal: React.FC<ToolRunnerModalProps> = ({ isOpen, onClose, onSave, tool, initialAnswers, caseData }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'form' | 'document'>('form');

  useEffect(() => {
    if (isOpen) {
        setActiveTab('form');
        if (initialAnswers) {
            setAnswers(initialAnswers);
        } else {
            const defaultAnswers = tool.fields.reduce((acc, field) => {
                let value: any = field.type === FieldType.Checkbox ? false : '';
                
                // Auto-fill logic
                if (field.autoFillSource && caseData) {
                    const sourceValue = caseData[field.autoFillSource];
                    if (sourceValue) {
                        value = sourceValue;
                    }
                }
                
                acc[field.id] = value;
                return acc;
            }, {} as Record<string, any>);
            setAnswers(defaultAnswers);
        }
    }
  }, [isOpen, tool, initialAnswers, caseData]);

  const generatedDocument = useMemo(() => {
      if (!tool.documentTemplate) return '';
      
      let doc = tool.documentTemplate;
      tool.fields.forEach(field => {
          const value = answers[field.id];
          let displayValue = '';
          
          if (field.type === FieldType.Checkbox) {
              displayValue = value ? 'SÍ' : 'NO';
          } else if (value !== undefined && value !== null) {
              displayValue = String(value);
          } else {
              displayValue = '__________'; // Placeholder for empty
          }
          
          // Replace all instances of the variable
          const regex = new RegExp(`{{${field.id}}}`, 'g');
          doc = doc.replace(regex, displayValue);
      });
      return doc;
  }, [tool.documentTemplate, tool.fields, answers]);

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(answers);
  };
  
  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`
            <html>
                <head>
                    <title>Documento Generado - ${tool.name}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                        h1 { font-size: 18px; text-align: center; margin-bottom: 20px; text-transform: uppercase; }
                        p { white-space: pre-wrap; margin-bottom: 15px; }
                        .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; text-align: center; color: #666; }
                    </style>
                </head>
                <body>
                    <h1>${tool.name}</h1>
                    <p>${generatedDocument}</p>
                    <div class="footer">Generado automáticamente por EDIS - Cuaderno de Campo Digital</div>
                </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          // printWindow.close(); // Optional: close after print
      }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 flex-shrink-0 px-6 pt-6">
          <div className="flex items-center gap-3">
            <IoDocumentTextOutline className="text-2xl text-teal-600" />
            <div>
                <h2 className="text-2xl font-bold text-slate-800">{tool.name}</h2>
                <p className="text-sm text-slate-500">{tool.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
        </div>
        
        {tool.documentTemplate && (
            <div className="flex gap-4 mb-4 border-b border-slate-200 px-6 flex-shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab('form')}
                    className={`pb-2 px-4 font-semibold text-sm flex items-center gap-2 transition-colors ${activeTab === 'form' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <IoCreateOutline className="text-lg" /> Formulario
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('document')}
                    className={`pb-2 px-4 font-semibold text-sm flex items-center gap-2 transition-colors ${activeTab === 'document' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <IoDocumentTextOutline className="text-lg" /> Documento Generado
                </button>
            </div>
        )}

        <div className="flex-grow overflow-y-auto px-6 pb-6">
            {activeTab === 'form' && (
                <form id="tool-form" onSubmit={handleSubmit} className="space-y-4">
                    {tool.fields.map(field => (
                        <div key={field.id}>
                            <label className="block text-sm text-slate-700 font-semibold mb-1">
                                {field.label}
                                {field.autoFillSource && <span className="ml-2 text-xs text-teal-600 font-normal">(Autocompletado)</span>}
                            </label>
                            {renderField(field)}
                        </div>
                    ))}
                </form>
            )}
            {activeTab === 'document' && (
                <div className="bg-slate-50 border border-slate-200 p-8 rounded-lg min-h-[300px]">
                    <div className="bg-white shadow-sm border border-slate-100 p-8 max-w-2xl mx-auto">
                        <h3 className="text-center font-bold uppercase text-lg mb-6 text-slate-800">{tool.name}</h3>
                        <div className="whitespace-pre-wrap text-slate-800 font-serif leading-relaxed">
                            {generatedDocument}
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="flex justify-between gap-4 p-6 border-t border-slate-200 flex-shrink-0">
            <div>
                {activeTab === 'document' && (
                    <button type="button" onClick={handlePrint} className="px-4 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-semibold flex items-center gap-2 shadow-sm">
                        <IoPrintOutline className="text-xl"/> Imprimir
                    </button>
                )}
            </div>
            <div className="flex gap-4">
                <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold" title="Cancelar">
                    Cancelar
                </button>
                <button type="submit" form="tool-form" className="px-4 py-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2">
                    <IoSaveOutline className="text-xl" />
                    Guardar Registro
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ToolRunnerModal;