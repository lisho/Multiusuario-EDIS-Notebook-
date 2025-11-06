import React from 'react';
import { Case, CaseStatus, Professional, DashboardView, ProfessionalRole } from '../types';
import {
    IoCheckboxOutline, IoAddCircleOutline,
    IoPinOutline, IoPin, IoBookOutline
} from 'react-icons/io5';

interface CaseCardProps {
    caseData: Case;
    professionals: Professional[];
    onSelect: (caseData: Case, view: DashboardView) => void;
    onOpenTasks: (caseData: Case) => void;
    onSetStatusFilter: (status: CaseStatus) => void;
    onTogglePin: () => void;
    onAddQuickNote: (caseData: Case) => void;
    draggable: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    isDragging?: boolean;
}

const getStatusStyles = (status: CaseStatus): { bg: string; text: string; } => {
    switch (status) {
        case CaseStatus.PendingReferral: return { bg: 'bg-slate-200', text: 'text-slate-800' };
        case CaseStatus.Welcome: return { bg: 'bg-teal-100', text: 'text-teal-800' };
        case CaseStatus.CoDiagnosis: return { bg: 'bg-sky-100', text: 'text-sky-800' };
        case CaseStatus.SharedPlanning: return { bg: 'bg-indigo-100', text: 'text-indigo-800' };
        case CaseStatus.Accompaniment: return { bg: 'bg-teal-200', text: 'text-teal-900' };
        case CaseStatus.FollowUp: return { bg: 'bg-cyan-100', text: 'text-cyan-800' };
        case CaseStatus.Closed: return { bg: 'bg-zinc-200', text: 'text-zinc-800' };
        default: return { bg: 'bg-slate-100', text: 'text-slate-800' };
    }
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const CaseCard: React.FC<CaseCardProps> = ({
    caseData, professionals, onSelect, onOpenTasks, onSetStatusFilter, onTogglePin, onAddQuickNote,
    draggable, onDragStart, onDragEnd, isDragging
}) => {
    const { bg, text } = getStatusStyles(caseData.status);
    const pendingTasks = caseData.tasks.filter(t => !t.completed).length;
    const notebookEntries = caseData.interventions.filter(i => i.isRegistered).length;

    const assignedProfessionals = (caseData.professionalIds || [])
        .map(id => professionals.find(p => p.id === id))
        .filter(p => p && p.systemRole !== 'admin') as Professional[];

    const socialWorkers = assignedProfessionals.filter(p => p.role === ProfessionalRole.SocialWorker);
    const edisTechnicians = assignedProfessionals.filter(p => p.role === ProfessionalRole.EdisTechnician);


    const timeSinceUpdate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return `hace ${Math.floor(interval)} años`;
        interval = seconds / 2592000;
        if (interval > 1) return `hace ${Math.floor(interval)} meses`;
        interval = seconds / 86400;
        if (interval > 1) return `hace ${Math.floor(interval)} días`;
        interval = seconds / 3600;
        if (interval > 1) return `hace ${Math.floor(interval)} horas`;
        interval = seconds / 60;
        if (interval > 1) return `hace ${Math.floor(interval)} minutos`;
        return `hace segundos`;
    };

    const handleSelect = () => onSelect(caseData, 'profile');
    const handleOpenTasks = (e: React.MouseEvent) => { e.stopPropagation(); onOpenTasks(caseData); };
    const handleFilterStatus = (e: React.MouseEvent) => { e.stopPropagation(); onSetStatusFilter(caseData.status); };
    const handleTogglePin = (e: React.MouseEvent) => { e.stopPropagation(); onTogglePin(); };
    const handleAddNote = (e: React.MouseEvent) => { e.stopPropagation(); onAddQuickNote(caseData); };
    const handleOpenNotebook = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(caseData, 'notebook'); };

    return (
        <div
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer ${isDragging ? 'opacity-50 ring-2 ring-teal-500' : ''}`}
            onClick={handleSelect}
        >
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <button onClick={handleFilterStatus} className={`px-2.5 py-1 text-xs font-semibold rounded-full ${bg} ${text} hover:opacity-80 transition-opacity`}>
                        {caseData.status}
                    </button>
                    {caseData.status !== CaseStatus.Closed && (
                        <button onClick={handleTogglePin} className="text-slate-400 hover:text-teal-600 p-1 -mr-2 -mt-2">
                            {caseData.isPinned ? <IoPin className="text-teal-600"/> : <IoPinOutline />}
                        </button>
                    )}
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{caseData.name}</h3>
                {caseData.nickname && <p className="text-sm font-semibold text-slate-500">{caseData.nickname}</p>}

                <div className="mt-4 space-y-2">
                    {socialWorkers.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500 w-10 flex-shrink-0">T.S.</span>
                            <div className="flex -space-x-2">
                                {socialWorkers.map(p => (
                                    <div key={p.id} className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs border-2 border-white overflow-hidden transition-transform duration-200 hover:scale-125 hover:z-10" title={p.name}>
                                        {p.avatar ? (
                                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{getInitials(p.name)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {edisTechnicians.length > 0 && (
                         <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500 w-10 flex-shrink-0">EDIS</span>
                            <div className="flex -space-x-2">
                                {edisTechnicians.map(p => (
                                     <div key={p.id} className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border-2 border-white overflow-hidden transition-transform duration-200 hover:scale-125 hover:z-10" title={p.name}>
                                        {p.avatar ? (
                                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{getInitials(p.name)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-slate-50 px-5 py-3 rounded-b-xl border-t border-slate-100 flex justify-between items-center text-sm">
                <div className="flex items-center gap-4">
                    <button onClick={handleOpenTasks} className="flex items-center gap-1.5 text-slate-600 hover:text-teal-700 font-medium" title="Ver tareas">
                        <IoCheckboxOutline className="text-lg" />
                        <span>{pendingTasks}</span>
                    </button>
                    <button onClick={handleOpenNotebook} className="flex items-center gap-1.5 text-slate-600 hover:text-teal-700 font-medium" title="Cuaderno de Campo">
                        <IoBookOutline className="text-lg" />
                        <span>{notebookEntries}</span>
                    </button>
                    <button onClick={handleAddNote} className="flex items-center gap-1.5 text-slate-600 hover:text-teal-700 font-medium" title="Añadir nota rápida">
                        <IoAddCircleOutline className="text-lg" />
                        <span>Nota</span>
                    </button>
                </div>
                <span className="text-xs text-slate-400">{timeSinceUpdate(caseData.lastUpdate)}</span>
            </div>
        </div>
    );
};

export default CaseCard;