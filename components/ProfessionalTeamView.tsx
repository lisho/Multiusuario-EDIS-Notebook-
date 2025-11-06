import React, { useState, useEffect } from 'react';
import { Case, Professional, ProfessionalRole } from '../types';
import {
    IoBriefcaseOutline,
    IoBeakerOutline,
    IoAddCircleOutline,
    IoRemoveCircleOutline,
    IoMailOutline,
    IoCallOutline,
    IoCloseOutline
} from 'react-icons/io5';

interface ProfessionalTeamViewProps {
    caseData: Case;
    professionals: Professional[];
    onUpdateCase: (updatedCase: Case) => void;
}

const ProfessionalInfoCard: React.FC<{ professional: Professional }> = ({ professional }) => {
    const Icon = professional.role === ProfessionalRole.SocialWorker ? IoBriefcaseOutline : IoBeakerOutline;
    const iconColor = professional.role === ProfessionalRole.SocialWorker ? 'text-teal-600' : 'text-indigo-500';
    const cardBgColor = professional.role === ProfessionalRole.SocialWorker ? 'bg-teal-50' : 'bg-indigo-50';
    const cardBorderColor = professional.role === ProfessionalRole.SocialWorker ? 'border-teal-200' : 'border-indigo-200';

    return (
        <div className={`${cardBgColor} p-4 rounded-lg border ${cardBorderColor} flex flex-col gap-3 shadow-sm`}>
            <div className="flex items-center gap-3">
                <Icon className={`${iconColor} text-3xl flex-shrink-0`} />
                <div>
                    <h4 className="font-bold text-slate-800">{professional.name}</h4>
                    <p className="text-sm font-medium text-slate-600">
                        {professional.role}
                        {professional.ceas && <span className="text-xs text-slate-500 ml-1.5">({professional.ceas})</span>}
                    </p>
                </div>
            </div>
            {(professional.phone || professional.email) && (
                 <div className="mt-2 pt-3 border-t border-slate-200 space-y-2 text-sm">
                    {professional.phone && (
                        <a href={`tel:${professional.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-teal-600 transition-colors group">
                            <IoCallOutline className="text-slate-400 group-hover:text-teal-500" />
                            <span>{professional.phone}</span>
                        </a>
                    )}
                    {professional.email && (
                        <a href={`mailto:${professional.email}`} className="flex items-center gap-2 text-slate-700 hover:text-teal-600 transition-colors group">
                            <IoMailOutline className="text-slate-400 group-hover:text-teal-500" />
                            <span className="truncate">{professional.email}</span>
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};


const ManagementCard: React.FC<{
    professional: Professional;
    onAction: () => void;
    isAssigned: boolean;
}> = ({ professional, onAction, isAssigned }) => {
    const Icon = professional.role === ProfessionalRole.SocialWorker ? IoBriefcaseOutline : IoBeakerOutline;
    const iconColor = professional.role === ProfessionalRole.SocialWorker ? 'text-teal-600' : 'text-indigo-500';

    return (
        <div className="bg-white p-3 rounded-md border border-slate-200 flex justify-between items-center hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
                <Icon className={`${iconColor} text-2xl`} />
                <div>
                    <h3 className="font-semibold text-slate-700">{professional.name}</h3>
                    <p className="text-xs text-slate-500">{professional.role}{professional.ceas ? ` - ${professional.ceas}` : ''}</p>
                </div>
            </div>
            <button
                onClick={onAction}
                className={`p-1.5 rounded-full transition-colors ${
                    isAssigned
                        ? 'text-red-500 hover:bg-red-100'
                        : 'text-emerald-600 hover:bg-emerald-100'
                }`}
                title={isAssigned ? 'Desasignar' : 'Asignar'}
            >
                {isAssigned ? <IoRemoveCircleOutline className="text-2xl" /> : <IoAddCircleOutline className="text-2xl" />}
            </button>
        </div>
    );
};


const ProfessionalTeamView: React.FC<ProfessionalTeamViewProps> = ({ caseData, professionals, onUpdateCase }) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isPanelVisible, setIsPanelVisible] = useState(false);

    useEffect(() => {
        if (isPanelOpen) {
            const timer = setTimeout(() => setIsPanelVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsPanelVisible(false);
        }
    }, [isPanelOpen]);

    const handlePanelClose = () => {
        setIsPanelVisible(false);
        setTimeout(() => setIsPanelOpen(false), 300);
    };

    const handlePanelOpen = () => {
        setIsPanelOpen(true);
    };

    const assignedIds = caseData.professionalIds || [];
    const assignedProfessionals = professionals.filter(p => assignedIds.includes(p.id));

    const handleToggleAssignment = (professionalId: string) => {
        const newAssignedIds = assignedIds.includes(professionalId)
            ? assignedIds.filter(id => id !== professionalId)
            : [...assignedIds, professionalId];

        onUpdateCase({ ...caseData, professionalIds: newAssignedIds });
    };

    return (
        <>
            <div className="space-y-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-800">Equipo Profesional Asignado</h2>
                    <button
                        onClick={handlePanelOpen}
                        className="bg-white text-teal-600 border border-teal-300 px-4 py-2 rounded-lg hover:bg-teal-50 font-medium flex items-center justify-center transition-colors text-sm"
                    >
                        Gestionar Equipo
                    </button>
                </div>

                {assignedProfessionals.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {assignedProfessionals.map(p => <ProfessionalInfoCard key={p.id} professional={p} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200 shadow-sm">
                         <p className="text-slate-500 font-medium">No hay profesionales asignados a este caso.</p>
                         <p className="text-slate-500 mt-2">Utiliza el botón "Gestionar Equipo" para empezar a añadir miembros.</p>
                    </div>
                )}
            </div>
            
            {isPanelOpen && (
                 <div 
                    className={`fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${isPanelVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    role="dialog"
                    aria-modal="true"
                >
                    <div 
                        className="absolute inset-0 bg-black bg-opacity-50" 
                        onClick={handlePanelClose} 
                        aria-hidden="true"
                    />
                    
                    <div 
                        className={`absolute top-0 right-0 h-full w-full max-w-md bg-slate-50 shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out ${isPanelVisible ? 'translate-x-0' : 'translate-x-full'}`}
                    >
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white flex-shrink-0">
                            <h3 className="text-xl font-bold text-slate-800">Gestionar Equipo</h3>
                            <button onClick={handlePanelClose} className="text-slate-500 hover:text-slate-800" aria-label="Cerrar panel">
                                <IoCloseOutline className="text-3xl" />
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-4 space-y-3">
                             {professionals.map(p => (
                                <ManagementCard
                                    key={p.id}
                                    professional={p}
                                    onAction={() => handleToggleAssignment(p.id)}
                                    isAssigned={assignedIds.includes(p.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfessionalTeamView;