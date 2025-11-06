import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Case, CaseStatus, Professional, ProfessionalRole, Intervention, InterventionType, InterventionStatus, DashboardView, Task, User } from '../types';
import NewEventModal from './NewEventModal';
import ExpiredActionsModal from './ExpiredActionsModal';
import MissingProfessionalsModal from './MissingProfessionalsModal';
import {
    IoBriefcaseOutline,
    IoTimeOutline,
    IoCheckboxOutline,
    IoLocationOutline,
    IoCalendarClearOutline,
    IoHomeOutline,
    IoCallOutline,
    IoPeopleOutline,
    IoEaselOutline,
    IoArchiveOutline,
    IoGitNetworkOutline,
    IoHeartOutline,
    IoPeopleCircleOutline,
    IoWalkOutline,
    IoDocumentTextOutline,
    IoDocumentAttachOutline,
    IoBeerOutline,
    IoSunnyOutline,
    IoAirplaneOutline,
    IoSchoolOutline,
    IoAddOutline,
    IoPencilOutline,
    IoBookOutline,
    IoAlertCircleOutline,
    IoCheckmarkCircleOutline,
    IoWarningOutline
} from 'react-icons/io5';

interface CaseStatsDashboardProps {
  cases: Case[];
  professionals: Professional[];
  generalInterventions: Intervention[];
  generalTasks: Task[];
  onSelectCaseById: (caseId: string, view?: DashboardView) => void;
  onSetStatusFilter: (status: CaseStatus) => void;
  onOpenAllTasks: () => void;
  onSaveIntervention: (intervention: Omit<Intervention, 'id'> | Intervention) => void;
  onDeleteIntervention: (intervention: Intervention) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  currentUser: User;
}

const getStatusColorClass = (status: CaseStatus): string => {
    switch (status) {
        case CaseStatus.PendingReferral: return 'bg-amber-400';
        case CaseStatus.Welcome: return 'bg-emerald-400';
        case CaseStatus.CoDiagnosis: return 'bg-blue-400';
        case CaseStatus.SharedPlanning: return 'bg-purple-400';
        case CaseStatus.Accompaniment: return 'bg-teal-400';
        case CaseStatus.FollowUp: return 'bg-lime-400';
        case CaseStatus.Closed: return 'bg-zinc-400';
        default: return 'bg-slate-400';
    }
};

const getStatusHexColor = (status: CaseStatus): string => {
    switch (status) {
        case CaseStatus.PendingReferral: return '#fbbf24';
        case CaseStatus.Welcome: return '#34d399';
        case CaseStatus.CoDiagnosis: return '#60a5fa';
        case CaseStatus.SharedPlanning: return '#a78bfa';
        case CaseStatus.Accompaniment: return '#2dd4bf';
        case CaseStatus.FollowUp: return '#a3e635';
        case CaseStatus.Closed: return '#a1a1aa';
        default: return '#94a3b8';
    }
};

const interventionIcons: Record<InterventionType, React.ComponentType<{className?: string}>> = {
  [InterventionType.HomeVisit]: IoHomeOutline,
  [InterventionType.PhoneCall]: IoCallOutline,
  [InterventionType.Meeting]: IoPeopleOutline,
  [InterventionType.Workshop]: IoEaselOutline,
  [InterventionType.Administrative]: IoArchiveOutline,
  [InterventionType.Coordination]: IoGitNetworkOutline,
  [InterventionType.PsychologicalSupport]: IoHeartOutline,
  [InterventionType.GroupSession]: IoPeopleCircleOutline,
  [InterventionType.Accompaniment]: IoWalkOutline,
  [InterventionType.Other]: IoDocumentTextOutline,
  [InterventionType.Reunion]: IoPeopleOutline,
  [InterventionType.AssessmentInterview]: IoPeopleOutline,
  [InterventionType.ElaborarMemoria]: IoDocumentAttachOutline,
  [InterventionType.ElaborarDocumento]: IoDocumentTextOutline,
  [InterventionType.Fiesta]: IoBeerOutline,
  [InterventionType.Vacaciones]: IoSunnyOutline,
  [InterventionType.Viaje]: IoAirplaneOutline,
  [InterventionType.CursoFormacion]: IoSchoolOutline,
};

