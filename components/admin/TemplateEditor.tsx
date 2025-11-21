
import React, { useState, useEffect, useRef } from 'react';
import { AdminTool, ToolField, FieldType, InterventionMoment, AutoFillSource } from '../../types';
import { IoCogOutline, IoCloseOutline, IoAddOutline, IoSaveOutline, IoDocumentTextOutline, IoListOutline, IoArrowForwardOutline } from 'react-icons/io5';

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tool: AdminTool) => void;
  initialData?: AdminTool | null;
  defaultMoment: InterventionMoment;
}

type FormErrors = {
    name?: string;
    fields?: { [index: number]: { label?: string } };
};

type Tab = 'fields' | 'document';

const getNewTool = (moment: InterventionMoment): AdminTool => ({
    id: `tool-${Date.now()}`,
    name: '',
    description: '',
    moment: moment,
    fields: [],
    documentTemplate: '',
});

const autoFillOptions: { value: AutoFillSource; label: string }[] = [
    { value: 'name', label: 'Nombre del Caso' },
    { value: 'nickname', label: 'Apodo' },
    { value: 'dni', label: 'DNI / Documento' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'email', label: 'Email' },
    { value: 'address', label: 'Dirección' },
];

const TemplateEditor: React.FC<TemplateEditorProps> = ({ isOpen, onClose, onSave, initialData, defaultMoment }) => {
  const [tool, setTool] = useState<AdminTool>(getNewTool(defaultMoment));
  const [errors, setErrors] = useState<FormErrors>({});
  const [activeTab, setActiveTab] = useState<Tab>('fields');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTool(initialData ? JSON.parse(JSON.stringify(initialData)) : getNewTool(defaultMoment));
      setErrors({});
      setActiveTab('fields');
    }
  }, [isOpen, initialData, defaultMoment]);

  const handleToolChange = (prop: keyof Omit<AdminTool, 'fields'>, value: any) => {
    setTool(prev => ({ ...prev, [prop]: value }));
    if (prop === 'name' && errors.name) {
        setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleFieldChange = (index: number, prop: keyof ToolField, value: any) => {
    const newFields = [...tool.fields];
    (newFields[index] as any)[prop] = value === '' ? undefined : value;
    setTool({ ...tool, fields: newFields });

    if (prop === 'label' && errors.fields?.[index]?.label) {
        const newFieldErrors = { ...errors.fields };
        delete newFieldErrors[index];
        setErrors(prev => ({ ...prev, fields: newFieldErrors }));
    }
  };
  
  const handleOptionsChange = (index: number, optionsString: string) => {
    const options = optionsString.split('\n').map(opt => opt.trim()).filter(Boolean);
    handleFieldChange(index, 'options', options);
  };

  const addField = () => {
    const newField: ToolField = {
      id: `field-${Date.now()}`,
      label: '',
      type: FieldType.Text,
      placeholder: '',
      options: [],
    };
    setTool({ ...tool, fields: [...tool.fields, newField] });
  };
  
  const removeField = (index: number) => {
    const newFields = tool.fields.filter((_, i) => i !== index);
    setTool({ ...tool, fields: newFields });
  };
  
  const insertVariable = (fieldId: string) => {
      if (textareaRef.current) {
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          const text = tool.documentTemplate || '';
          const variable = `{{${fieldId}}}`;
          const newText = text.substring(0, start) + variable + text.substring(end);
          
          handleToolChange('documentTemplate', newText);
          
          // Restore focus and move cursor
          setTimeout(() => {
              if (textareaRef.current) {
                  textareaRef.current.focus();
                  textareaRef.current.selectionStart = start + variable.length;
                  textareaRef.current.selectionEnd = start + variable.length;
              }
          }, 0);
      } else {
          // Fallback if ref not active
          handleToolChange('documentTemplate', (tool.documentTemplate || '') + `{{${fieldId}}}`);
      }
  };
  
  const validate = (): boolean => {
      const newErrors: FormErrors = { fields: {} };
      let isValid = true;

      if (!tool.name.trim()) {
          newErrors.name = "El nombre de la herramienta es obligatorio.";
          isValid = false;
      }

      tool.fields.forEach((field, index) => {
          if (!field.label.trim()) {
              if (!newErrors.fields) newErrors.fields = {};
              newErrors.fields[index] = { label: "La etiqueta del campo es obligatoria." };
              isValid = false;
          }
      });
      
      setErrors(newErrors);
      return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(validate()) {
        onSave({
            ...tool,
            name: tool.name.trim(),
            fields: tool.fields.map(f => ({ ...f, label: f.label.trim() }))
        });
    }
  };

  if (!isOpen) return null;

  const formInputStyle = (hasError: boolean) => `w-full px-3 py-2 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 placeholder:text-slate-500 ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`;
  const labelStyle = "block text-sm text-slate-700 font-semibold mb-1";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl m-4 max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <IoCogOutline className="text-2xl text-teal-600" />
            {initialData ? 'Editar Herramienta' : 'Crear Herramienta'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
        </div>
        
        <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button
                type="button"
                onClick={() => setActiveTab('fields')}
                className={`pb-2 px-4 font-semibold text-sm flex items-center gap-2 transition-colors ${activeTab === 'fields' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <IoListOutline className="text-lg" /> Configuración de Campos
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('document')}
                className={`pb-2 px-4 font-semibold text-sm flex items-center gap-2 transition-colors ${activeTab === 'document' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <IoDocumentTextOutline className="text-lg" /> Diseño de Documento
            </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-hidden flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 flex-shrink-0">
                <div className="md:col-span-3">
                    <label htmlFor="tool-name" className={labelStyle}>Nombre</label>
                    <input id="tool-name" type="text" value={tool.name} onChange={(e) => handleToolChange('name', e.target.value)} className={formInputStyle(!!errors.name)} required />
                    {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="tool-moment" className={labelStyle}>Momento de Intervención</label>
                    <select id="tool-moment" value={tool.moment} onChange={(e) => handleToolChange('moment', e.target.value as InterventionMoment)} className={formInputStyle(false)}>
                        {Object.values(InterventionMoment).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="md:col-span-5">
                    <label htmlFor="tool-desc" className={labelStyle}>Descripción</label>
                    <textarea id="tool-desc" value={tool.description} onChange={(e) => handleToolChange('description', e.target.value)} className={formInputStyle(false)} rows={2}></textarea>
                </div>
            </div>

            <div className="flex-grow overflow-hidden relative">
                {activeTab === 'fields' && (
                    <div className="h-full overflow-y-auto pr-2">
                        <h3 className="font-bold text-slate-800 mb-3">Campos del Formulario</h3>
                        <div className="space-y-4">
                            {tool.fields.map((field, index) => (
                                <div key={field.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelStyle}>Etiqueta del campo</label>
                                            <input type="text" value={field.label} onChange={(e) => handleFieldChange(index, 'label', e.target.value)} className={formInputStyle(!!errors.fields?.[index]?.label)} placeholder="Ej. Nombre completo" />
                                            {errors.fields?.[index]?.label && <p className="text-red-600 text-sm mt-1">{errors.fields?.[index]?.label}</p>}
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Tipo de campo</label>
                                            <select value={field.type} onChange={(e) => handleFieldChange(index, 'type', e.target.value as FieldType)} className={formInputStyle(false)}>
                                                {Object.values(FieldType).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelStyle}>Autorrellenar con (Opcional)</label>
                                            <select 
                                                value={field.autoFillSource || ''} 
                                                onChange={(e) => handleFieldChange(index, 'autoFillSource', e.target.value)} 
                                                className={formInputStyle(false)}
                                            >
                                                <option value="">-- No autorrellenar --</option>
                                                {autoFillOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        {(field.type === FieldType.Text || field.type === FieldType.Textarea) && (
                                            <div className="md:col-span-2">
                                                <label className={labelStyle}>Texto de ejemplo (Placeholder)</label>
                                                <input type="text" value={field.placeholder} onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)} className={formInputStyle(false)} />
                                            </div>
                                        )}
                                        {field.type === FieldType.Select && (
                                            <div className="md:col-span-2">
                                                <label className={labelStyle}>Opciones (una por línea)</label>
                                                <textarea value={(field.options || []).join('\n')} onChange={(e) => handleOptionsChange(index, e.target.value)} className={formInputStyle(false)} rows={3}></textarea>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right mt-2">
                                        <button type="button" onClick={() => removeField(index)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Eliminar Campo</button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addField} className="w-full border-2 border-dashed border-slate-300 text-slate-600 h-10 rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-colors flex justify-center items-center" title="Añadir Campo">
                                <IoAddOutline className="text-2xl" />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'document' && (
                    <div className="h-full flex flex-col md:flex-row gap-6">
                        <div className="flex-grow flex flex-col h-full">
                            <label className={labelStyle}>Plantilla de Texto</label>
                            <p className="text-xs text-slate-500 mb-2">Escribe el contenido del documento. Usa el panel lateral para insertar las respuestas del formulario.</p>
                            <textarea 
                                ref={textareaRef}
                                value={tool.documentTemplate || ''} 
                                onChange={(e) => handleToolChange('documentTemplate', e.target.value)} 
                                className="flex-grow w-full rounded-lg border border-slate-300 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed bg-slate-50" 
                                placeholder="Ej: Yo, {{field-123}}, con DNI {{field-456}}, autorizo..."
                            ></textarea>
                        </div>
                        <div className="w-full md:w-64 flex-shrink-0 flex flex-col bg-slate-50 border-l border-slate-200 p-4 -mr-6 overflow-y-auto">
                            <h4 className="font-bold text-slate-700 mb-3 text-sm">Insertar Variables</h4>
                            <p className="text-xs text-slate-500 mb-4">Haz clic en un campo para insertarlo en la plantilla.</p>
                            <div className="space-y-2">
                                {tool.fields.map(field => (
                                    <button
                                        key={field.id}
                                        type="button"
                                        onClick={() => insertVariable(field.id)}
                                        className="w-full text-left p-2 bg-white border border-slate-200 rounded hover:border-teal-500 hover:bg-teal-50 transition-colors group"
                                    >
                                        <p className="text-xs font-semibold text-slate-800 truncate">{field.label || '(Sin etiqueta)'}</p>
                                        <p className="text-[10px] text-slate-400 group-hover:text-teal-600 flex items-center gap-1">
                                            Insertar <IoArrowForwardOutline/>
                                        </p>
                                    </button>
                                ))}
                                {tool.fields.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">No hay campos definidos. Añade campos en la pestaña "Configuración de Campos".</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </form>
        
        <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="p-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200" title="Cancelar">
              <IoCloseOutline className="text-2xl" />
            </button>
            <button type="button" onClick={handleSubmit} className="p-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700" title="Guardar Herramienta">
              <IoSaveOutline className="text-2xl" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;