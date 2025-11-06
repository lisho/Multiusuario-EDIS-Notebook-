import React from 'react';
import { Case, CaseStatus, Professional, ProfessionalRole, DashboardView } from '../types';
import { IoListOutline, IoBriefcaseOutline, IoBeakerOutline, IoBookOutline, IoJournalOutline } from 'react-icons/io5';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';

interface CaseCardProps {
    caseData: Case;
    professionals: Professional[];
    onSelect: (caseData: Case, view?: DashboardView) => void;
    onOpenTasks: (caseData: Case) => void;
    onSetStatusFilter: (status: CaseStatus) => void;
    onTogglePin: () => void;
    onAddQuickNote: (caseData: Case) => void;
    draggable: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    isDragging?: boolean;
}

const getStatusStyles = (status: CaseStatus): string => {
    switch (status) {
        case CaseStatus.PendingReferral:
            return 'bg-amber-100 text-amber-800';
        case CaseStatus.Welcome:
            return 'bg-emerald-100 text-emerald-800';
        case CaseStatus.CoDiagnosis:
            return 'bg-blue-100 text-blue-800';
        case CaseStatus.SharedPlanning:
            return 'bg-purple-100 text-purple-800';
        case CaseStatus.Accompaniment:
            return 'bg-teal-100 text-teal-800';
        case CaseStatus.FollowUp:
            return 'bg-lime-100 text-lime-800';
        case CaseStatus.Closed:
            return 'bg-zinc-200 text-zinc-800';
        default:
            return 'bg-slate-100 text-slate-800';
    }
};

const getFooterStyles = (status: CaseStatus): { footer: string; button: string; border: string } => {
    switch (status) {
        case CaseStatus.PendingReferral:
            return {
                footer: 'bg-amber-50',
                button: 'text-amber-700 bg-amber-100 hover:bg-amber-200',
                border: 'border-amber-200',
            };
        case CaseStatus.Welcome:
            return {
                footer: 'bg-emerald-50',
                button: 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200',
                border: 'border-emerald-200',
            };
        case CaseStatus.CoDiagnosis:
            return {
                footer: 'bg-blue-50',
                button: 'text-blue-700 bg-blue-100 hover:bg-blue-200',
                border: 'border-blue-200',
            };
        case CaseStatus.SharedPlanning:
            return {
                footer: 'bg-purple-50',
                button: 'text-purple-700 bg-purple-100 hover:bg-purple-200',
                border: 'border-purple-200',
            };
        case CaseStatus.Accompaniment:
            return {
                footer: 'bg-teal-50',
                button: 'text-teal-700 bg-teal-100 hover:bg-teal-200',
                border: 'border-teal-200',
            };
        case CaseStatus.FollowUp:
            return {
                footer: 'bg-lime-50',
                button: 'text-lime-700 bg-lime-100 hover:bg-lime-200',
                border: 'border-lime-200',
            };
        case CaseStatus.Closed:
            return {
                footer: 'bg-zinc-100',
                button: 'text-zinc-700 bg-zinc-200 hover:bg-zinc-300',
                border: 'border-zinc-200',
            };
        default:
            return {
                footer: 'bg-slate-100',
                button: 'text-slate-700 bg-slate-200 hover:bg-slate-300',
                border: 'border-slate-200',
            };
    }
};