const interventionTypeStyles: Record<InterventionType, string> = {
    [InterventionType.HomeVisit]: 'text-emerald-600',
    [InterventionType.PhoneCall]: 'text-sky-600',
    [InterventionType.Meeting]: 'text-indigo-600',
    [InterventionType.Workshop]: 'text-purple-600',
    [InterventionType.Administrative]: 'text-slate-600',
    [InterventionType.Coordination]: 'text-amber-600',
    [InterventionType.PsychologicalSupport]: 'text-rose-600',
    [InterventionType.GroupSession]: 'text-cyan-600',
    [InterventionType.Accompaniment]: 'text-lime-600',
    [InterventionType.Other]: 'text-gray-500',
    [InterventionType.Reunion]: 'text-blue-600',
    [InterventionType.AssessmentInterview]: 'text-sky-700',
    [InterventionType.ElaborarMemoria]: 'text-gray-600',
    [InterventionType.ElaborarDocumento]: 'text-gray-600',
    [InterventionType.Fiesta]: 'text-pink-600',
    [InterventionType.Vacaciones]: 'text-yellow-600',
    [InterventionType.Viaje]: 'text-cyan-500',
    [InterventionType.CursoFormacion]: 'text-orange-600',
};

const statusStyles: Record<InterventionStatus, { dot: string, text: string, bg: string }> = {
    [InterventionStatus.Planned]: { dot: 'bg-blue-500', text: 'text-blue-800', bg: 'bg-blue-100' },
    [InterventionStatus.Completed]: { dot: 'bg-green-500', text: 'text-green-800', bg: 'bg-green-100' },
    [InterventionStatus.Cancelled]: { dot: 'bg-red-500', text: 'text-red-800', bg: 'bg-red-100' },
};


const StatCard: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    className?: string;
}> = ({ icon: Icon, title, value, className }) => (
    <div className={`bg-amber-50 p-5 rounded-lg shadow-sm border border-amber-200 flex flex-col items-center justify-center gap-2 text-center ${className}`}>
        <div className="bg-amber-100 text-amber-700 rounded-full p-3">
            <Icon className="w-8 h-8" />
        </div>
        <div>
            <p className="text-2xl font-bold text-orange-600">{value}</p>
            <p className="text-sm font-medium text-slate-500">{title}</p>
        </div>
    </div>
);

