import React, { useState, useEffect, useMemo } from 'react';
import { Case, Intervention, InterventionStatus, InterventionType, Professional, ProfessionalRole, User } from '../types';
import { IoCloseOutline, IoTrashOutline, IoSaveOutline } from 'react-icons/io5';

interface NewEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemData: Intervention | Partial<Intervention> | null;
    cases: Case[];
    professionals: Professional[];
    currentUser: User | null;
    onSaveIntervention: (intervention: Omit<Intervention, 'id'> | Intervention) => void;
    onDeleteIntervention: (intervention: Intervention) => void;
    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
}

const getInitialState = (itemData: Intervention | Partial<Intervention> | null, currentUser: User | null): Partial<Intervention> => {
    const now = new Date();
    const start = itemData?.start ? new Date(itemData.start) : now;
    const end = itemData?.end ? new Date(itemData.end) : new Date(now.getTime() + 60 * 60 * 1000);

    let initialAssignedTo: string[] = [];
    if (itemData?.assignedTo && Array.isArray(itemData.assignedTo) && itemData.assignedTo.length > 0) {
        initialAssignedTo = itemData.assignedTo;
    } else if (itemData?.createdBy) {
        initialAssignedTo = [itemData.createdBy];
    } else if (currentUser?.id) {
        initialAssignedTo = [currentUser.id];
    }
    
    return {
        title: '',
        interventionType: InterventionType.Meeting,
        start: start.toISOString(),
        end: end.toISOString(),
        isAllDay: false,
        notes: '',
        isRegistered: false,
        caseId: null,
        status: InterventionStatus.Planned,
        ...itemData,
        assignedTo: initialAssignedTo,
    };
};

// Create a single, unified list of all intervention types for maximum flexibility.
const allInterventionTypes = Object.values(InterventionType).sort((a, b) => a.localeCompare(b));


