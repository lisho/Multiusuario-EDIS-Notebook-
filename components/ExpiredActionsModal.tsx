import React from 'react';
import { Intervention, Case } from '../types';
import { IoCloseOutline, IoAlertCircleOutline, IoPencilOutline, IoArrowForwardCircleOutline } from 'react-icons/io5';

interface ExpiredActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  interventions: Intervention[];
  cases: Case[];
  onSelectCaseById: (caseId: string) => void;
  onEditIntervention: (intervention: Intervention) => void;
}

const ExpiredActionsModal: React.FC<ExpiredActionsModalProps> = ({ isOpen, onClose, interventions, cases, onSelectCaseById, onEditIntervention }) => {
    if (!isOpen) return null;

    const getCaseName = (caseId: string | null) => {
        if (!caseId) return 'Actividad General';
        const caseData = cases.find(c => c.id === caseId);
        if (!caseData) return 'Caso Desconocido';
        return caseData.name + (caseData.nickname ? ` (${caseData.nickname})` : '');
    };
    
    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        if (diffInDays === 0) return 'hoy';
        if (diffInDays === 1) return 'hace 1 día';
        return `hace ${diffInDays} días`;
    };

    const handleEdit = (intervention: Intervention) => {
        onEditIntervention(intervention);
        onClose();
    };

    const handleGoToCase = (caseId: string) => {
        onSelectCaseById(caseId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <IoAlertCircleOutline className="text-red-600"/>
                        Acciones de Calendario Caducadas
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="text-slate-600 text-sm mb-4">
                        Las siguientes intervenciones estaban planificadas pero su fecha ya ha pasado. Por favor, actualiza su estado a "Completada" o "Anulada", o reprográmalas.
                    </p>
                    {interventions.length > 0 ? (
                        <ul className="space-y-3">
                            {interventions.map(event => (
                                <li key={event.id} className="bg-slate-50 p-3 rounded-md border border-slate-200 flex justify-between items-center gap-2">
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-slate-800 truncate" title={event.title}>{event.title}</p>
                                        <p className="text-sm text-slate-500">
                                            {getCaseName(event.caseId)} - <span className="font-medium">{timeAgo(event.start)}</span>
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                        {event.caseId && (
                                            <button 
                                                onClick={() => handleGoToCase(event.caseId!)}
                                                className="text-slate-500 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                                                title="Ir al caso"
                                            >
                                                <IoArrowForwardCircleOutline className="text-lg"/>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleEdit(event)}
                                            className="text-slate-500 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                                            title="Editar intervención"
                                        >
                                            <IoPencilOutline className="text-lg"/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-slate-500 py-6">No hay acciones caducadas.</p>
                    )}
                </div>
                <div className="flex justify-end p-4 mt-auto border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="py-2 px-4 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default ExpiredActionsModal;
