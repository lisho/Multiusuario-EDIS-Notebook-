import React from 'react';
import { Case, Professional, ProfessionalRole, DashboardView } from '../types';
import { IoCloseOutline, IoWarningOutline, IoArrowForwardCircleOutline } from 'react-icons/io5';

interface MissingProfessionalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertCases: { caseData: Case; missingTS: boolean; missingEDIS: boolean }[];
  onGoToCase: (caseId: string, view: DashboardView) => void;
}

const MissingProfessionalsModal: React.FC<MissingProfessionalsModalProps> = ({ isOpen, onClose, alertCases, onGoToCase }) => {
    if (!isOpen) return null;

    const handleGoToCaseClick = (caseId: string) => {
        onGoToCase(caseId, 'professionals');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <IoWarningOutline className="text-purple-600"/>
                        Casos sin Profesionales Asignados
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="text-slate-600 text-sm mb-4">
                        Los siguientes casos activos no tienen asignado un Trabajador/a Social o un Técnico/a EDIS. Es importante asignar los profesionales correspondientes para asegurar una correcta intervención.
                    </p>
                    {alertCases.length > 0 ? (
                        <ul className="space-y-3">
                            {alertCases.map(({ caseData, missingTS, missingEDIS }) => (
                                <li key={caseData.id} className="bg-slate-50 p-3 rounded-md border border-slate-200 flex justify-between items-center gap-2">
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-slate-800 truncate" title={caseData.name}>
                                            {caseData.name} {caseData.nickname ? `(${caseData.nickname})` : ''}
                                        </p>
                                        <p className="text-sm text-red-600 font-medium">
                                            Falta: {missingTS && 'T. Social'}{missingTS && missingEDIS && ', '}{missingEDIS && 'Téc. EDIS'}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <button 
                                            onClick={() => handleGoToCaseClick(caseData.id)}
                                            className="text-slate-500 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                                            title="Gestionar equipo"
                                        >
                                            <IoArrowForwardCircleOutline className="text-lg"/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-slate-500 py-6">Todos los casos tienen profesionales asignados.</p>
                    )}
                </div>
                <div className="flex justify-end p-4 mt-auto border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="py-2 px-4 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default MissingProfessionalsModal;