const NewEventModal: React.FC<NewEventModalProps> = ({ isOpen, onClose, itemData, cases, professionals, currentUser, onSaveIntervention, onDeleteIntervention, requestConfirmation }) => {
    const [formData, setFormData] = useState<Partial<Intervention>>(getInitialState(itemData, currentUser));
    const [errors, setErrors] = useState<{ title?: string; date?: string }>({});

    const isEditing = itemData && 'id' in itemData;

    const edisTechnicians = useMemo(() => {
        return professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
    }, [professionals]);

    // Check if the selected case has other assigned professionals (e.g. Social Worker, Educator, etc.)
    const caseOtherProfessionals = useMemo(() => {
        if (!formData.caseId) return [];
        const currentCase = cases.find(c => c.id === formData.caseId);
        if (!currentCase || !currentCase.professionalIds) return [];
        return professionals.filter(p => 
            currentCase.professionalIds?.includes(p.id) && p.role !== ProfessionalRole.EdisTechnician
        );
    }, [formData.caseId, cases, professionals]);

    const isOnlyMeSelected = Boolean(
        currentUser?.id && 
        formData.assignedTo?.length === 1 && 
        formData.assignedTo[0] === currentUser.id
    );

    const isAllEdisSelected = Boolean(
        edisTechnicians.length > 0 && 
        edisTechnicians.every(t => (formData.assignedTo || []).includes(t.id))
    );

    const handleSelectOnlyMe = () => {
        if (!currentUser) return;
        setFormData(prev => ({ ...prev, assignedTo: [currentUser.id] }));
    };

    const handleSelectAllEdis = () => {
        setFormData(prev => ({ ...prev, assignedTo: edisTechnicians.map(t => t.id) }));
    };

    const handleClearAssigned = () => {
        setFormData(prev => ({ ...prev, assignedTo: [] }));
    };

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialState(itemData, currentUser));
            setErrors({});
        }
    }, [isOpen, itemData, currentUser]);

    // Converts an ISO string (UTC) to a 'YYYY-MM-DD' string in the user's local timezone for date inputs.
    const isoToInputDate = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Converts an ISO string (UTC) to a 'HH:mm' string in the user's local timezone for time inputs.
    const isoToInputTime = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name === 'isRegistered') {
            const isBeingUnchecked = !checked;
            const wasPreviouslyRegistered = isEditing && (itemData as Intervention)?.isRegistered;

            if (isBeingUnchecked && wasPreviouslyRegistered) {
                requestConfirmation(
                    'Quitar del Cuaderno de Campo',
                    'Al desmarcar esta opción, la intervención dejará de aparecer en el "Cuaderno de Campo", pero seguirá existiendo en el calendario. ¿Quieres continuar?',
                    () => {
                        setFormData(prev => ({ ...prev, isRegistered: false }));
                    }
                );
                return; 
            }
        }

        if (name === 'caseId') {
            const isNowGeneral = !value;
            setFormData(prev => {
                const newState = { ...prev, caseId: value || null };
                // If an intervention is unassigned from a case, it cannot be registered in the notebook.
                if (isNowGeneral) {
                    newState.isRegistered = false;
                }
                return newState;
            });

        } else {
             setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }

        if (name === 'title' && errors.title) {
            setErrors(prev => ({ ...prev, title: undefined }));
        }
    };
    
    const handleDateTimeChange = (field: 'start' | 'end', part: 'date' | 'time', value: string) => {
        setFormData(prev => {
            const currentISO = prev[field] || new Date().toISOString();
    
            let datePart = isoToInputDate(currentISO);
            let timePart = isoToInputTime(currentISO);
    
            if (part === 'date') {
                datePart = value;
            } else {
                timePart = value;
            }
            
            if (!datePart || !timePart) {
                return prev;
            }
    
            const localDateTime = new Date(`${datePart}T${timePart}`);
            
            if (isNaN(localDateTime.getTime())) {
                return prev;
            }
    
            const newISO = localDateTime.toISOString();
    
            const newFormData: Partial<Intervention> = { ...prev, [field]: newISO };
    
            if (field === 'start' && prev.end && prev.start) {
                const duration = new Date(prev.end).getTime() - new Date(prev.start).getTime();
                const newEndDate = new Date(localDateTime.getTime() + (duration > 0 ? duration : 3600 * 1000));
                newFormData.end = newEndDate.toISOString();
            } else if (field === 'start' && !prev.end) {
                 const newEndDate = new Date(localDateTime.getTime() + 3600 * 1000);
                 newFormData.end = newEndDate.toISOString();
            }
            
            return newFormData;
        });
    };

    useEffect(() => {
        if (formData.start && formData.end && new Date(formData.end) < new Date(formData.start)) {
            setErrors(prev => ({ ...prev, date: 'La fecha de fin no puede ser anterior a la de inicio.' }));
        } else {
            setErrors(prev => {
                const { date, ...rest } = prev;
                return rest;
            });
        }
    }, [formData.start, formData.end]);


    const validate = () => {
        const newErrors: { title?: string; date?: string } = {};
        if (!formData.title?.trim()) {
            newErrors.title = "El título es obligatorio.";
        }
        if (formData.start && formData.end && new Date(formData.end) < new Date(formData.start)) {
            newErrors.date = 'La fecha de fin no puede ser anterior a la de inicio.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const finalAssignedTo = (formData.assignedTo && formData.assignedTo.length > 0)
                ? formData.assignedTo
                : (currentUser?.id ? [currentUser.id] : []);

            onSaveIntervention({
                ...formData,
                assignedTo: finalAssignedTo,
            } as Intervention);
            onClose();
        }
    };

    const handleDelete = () => {
        if (isEditing) {
            requestConfirmation(
                'Eliminar Intervención',
                '¿Estás seguro de que quieres eliminar esta intervención? Esta acción es irreversible.',
                () => {
                    onDeleteIntervention(itemData as Intervention);
                    onClose();
                }
            );
        }
    };

    if (!isOpen) return null;

    const formInputStyle = (hasError: boolean) => `w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 placeholder:text-slate-500 disabled:bg-slate-200 ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Intervención' : 'Nueva Intervención'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-slate-700 font-semibold mb-2">Título</label>
                        <input id="title" name="title" type="text" value={formData.title} onChange={handleChange} className={formInputStyle(!!errors.title)} placeholder="Ej. Entrevista inicial" />
                        {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
                    </div>

                    <div className="pt-1">
                        <label 
                            htmlFor="isRegistered" 
                            className={`flex items-center gap-2 text-slate-700 ${!formData.caseId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            title={!formData.caseId ? "Solo se pueden registrar en el cuaderno las intervenciones asociadas a un caso." : ""}
                        >
                            <input 
                                id="isRegistered" 
                                name="isRegistered" 
                                type="checkbox" 
                                checked={!!formData.isRegistered} 
                                onChange={handleChange} 
                                className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50" 
                                disabled={!formData.caseId}
                            />
                            <span>Registrar en Cuaderno de Campo</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="caseId" className="block text-slate-700 font-semibold mb-2">Caso Asociado</label>
                            <select id="caseId" name="caseId" value={formData.caseId || ''} onChange={handleChange} className={formInputStyle(false)}>
                                <option value="">(Sin caso / General)</option>
                                {cases.map(c => <option key={c.id} value={c.id}>
                                    {c.name}{c.nickname ? ` (${c.nickname})` : ''}
                                </option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="interventionType" className="block text-slate-700 font-semibold mb-2">Tipo de Intervención</label>
                            <select id="interventionType" name="interventionType" value={formData.interventionType} onChange={handleChange} className={formInputStyle(false)}>
                                {allInterventionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label htmlFor="isAllDay" className="flex items-center gap-2 text-slate-700 cursor-pointer">
                            <input id="isAllDay" name="isAllDay" type="checkbox" checked={!!formData.isAllDay} onChange={handleChange} className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                            <span>Todo el día</span>
                        </label>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                             <label htmlFor="startDate" className="block text-slate-700 font-semibold mb-2">Inicio</label>
                             <div className="flex gap-2">
                                <input
                                    id="startDate"
                                    type="date"
                                    value={isoToInputDate(formData.start)}
                                    onChange={e => handleDateTimeChange('start', 'date', e.target.value)}
                                    className={`${formInputStyle(false)} flex-grow`}
                                />
                                {!formData.isAllDay && (
                                    <input
                                        id="startTime"
                                        type="time"
                                        value={isoToInputTime(formData.start)}
                                        onChange={e => handleDateTimeChange('start', 'time', e.target.value)}
                                        className={`${formInputStyle(false)} w-28 flex-shrink-0`}
                                    />
                                )}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-slate-700 font-semibold mb-2">Fin</label>
                            <div className="flex gap-2">
                                <input
                                    id="endDate"
                                    type="date"
                                    value={isoToInputDate(formData.end)}
                                    onChange={e => handleDateTimeChange('end', 'date', e.target.value)}
                                    className={`${formInputStyle(!!errors.date)} flex-grow`}
                                />
                                {!formData.isAllDay && (
                                    <input
                                        id="endTime"
                                        type="time"
                                        value={isoToInputTime(formData.end)}
                                        onChange={e => handleDateTimeChange('end', 'time', e.target.value)}
                                        className={`${formInputStyle(!!errors.date)} w-28 flex-shrink-0`}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {errors.date && (
                        <div className="md:col-span-2 text-right -mt-3">
                            <p className="text-red-600 text-sm">{errors.date}</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="notes" className="block text-slate-700 font-semibold mb-2">Notas</label>
                        <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} className={formInputStyle(false)} rows={4} placeholder="Añade detalles sobre la intervención..."></textarea>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-slate-700 font-semibold text-sm">
                                Asignar a Técnicos / Profesionales (Calendario y Agenda)
                            </label>
                            <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-medium border border-teal-200">
                                {(formData.assignedTo || []).length} seleccionado{(formData.assignedTo || []).length === 1 ? '' : 's'}
                            </span>
                        </div>

                        {/* Botones de selección rápida */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            {currentUser && (
                                <button
                                    type="button"
                                    onClick={handleSelectOnlyMe}
                                    className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
                                        isOnlyMeSelected
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    Solo a mí
                                </button>
                            )}
                            {edisTechnicians.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleSelectAllEdis}
                                    className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
                                        isAllEdisSelected
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    Todo el equipo EDIS ({edisTechnicians.length})
                                </button>
                            )}
                            {(formData.assignedTo || []).length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClearAssigned}
                                    className="text-xs px-2 py-1 rounded-md font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto"
                                >
                                    Desmarcar todos
                                </button>
                            )}
                        </div>

                        <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg max-h-48 overflow-y-auto space-y-1">
                            {edisTechnicians.length === 0 ? (
                                <p className="text-xs text-slate-500 p-2 text-center">No hay técnicos EDIS registrados.</p>
                            ) : (
                                edisTechnicians.map(p => {
                                    const isSelected = (formData.assignedTo || []).includes(p.id);
                                    return (
                                        <label 
                                            key={p.id} 
                                            className={`flex items-center gap-2.5 cursor-pointer p-1.5 rounded-md transition-colors ${
                                                isSelected ? 'bg-teal-50 border border-teal-200/80 text-teal-900' : 'hover:bg-slate-100 text-slate-800'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                    const current = formData.assignedTo || [];
                                                    const updated = current.includes(p.id)
                                                        ? current.filter(id => id !== p.id)
                                                        : [...current, p.id];
                                                    setFormData(prev => ({ ...prev, assignedTo: updated }));
                                                }}
                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                            />
                                            <span className="text-sm font-medium flex items-center gap-1.5">
                                                {p.name}
                                                {currentUser?.id === p.id && (
                                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">Tú</span>
                                                )}
                                            </span>
                                        </label>
                                    );
                                })
                            )}

                            {caseOtherProfessionals.length > 0 && (
                                <div className="pt-2 mt-2 border-t border-slate-200">
                                    <p className="text-[11px] font-semibold text-slate-500 mb-1 px-1">Otros profesionales del caso:</p>
                                    {caseOtherProfessionals.map(p => {
                                        const isSelected = (formData.assignedTo || []).includes(p.id);
                                        return (
                                            <label 
                                                key={p.id} 
                                                className={`flex items-center gap-2.5 cursor-pointer p-1.5 rounded-md transition-colors ${
                                                    isSelected ? 'bg-teal-50 border border-teal-200/80 text-teal-900' : 'hover:bg-slate-100 text-slate-800'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        const current = formData.assignedTo || [];
                                                        const updated = current.includes(p.id)
                                                            ? current.filter(id => id !== p.id)
                                                            : [...current, p.id];
                                                        setFormData(prev => ({ ...prev, assignedTo: updated }));
                                                    }}
                                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                />
                                                <span className="text-sm font-medium flex items-center gap-1.5">
                                                    {p.name}
                                                    <span className="text-xs text-slate-500">({p.role})</span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Los técnicos asignados verán esta actuación automáticamente en su calendario y en la agenda de hoy.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-slate-700 font-semibold mb-2">Estado</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className={formInputStyle(false)}>
                            {Object.values(InterventionStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </form>
                <div className="flex justify-between items-center p-4 border-t border-slate-200">
                    <div>
                    {isEditing && (
                        <button type="button" onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 font-semibold flex items-center gap-2 rounded-lg transition-colors">
                            <IoTrashOutline className="text-xl" />
                            Eliminar
                        </button>
                    )}
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold flex items-center gap-2 transition-colors">
                            <IoCloseOutline className="text-xl" />
                            Cancelar
                        </button>
                        <button type="button" onClick={handleSubmit} className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2 transition-colors">
                            <IoSaveOutline className="text-xl" />
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewEventModal;