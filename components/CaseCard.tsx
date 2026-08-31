import React from 'react';
import { Case, CaseStatus, Professional, DashboardView, ProfessionalRole, User } from '../types';
import {
    IoCheckboxOutline, IoAddCircleOutline,
    IoBookOutline, IoJournalOutline
} from 'react-icons/io5';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import TechnicianAvatar from './TechnicianAvatar';

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
    currentUser?: User | null;
}

const getStatusStyles = (status: CaseStatus): { bg: string; text: string; footerBg: string; } => {
    switch (status) {
        case CaseStatus.PendingReferral: return { bg: 'bg-amber-400', text: 'text-amber-800', footerBg: 'bg-amber-50' };
        case CaseStatus.Welcome: return { bg: 'bg-emerald-400', text: 'text-emerald-800', footerBg: 'bg-emerald-50' };
        case CaseStatus.CoDiagnosis: return { bg: 'bg-blue-400', text: 'text-blue-800', footerBg: 'bg-blue-50' };
        case CaseStatus.SharedPlanning: return { bg: 'bg-purple-400', text: 'text-purple-800', footerBg: 'bg-purple-50' };
        case CaseStatus.Accompaniment: return { bg: 'bg-teal-400', text: 'text-teal-800', footerBg: 'bg-teal-50' };
        case CaseStatus.FollowUp: return { bg: 'bg-lime-400', text: 'text-lime-800', footerBg: 'bg-lime-50' };
        case CaseStatus.Closed: return { bg: 'bg-zinc-200', text: 'text-zinc-800', footerBg: 'bg-zinc-100' };
        default: return { bg: 'bg-slate-100', text: 'text-slate-800', footerBg: 'bg-slate-50' };
    }
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const CaseCard: React.FC<CaseCardProps> = ({
    caseData, professionals, onSelect, onOpenTasks, onSetStatusFilter, onTogglePin, onAddQuickNote,
    draggable, onDragStart, onDragEnd, isDragging, currentUser
}) => {
    const { bg, text, footerBg } = getStatusStyles(caseData.status);

    const isVisibleToUser = (item: { createdBy?: string; assignedTo?: string[] }) => {
        if (!currentUser) return true;
        if (currentUser.role === 'admin') return true;
        const isAssigned = item.assignedTo?.includes(currentUser.id);
        const isCreator = item.createdBy === currentUser.id;
        const isLegacy = (!item.assignedTo || item.assignedTo.length === 0) && isCreator;
        return isAssigned || isCreator || isLegacy;
    };

    const pendingTasks = (caseData.tasks || []).filter(isVisibleToUser).filter(t => !t.completed).length;
    const notebookEntries = (caseData.interventions || []).filter(i => i.isRegistered).length;
    const notesCount = Array.isArray(caseData.myNotes) 
        ? caseData.myNotes.filter(isVisibleToUser).length 
        : (caseData.myNotes ? 1 : 0);

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
    const handleOpenNotes = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(caseData, 'myNotes'); };

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
                        <button 
                            onClick={handleTogglePin} 
                            className="group -mr-2 -mt-2 rounded-full transition-colors hover:bg-teal-50 flex items-center justify-center w-8 h-8"
                            aria-label={caseData.isPinned ? "Desfijar caso" : "Fijar caso"}
                            title={caseData.isPinned ? "Desfijar caso" : "Fijar caso"}
                        >
                            {caseData.isPinned 
                                ? <BsPinAngleFill className="text-teal-600 text-lg"/> 
                                : <BsPinAngle className="text-slate-400 group-hover:text-teal-600 text-lg"/>
                            }
                        </button>
                    )}
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{caseData.name}</h3>
                {caseData.nickname && <p className="text-sm font-semibold text-slate-500">{caseData.nickname}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                    {edisTechnicians.length > 0 && (
                         <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500 w-10 flex-shrink-0">EDIS</span>
                            <div className="flex -space-x-1.5">
                                {edisTechnicians.map(p => (
                                    <TechnicianAvatar
                                        key={p.id}
                                        professional={p}
                                        size="lg"
                                        prefix="Técnico/a EDIS:"
                                        tooltipPosition="top"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {socialWorkers.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500 w-10 flex-shrink-0">CEAS</span>
                            <div className="flex -space-x-1.5">
                                {socialWorkers.map(p => (
                                    <TechnicianAvatar
                                        key={p.id}
                                        professional={p}
                                        size="lg"
                                        prefix="CEAS:"
                                        tooltipPosition="top"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className={`${footerBg} px-4 py-3 rounded-b-xl border-t border-slate-100 flex justify-between items-center text-sm`}>
                <div className="flex items-center gap-3">
                    <button onClick={handleOpenTasks} className="flex items-center gap-1 text-slate-600 hover:text-teal-700 font-medium transition-colors" title="Ver tareas">
                        <IoCheckboxOutline className="text-lg" />
                        <span>{pendingTasks}</span>
                    </button>
                    <button onClick={handleOpenNotebook} className="flex items-center gap-1 text-slate-600 hover:text-teal-700 font-medium transition-colors" title="Cuaderno de Campo">
                        <IoBookOutline className="text-lg" />
                        <span>{notebookEntries}</span>
                    </button>
                    <button onClick={handleOpenNotes} className="flex items-center gap-1 text-slate-600 hover:text-teal-700 font-medium transition-colors" title="Ver notas del caso">
                        <IoJournalOutline className="text-lg" />
                        <span>{notesCount}</span>
                    </button>
                    <button onClick={handleAddNote} className="flex items-center gap-1 text-slate-500 hover:text-teal-700 font-medium pl-1.5 border-l border-slate-300 transition-colors" title="Añadir nota rápida">
                        <IoAddCircleOutline className="text-lg" />
                        <span className="text-xs">Nota</span>
                    </button>
                </div>
                <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">{timeSinceUpdate(caseData.lastUpdate)}</span>
            </div>
        </div>
    );
};

export default CaseCard;