import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../types';
import { IoPeopleOutline, IoCloseOutline, IoSaveOutline } from 'react-icons/io5';

interface FamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Omit<FamilyMember, 'id'> & { id?: string }) => void;
  initialData?: FamilyMember | null;
  caseAddress: string;
}

type FormErrors = {
    name?: string;
    relationship?: string;
    email?: string;
};

const familyRelationships = ['Padre', 'Madre', 'Hijo/a', 'Hermano/a', 'Abuelo/a', 'Nieto/a', 'Tío/a', 'Sobrino/a', 'Primo/a', 'Cónyuge', 'Pareja', 'Otro familiar'];
const nonFamilyRelationships = ['Amigo/a', 'Vecino/a', 'Compañero/a de trabajo', 'Profesional de referencia', 'Otro no familiar'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getInitialFormData = (initialData?: FamilyMember | null): Omit<FamilyMember, 'id'> & { id?: string } => ({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    relationship: initialData?.relationship || '',
    birthDate: initialData?.birthDate || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    notes: initialData?.notes || '',
    isFamily: initialData?.isFamily ?? true,
    isConflictual: initialData?.isConflictual || false,
});

const FamilyMemberModal: React.FC<FamilyMemberModalProps> = ({ isOpen, onClose, onSave, initialData, caseAddress }) => {
    const [formData, setFormData] = useState(getInitialFormData(initialData));
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData(initialData));
            setErrors({});
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name === 'isFamily') {
             const isFamily = value === 'true';
             setFormData(prev => ({
                ...prev,
                isFamily,
                // Reset relationship if category changes
                relationship: ''
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }

        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };
    
    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio.';
        if (!formData.relationship.trim()) newErrors.relationship = 'La relación es obligatoria.';
        if (formData.email && !emailRegex.test(formData.email)) newErrors.email = 'El formato del correo no es válido.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
        }
    };
    
    if (!isOpen) return null;

    const formInputStyle = (hasError: boolean) => `w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 placeholder:text-slate-500 ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`;
    const relationshipOptions = formData.isFamily ? familyRelationships : nonFamilyRelationships;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <IoPeopleOutline className="text-teal-600"/>
                        {initialData ? 'Editar Contacto' : 'Añadir Contacto'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-slate-700 font-semibold mb-2">Nombre Completo</label>
                            <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className={formInputStyle(!!errors.name)} placeholder="Ej. Ana García" />
                            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label htmlFor="relationship" className="block text-slate-700 font-semibold mb-2">Relación</label>
                            <select id="relationship" name="relationship" value={formData.relationship} onChange={handleChange} className={formInputStyle(!!errors.relationship)}>
                                <option value="">Selecciona...</option>
                                {relationshipOptions.map(rel => <option key={rel} value={rel}>{rel}</option>)}
                            </select>
                            {errors.relationship && <p className="text-red-600 text-sm mt-1">{errors.relationship}</p>}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="isFamily" value="true" checked={formData.isFamily} onChange={handleChange} className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300" />
                            <span className="text-slate-700 font-medium">Es Familiar</span>
                        </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="isFamily" value="false" checked={!formData.isFamily} onChange={handleChange} className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300" />
                            <span className="text-slate-700 font-medium">No es Familiar</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="birthDate" className="block text-slate-700 font-semibold mb-2">Fecha de Nacimiento</label>
                            <input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className={formInputStyle(false)} />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-slate-700 font-semibold mb-2">Teléfono</label>
                            <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className={formInputStyle(false)} />
                        </div>
                        <div className="md:col-span-2">
                             <label htmlFor="email" className="block text-slate-700 font-semibold mb-2">Correo Electrónico</label>
                            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={formInputStyle(!!errors.email)} />
                            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                        </div>
                         <div className="md:col-span-2">
                             <label htmlFor="address" className="block text-slate-700 font-semibold mb-2">Dirección</label>
                            <div className="flex items-center gap-2">
                                <input id="address" name="address" type="text" value={formData.address} onChange={handleChange} className={formInputStyle(false)} />
                                {caseAddress && <button type="button" onClick={() => setFormData(prev => ({ ...prev, address: caseAddress }))} className="text-sm text-teal-600 hover:text-teal-800 whitespace-nowrap">Usar la del caso</button>}
                            </div>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-slate-700 font-semibold mb-2">Anotaciones</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className={formInputStyle(false)} rows={3} placeholder="Añade detalles sobre la relación, apoyos, etc."></textarea>
                    </div>
                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="isConflictual" checked={formData.isConflictual} onChange={handleChange} className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500"/>
                            <span className="text-slate-700 font-medium">Marcar como relación conflictiva</span>
                        </label>
                    </div>
                </form>
                 <div className="flex justify-end gap-4 p-4 mt-auto border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="py-2 px-4 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold">Cancelar</button>
                    <button type="button" onClick={handleSubmit} className="py-2 px-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2">
                        <IoSaveOutline />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FamilyMemberModal;