const PieChart: React.FC<{ data: { status: CaseStatus, count: number, color: string }[], totalValue: number }> = ({ data, totalValue }) => {
    const radius = 52;
    const strokeWidth = 20;
    const innerRadius = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * innerRadius;
    let accumulatedPercent = 0;

    return (
        <div className="relative w-40 h-40">
            <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                {data.map(({ count, color, status }) => {
                    const percent = (count / totalValue) * 100;
                    const offset = circumference - (circumference * percent) / 100;
                    const rotation = (accumulatedPercent / 100) * 360;
                    accumulatedPercent += percent;

                    return (
                        <circle
                            key={status}
                            cx="60"
                            cy="60"
                            r={innerRadius}
                            fill="transparent"
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${circumference} ${circumference}`}
                            style={{ strokeDashoffset: offset }}
                            transform={`rotate(${rotation} 60 60)`}
                        >
                             <title>{`${status}: ${count} (${percent.toFixed(1)}%)`}</title>
                        </circle>
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-slate-800">{totalValue}</span>
                <span className="text-sm text-slate-500">Casos</span>
            </div>
        </div>
    );
};


const CaseStatsDashboard: React.FC<CaseStatsDashboardProps> = (props) => {
    const { cases, professionals, generalInterventions, generalTasks, onSelectCaseById, onSetStatusFilter, onOpenAllTasks, onSaveIntervention, onDeleteIntervention, requestConfirmation, currentUser } = props;

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isExpiredActionsModalOpen, setIsExpiredActionsModalOpen] = useState(false);
    const [isMissingProfsModalOpen, setIsMissingProfsModalOpen] = useState(false);
    const [modalState, setModalState] = useState<{
        item: Intervention | null;
        initialValues?: Partial<Intervention>;
    }>({ item: null, initialValues: undefined });
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const stats = useMemo(() => {
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const totalCases = activeCases.length;
        const pendingCaseTasks = activeCases.reduce((acc, c) => acc + c.tasks.filter(t => !t.completed).length, 0);
        const pendingGeneralTasks = generalTasks.filter(t => !t.completed).length;
        const pendingTasksCount = pendingCaseTasks + pendingGeneralTasks;
        
        const casesByStatus = Object.values(CaseStatus)
            .map(status => ({
                status,
                count: activeCases.filter(c => c.status === status).length,
                color: getStatusHexColor(status),
                className: getStatusColorClass(status),
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count);

        const recentlyUpdated = cases.slice(0, 3);

        const ceasCounts: { [key: string]: number } = {};
        const professionalMap = new Map(professionals.map(p => [p.id, p]));

        activeCases.forEach(c => {
            const socialWorker = c.professionalIds
                ?.map(id => professionalMap.get(id))
                .find(p => p?.role === ProfessionalRole.SocialWorker);
            
            const ceasName = socialWorker?.ceas || 'Sin CEAS Asignado';
            ceasCounts[ceasName] = (ceasCounts[ceasName] || 0) + 1;
        });

        const casesByCeas = Object.entries(ceasCounts)
            .map(([ceas, count]) => ({ ceas, count }))
            .sort((a, b) => b.count - a.count);
        
        const maxCeasCount = casesByCeas.reduce((max, item) => Math.max(max, item.count), 0);

        return { totalCases, pendingTasksCount, casesByStatus, recentlyUpdated, casesByCeas, maxCeasCount };
    }, [cases, professionals, generalTasks]);
    
    const todaysAgenda = useMemo(() => {
        const allInterventions = [
            ...cases.flatMap(c => c.interventions),
            ...generalInterventions
        ];
        
        const todayString = new Date().toDateString();

        return allInterventions
            .filter(event => {
                const isOnToday = new Date(event.start).toDateString() === todayString;
                if (!isOnToday) return false;

                // All users, including admins, see only interventions they have created for the day.
                return event.createdBy === currentUser.id;
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }, [cases, generalInterventions, currentUser]);

    const expiredActions = useMemo(() => {
        const allInterventions = [
            ...cases.flatMap(c => c.interventions),
            ...generalInterventions
        ];
        const twentyFiveHoursAgo = new Date().getTime() - (25 * 60 * 60 * 1000);

        return allInterventions.filter(event =>
            event.status === InterventionStatus.Planned &&
            new Date(event.start).getTime() < twentyFiveHoursAgo
        );
    }, [cases, generalInterventions]);

    const casesWithMissingProfs = useMemo(() => {
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const professionalMap = new Map(professionals.map(p => [p.id, p]));
        
        return activeCases
            .map(caseData => {
                const assignedProfs = (caseData.professionalIds || []).map(id => professionalMap.get(id)).filter(Boolean) as Professional[];
                const hasTS = assignedProfs.some(p => p.role === ProfessionalRole.SocialWorker);
                const hasEDIS = assignedProfs.some(p => p.role === ProfessionalRole.EdisTechnician);
                
                if (!hasTS || !hasEDIS) {
                    return { caseData, missingTS: !hasTS, missingEDIS: !hasEDIS };
                }
                return null;
            })
            .filter(Boolean) as { caseData: Case; missingTS: boolean; missingEDIS: boolean }[];
    }, [cases, professionals]);


    const timeSinceSpanish = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return `hace segundos`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `hace ${days}d`;
    };

    const handleAddNewEventForToday = () => {
        setModalState({
            item: null,
            initialValues: { start: new Date().toISOString() }
        });
        setIsEventModalOpen(true);
    };

    const handleOpenEditModal = (intervention: Intervention) => {
        setModalState({ item: intervention, initialValues: undefined });
        setIsEventModalOpen(true);
    };

    const handleStatusChange = (intervention: Intervention, newStatus: InterventionStatus) => {
        const updatedIntervention = { ...intervention, status: newStatus };
        if (newStatus === InterventionStatus.Cancelled && intervention.status !== InterventionStatus.Cancelled) {
            updatedIntervention.cancellationTime = new Date().toISOString();
        }
        onSaveIntervention(updatedIntervention);
        setOpenMenuId(null);
    };

    const handleRegisterToggle = (intervention: Intervention, isChecked: boolean) => {
        if (!isChecked && intervention.isRegistered) {
            requestConfirmation(
                'Quitar del Cuaderno de Campo',
                'Al desmarcar esta opción, la intervención dejará de aparecer en el "Cuaderno de Campo". ¿Quieres continuar?',
                () => {
                    onSaveIntervention({ ...intervention, isRegistered: false });
                }
            );
        } else {
            onSaveIntervention({ ...intervention, isRegistered: isChecked });
        }
    };

    return (
        <>
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <IoBriefcaseOutline className="text-teal-600 text-xl" />
                            <h3 className="font-semibold text-slate-800">Resumen de Casos Activos</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="flex-shrink-0">
                                <PieChart data={stats.casesByStatus} totalValue={stats.totalCases} />
                            </div>
                            <div className="w-full flex-grow">
                                <ul className="space-y-1 text-sm">
                                    {stats.casesByStatus.map(({ status, count, className }) => (
                                        <li key={status}>
                                            <button
                                                onClick={() => onSetStatusFilter(status)}
                                                className="w-full flex justify-between items-center p-2 rounded-md hover:bg-slate-100 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                title={`Filtrar por "${status}"`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-3 h-3 rounded-full ${className}`}></span>
                                                    <span className="text-slate-600 font-medium">{status}</span>
                                                </div>
                                                <span className="font-bold text-slate-700 bg-slate-100 rounded-full px-2.5 py-0.5">{count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <IoCalendarClearOutline className="text-teal-600 text-xl" />
                                <h3 className="font-semibold text-slate-800">Agenda de Hoy</h3>
                            </div>
                            <button
                                onClick={handleAddNewEventForToday}
                                className="bg-teal-50 text-teal-700 h-9 px-3 rounded-lg hover:bg-teal-100 font-semibold flex items-center justify-center gap-1.5 transition-colors text-sm border border-teal-200"
                                title="Añadir intervención para hoy"
                            >
                                <IoAddOutline className="text-lg" /> Añadir Intervención
                            </button>
                        </div>
                        {todaysAgenda.length > 0 ? (
                            <ul className="space-y-3">
                                {todaysAgenda.map(event => {
                                    const Icon = interventionIcons[event.interventionType] || IoDocumentTextOutline;
                                    const styleClass = interventionTypeStyles[event.interventionType] || 'text-gray-500';
                                    const caseForEvent = event.caseId ? cases.find(c => c.id === event.caseId) : null;
                                    const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                                    const currentStatusStyle = statusStyles[event.status];
                                    
                                    return (
                                        <li key={event.id} className={`p-3 rounded-lg border flex flex-col gap-3 transition-colors ${event.status === InterventionStatus.Cancelled ? 'bg-slate-50 opacity-70' : 'bg-white'}`}>
                                            <div className="flex items-start gap-4">
                                                <div className="flex flex-col items-center flex-shrink-0 w-16 text-center">
                                                    <p className={`font-bold text-slate-700 ${event.status === InterventionStatus.Cancelled ? 'line-through' : ''}`}>
                                                        {event.isAllDay ? 'Todo el día' : timeFormat.format(new Date(event.start))}
                                                    </p>
                                                    <Icon className={`mt-1 text-2xl ${styleClass}`}/>
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <p className={`font-semibold text-slate-800 truncate ${event.status === InterventionStatus.Cancelled ? 'line-through' : ''}`} title={event.title}>{event.title}</p>
                                                    <p className={`text-sm text-slate-500 ${event.status === InterventionStatus.Cancelled ? 'line-through' : ''}`}>{event.interventionType}</p>
                                                    {caseForEvent && (
                                                        <button 
                                                            onClick={() => onSelectCaseById(caseForEvent.id)}
                                                            className="text-sm text-teal-700 hover:underline font-medium truncate text-left"
                                                        >
                                                            {caseForEvent.name}
                                                            {caseForEvent.nickname && ` (${caseForEvent.nickname})`}
                                                        </button>
                                                    )}
                                                </div>
                                                <button onClick={() => handleOpenEditModal(event)} className="text-slate-400 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors" title="Editar intervención">
                                                    <IoPencilOutline className="text-lg" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between pl-20">
                                                <label 
                                                    className={`flex items-center gap-1.5 text-sm ${!event.caseId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                                    title={!event.caseId ? "Solo se pueden registrar intervenciones de un caso" : "Registrar en Cuaderno de Campo"}
                                                 >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!event.isRegistered} 
                                                        disabled={!event.caseId}
                                                        onChange={(e) => handleRegisterToggle(event, e.target.checked)}
                                                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:cursor-not-allowed" 
                                                    />
                                                    <IoBookOutline className="text-slate-500"/>
                                                </label>
                                                
                                                <div className="relative" ref={openMenuId === event.id ? menuRef : null}>
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
                                                        className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-md border ${currentStatusStyle.bg} ${currentStatusStyle.text}`}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full ${currentStatusStyle.dot}`}></span>
                                                        {event.status}
                                                    </button>
                                                    {openMenuId === event.id && (
                                                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                                                            <div className="py-1" role="menu" aria-orientation="vertical">
                                                                {Object.values(InterventionStatus).map(status => {
                                                                    const style = statusStyles[status];
                                                                    return (
                                                                        <button
                                                                            key={status}
                                                                            onClick={() => handleStatusChange(event, status)}
                                                                            className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                                            role="menuitem"
                                                                        >
                                                                            <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                                                                            {status}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="text-center text-slate-500 py-6">
                                <p>No hay nada programado para hoy.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="space-y-6">
                    <button onClick={onOpenAllTasks} className="w-full" title="Ver todas las tareas pendientes">
                        <StatCard 
                            icon={IoCheckboxOutline} 
                            title="Tareas Pendientes" 
                            value={stats.pendingTasksCount} 
                            className="hover:bg-amber-100 transition-colors cursor-pointer"
                        />
                    </button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {expiredActions.length > 0 ? (
                            <button onClick={() => setIsExpiredActionsModalOpen(true)} className="w-full h-full" title="Gestionar acciones caducadas">
                                <div className="bg-red-50 p-5 rounded-lg shadow-sm border border-red-200 flex flex-col items-center justify-center gap-2 text-center hover:bg-red-100 transition-colors cursor-pointer h-full">
                                    <div className="bg-red-100 text-red-700 rounded-full p-3">
                                        <IoAlertCircleOutline className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-red-600">{expiredActions.length}</p>
                                        <p className="text-sm font-medium text-slate-500">Acciones Caducadas</p>
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <div className="bg-emerald-50 p-5 rounded-lg shadow-sm border border-emerald-200 flex flex-col items-center justify-center gap-2 text-center h-full">
                                <div className="bg-emerald-100 text-emerald-700 rounded-full p-3">
                                    <IoCheckmarkCircleOutline className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-emerald-800">Todo en orden</p>
                                    <p className="text-sm font-medium text-slate-500">Acciones Caducadas</p>
                                </div>
                            </div>
                        )}

                        {casesWithMissingProfs.length > 0 ? (
                            <button onClick={() => setIsMissingProfsModalOpen(true)} className="w-full h-full" title="Gestionar casos sin profesionales">
                                <div className="bg-purple-50 p-5 rounded-lg shadow-sm border border-purple-200 flex flex-col items-center justify-center gap-2 text-center hover:bg-purple-100 transition-colors cursor-pointer h-full">
                                    <div className="bg-purple-100 text-purple-700 rounded-full p-3">
                                        <IoWarningOutline className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-purple-600">{casesWithMissingProfs.length}</p>
                                        <p className="text-sm font-medium text-slate-500">Asignaciones Pendientes</p>
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <div className="bg-emerald-50 p-5 rounded-lg shadow-sm border border-emerald-200 flex flex-col items-center justify-center gap-2 text-center h-full">
                                <div className="bg-emerald-100 text-emerald-700 rounded-full p-3">
                                    <IoCheckmarkCircleOutline className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-emerald-800">Todo en orden</p>
                                    <p className="text-sm font-medium text-slate-500">Asignaciones</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                            <IoLocationOutline className="text-teal-600 text-xl" />
                            <h3 className="font-semibold text-slate-800">Casos por CEAS</h3>
                        </div>
                        <ul className="space-y-3 text-sm">
                            {stats.casesByCeas.map(({ ceas, count }) => {
                                const barWidth = stats.maxCeasCount > 0 ? (count / stats.maxCeasCount) * 100 : 0;
                                return (
                                    <li key={ceas}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-slate-600 truncate pr-2">{ceas}</span>
                                            <span className="font-bold text-slate-700">{count}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                                            <div
                                                className="bg-teal-500 h-2.5 rounded-full"
                                                style={{ width: `${barWidth}%` }}
                                                title={`${count} caso(s)`}
                                            ></div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                            <IoTimeOutline className="text-teal-600 text-xl" />
                            <h3 className="font-semibold text-slate-800">Actualizados Recientemente</h3>
                        </div>
                        <ul className="space-y-2 text-sm">
                            {stats.recentlyUpdated.map(c => (
                                <li key={c.id} className="flex justify-between items-center">
                                    <button onClick={() => onSelectCaseById(c.id)} className="text-teal-700 hover:underline font-medium truncate" title={`Abrir caso de ${c.name}`}>
                                        {c.name}
                                    </button>
                                    <span className="text-slate-500 flex-shrink-0 ml-2">{timeSinceSpanish(c.lastUpdate)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            <NewEventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                itemData={modalState.item || modalState.initialValues}
                cases={cases}
                onSaveIntervention={onSaveIntervention}
                onDeleteIntervention={onDeleteIntervention}
                requestConfirmation={requestConfirmation}
            />
             <ExpiredActionsModal
                isOpen={isExpiredActionsModalOpen}
                onClose={() => setIsExpiredActionsModalOpen(false)}
                interventions={expiredActions}
                cases={cases}
                onSelectCaseById={onSelectCaseById}
                onEditIntervention={handleOpenEditModal}
            />
            <MissingProfessionalsModal
                isOpen={isMissingProfsModalOpen}
                onClose={() => setIsMissingProfsModalOpen(false)}
                alertCases={casesWithMissingProfs}
                onGoToCase={(caseId) => onSelectCaseById(caseId, 'professionals')}
            />
        </>
    );
};

export default CaseStatsDashboard;