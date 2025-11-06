import React, { useState, useEffect } from 'react';
import { AdminTool, ToolField, FieldType, InterventionMoment } from '../../types';
import { IoCogOutline, IoCloseOutline, IoAddOutline, IoSaveOutline } from 'react-icons/io5';

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

const getNewTool = (moment: InterventionMoment): AdminTool => ({
    id: `tool-${Date.now()}`,
    name: '',
    description: '',
    moment: moment,
    fields: [],
});

const TemplateEditor: React.FC<TemplateEditorProps> = ({ isOpen, onClose, onSave, initialData, defaultMoment }) => {
  const [tool, setTool] = useState<AdminTool>(getNewTool(defaultMoment));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isOpen) {
      setTool(initialData ? JSON.parse(JSON.stringify(initialData)) : getNewTool(defaultMoment));
      setErrors({});
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
    (newFields[index] as any)[prop] = value;
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl m-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <IoCogOutline className="text-2xl text-teal-600" />
            {initialData ? 'Editar Herramienta' : 'Crear Herramienta'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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

            <div className="mt-6">
                <h3 className="font-bold text-slate-800">Campos del Formulario</h3>
                <div className="space-y-4 mt-2">
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
        </form>
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-slate-200">
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