const CaseCard: React.FC<CaseCardProps> = (props) => {
    const { caseData, professionals, onSelect, onOpenTasks, onSetStatusFilter, onTogglePin, onAddQuickNote, draggable, onDragStart, onDragEnd, isDragging } = props;
    const pendingTasksCount = caseData.tasks.filter(t => !t.completed).length;
    const footerStyles = getFooterStyles(caseData.status);

    const assignedProfessionals = professionals
        .filter(p => caseData.professionalIds?.includes(p.id))
        // Exclude admins from being displayed as assigned professionals on the card.
        .filter(p => p.systemRole !== 'admin');
        
    const socialWorker = assignedProfessionals.find(p => p.role === ProfessionalRole.SocialWorker);
    const edisTechnicians = assignedProfessionals.filter(p => p.role === ProfessionalRole.EdisTechnician);


    const timeSinceSpanish = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
        if (seconds < 5) return 'justo ahora';
        if (seconds < 60) return `hace ${seconds} segundos`;
    
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    
        const days = Math.floor(hours / 24);
        if (days < 30) return `hace ${days} día${days > 1 ? 's' : ''}`;
    
        const months = Math.floor(days / 30);
        if (months < 12) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
    
        const years = Math.floor(months / 12);
        return `hace ${years} año${years > 1 ? 's' : ''}`;
    };
    
    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSetStatusFilter(caseData.status);
    };

    const handlePinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTogglePin();
    }


    return (
        <div 
            className={`bg-white rounded-lg shadow-md border ${footerStyles.border} flex flex-col hover:shadow-lg transition-shadow duration-300 group ${draggable ? 'cursor-grab' : ''} ${isDragging ? 'opacity-40 shadow-2xl' : ''}`}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="p-5 flex-grow" onClick={() => onSelect(caseData)}>
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-slate-800">
                        {caseData.name}
                        {caseData.nickname && <strong className="ml-2 text-slate-600">({caseData.nickname})</strong>}
                    </h3>
                    <button
                        onClick={handleStatusClick}
                        className={`px-2 py-1 text-xs font-semibold rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${getStatusStyles(caseData.status)}`}
                        title={`Filtrar por "${caseData.status}"`}
                    >
                        {caseData.status}
                    </button>
                </div>
                <p className="text-sm text-slate-500 mt-1">Última act.: {timeSinceSpanish(caseData.lastUpdate)}</p>

                <div className="mt-4 border-t border-slate-200 pt-3 space-y-2">
                    <p className="text-sm text-slate-600 font-medium">
                        {pendingTasksCount > 0 
                            ? `${pendingTasksCount} tarea${pendingTasksCount > 1 ? 's' : ''} pendiente${pendingTasksCount > 1 ? 's' : ''}`
                            : 'No hay tareas pendientes.'
                        }
                    </p>
                    {socialWorker && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <IoBriefcaseOutline className="text-teal-600 flex-shrink-0" title="Trabajador/a Social" />
                            <p>
                                <span className="font-semibold">{socialWorker.name}</span>
                                {socialWorker.ceas && <span className="text-xs text-slate-500 ml-1.5">({socialWorker.ceas})</span>}
                            </p>
                        </div>
                    )}
                    {edisTechnicians.length > 0 && (
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                            <IoBeakerOutline className="text-indigo-500 flex-shrink-0 mt-0.5" title="Técnico/a EDIS" />
                            <div>
                                <span className="font-semibold">
                                    {edisTechnicians.map(tech => tech.name).join(', ')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className={`p-3 ${footerStyles.footer} border-t ${footerStyles.border} flex justify-between items-center`}>
                <div className="flex items-center gap-2">
                     <button
                        onClick={handlePinClick}
                        className={`text-sm font-semibold p-2 rounded-full transition-colors ${
                            caseData.isPinned
                            ? 'bg-teal-600 text-white hover:bg-teal-700'
                            : 'text-slate-500 bg-transparent hover:bg-slate-200'
                        }`}
                        title={caseData.isPinned ? 'Desfijar caso' : 'Fijar caso'}
                    >
                        {caseData.isPinned ? <BsPinAngleFill className="text-xl" /> : <BsPinAngle className="text-xl" />}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddQuickNote(caseData);
                        }}
                        className={`text-sm font-semibold ${footerStyles.button} p-2 rounded-full transition-colors`}
                        title="Añadir Nota Rápida"
                    >
                        <IoJournalOutline className="text-xl" />
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(caseData, 'notebook');
                        }}
                        className={`text-sm font-semibold ${footerStyles.button} p-2 rounded-full transition-colors`}
                        title="Cuaderno de Campo"
                    >
                        <IoBookOutline className="text-xl" />
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenTasks(caseData);
                        }}
                        className={`text-sm font-semibold ${footerStyles.button} p-2 rounded-full transition-colors`}
                        title="Ver Tareas"
                    >
                        <IoListOutline className="text-xl" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CaseCard;