
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Case, CaseStatus, Professional, Intervention, InterventionType, InterventionStatus, DashboardView, Task, User, ProfessionalRole, MyNote } from '../types';
import NewEventModal from './NewEventModal';
import ExpiredActionsModal from './ExpiredActionsModal';
import MissingProfessionalsModal from './MissingProfessionalsModal';
import AssignedByOthersModal, { AssignedTaskItem, AssignedNoteItem, DelegatedTaskItem, DelegatedNoteItem } from './AssignedByOthersModal';
import TechnicianAvatar from './TechnicianAvatar';
import {
    IoTimeOutline,
    IoCheckboxOutline,
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
    IoWarningOutline,
    IoJournalOutline,
    IoPersonAddOutline,
    IoSendOutline
} from 'react-icons/io5';

interface CaseStatsDashboardProps {
  cases: Case[];
  professionals: Professional[];
  generalInterventions: Intervention[];
  generalTasks: Task[];
  generalNotes?: MyNote[];
  onSelectCaseById: (caseId: string, view?: DashboardView) => void;
  onSetStatusFilter: (status: CaseStatus) => void;
  onOpenAllTasks: () => void;
  onOpenNotesPanel: () => void;
  onSaveIntervention: (intervention: Omit<Intervention, 'id'> | Intervention) => void;
  onDeleteIntervention: (intervention: Intervention) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  currentUser: User;
  onOpenAllNotes: () => void;
  onToggleTask?: (caseId: string, taskId: string) => void;
  onToggleGeneralTask?: (taskId: string) => void;
}

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
    variant?: 'amber' | 'teal' | 'red' | 'purple' | 'emerald';
}> = ({ icon: Icon, title, value, className = '', variant = 'amber' }) => {
    const variantStyles = {
        amber: {
            card: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
            iconBg: 'bg-amber-100 text-amber-700',
            value: 'text-orange-600'
        },
        teal: {
            card: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
            iconBg: 'bg-teal-100 text-teal-700',
            value: 'text-teal-700'
        },
        red: {
            card: 'bg-red-50 border-red-200 hover:bg-red-100',
            iconBg: 'bg-red-100 text-red-700',
            value: 'text-red-600'
        },
        purple: {
            card: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            iconBg: 'bg-purple-100 text-purple-700',
            value: 'text-purple-600'
        },
        emerald: {
            card: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
            iconBg: 'bg-emerald-100 text-emerald-700',
            value: 'text-emerald-700'
        }
    };
    const style = variantStyles[variant] || variantStyles.amber;

    return (
        <div className={`${style.card} p-5 rounded-lg shadow-sm border flex flex-col items-center justify-center gap-2 text-center transition-colors ${className}`}>
            <div className={`${style.iconBg} rounded-full p-3`}>
                <Icon className="w-8 h-8" />
            </div>
            <div>
                <p className={`text-2xl font-bold ${style.value}`}>{value}</p>
                <p className="text-sm font-medium text-slate-500">{title}</p>
            </div>
        </div>
    );
};

const AnimatedItem: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div className={`transition-all duration-700 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {children}
        </div>
    );
};

const AnimatedLi: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <li className={`${className} transition-all duration-500 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {children}
        </li>
    );
};

const CaseStatsDashboard: React.FC<CaseStatsDashboardProps> = (props) => {
    const { 
        cases, 
        professionals, 
        generalInterventions, 
        generalTasks, 
        generalNotes = [], 
        onSelectCaseById, 
        onOpenAllTasks, 
        onOpenNotesPanel, 
        onSaveIntervention, 
        onDeleteIntervention, 
        requestConfirmation, 
        currentUser, 
        onOpenAllNotes,
        onToggleTask = () => {},
        onToggleGeneralTask = () => {}
    } = props;

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isExpiredActionsModalOpen, setIsExpiredActionsModalOpen] = useState(false);
    const [isMissingProfsModalOpen, setIsMissingProfsModalOpen] = useState(false);
    const [isAssignedByOthersModalOpen, setIsAssignedByOthersModalOpen] = useState(false);
    const [assignedModalInitialTab, setAssignedModalInitialTab] = useState<'received' | 'delegated'>('received');
    const [agendaTab, setAgendaTab] = useState<'yesterday' | 'today' | 'tomorrow'>('today');
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

    // Determina si una tarea o nota está asignada para que el usuario actual la realice/atienda
    const isAssignedToMe = (item: { createdBy?: string; assignedTo?: string[] }) => {
        if (!currentUser) return true;
        if (currentUser.role === 'admin') return true;
        if (item.assignedTo && item.assignedTo.length > 0) {
            return item.assignedTo.includes(currentUser.id);
        }
        // Si no tiene asignación explícita (legacy), pertenece a su creador
        return item.createdBy === currentUser.id;
    };

    const isVisibleToUser = (item: { createdBy?: string; assignedTo?: string[] }) => {
        if (!currentUser) return true;
        if (currentUser.role === 'admin') return true;
        const isAssigned = item.assignedTo?.includes(currentUser.id);
        const isCreator = item.createdBy === currentUser.id;
        const isLegacy = (!item.assignedTo || item.assignedTo.length === 0) && isCreator;
        return isAssigned || isCreator || isLegacy;
    };

    // Tareas asignadas a mí creadas por otros compañeros
    const assignedTasksByOthers: AssignedTaskItem[] = useMemo(() => {
        if (!currentUser) return [];
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const caseTasks: AssignedTaskItem[] = activeCases.flatMap(c => 
            (c.tasks || [])
                .filter(t => t.assignedTo?.includes(currentUser.id) && t.createdBy && t.createdBy !== currentUser.id)
                .map(t => ({
                    type: 'task' as const,
                    task: t,
                    caseData: c,
                    caseId: c.id,
                    creator: professionals.find(p => p.id === t.createdBy)
                }))
        );

        const genTasks: AssignedTaskItem[] = generalTasks
            .filter(t => t.assignedTo?.includes(currentUser.id) && t.createdBy && t.createdBy !== currentUser.id)
            .map(t => ({
                type: 'task' as const,
                task: t,
                caseData: null,
                caseId: null,
                creator: professionals.find(p => p.id === t.createdBy)
            }));

        return [...caseTasks, ...genTasks];
    }, [cases, generalTasks, currentUser, professionals]);

    // Notas asignadas a mí creadas por otros compañeros
    const assignedNotesByOthers: AssignedNoteItem[] = useMemo(() => {
        if (!currentUser) return [];
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const caseNotes: AssignedNoteItem[] = activeCases.flatMap(c => {
            if (!c.myNotes || !Array.isArray(c.myNotes)) return [];
            return c.myNotes
                .filter(n => n.assignedTo?.includes(currentUser.id) && n.createdBy && n.createdBy !== currentUser.id)
                .map(n => ({
                    type: 'note' as const,
                    note: n,
                    caseData: c,
                    caseId: c.id,
                    creator: professionals.find(p => p.id === n.createdBy)
                }));
        });

        const genNotes: AssignedNoteItem[] = generalNotes
            .filter(n => n.assignedTo?.includes(currentUser.id) && n.createdBy && n.createdBy !== currentUser.id)
            .map(n => ({
                type: 'note' as const,
                note: n,
                caseData: null,
                caseId: null,
                creator: professionals.find(p => p.id === n.createdBy)
            }));

        return [...caseNotes, ...genNotes];
    }, [cases, generalNotes, currentUser, professionals]);

    // Tareas asignadas a OTROS compañeros creadas por mí (delegadas)
    const delegatedTasks: DelegatedTaskItem[] = useMemo(() => {
        if (!currentUser) return [];
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const caseTasks: DelegatedTaskItem[] = activeCases.flatMap(c =>
            (c.tasks || [])
                .filter(t => t.createdBy === currentUser.id && t.assignedTo && t.assignedTo.length > 0 && !t.assignedTo.includes(currentUser.id))
                .map(t => ({
                    type: 'task' as const,
                    task: t,
                    caseData: c,
                    caseId: c.id,
                    assignees: (t.assignedTo || []).map(id => professionals.find(p => p.id === id)).filter(Boolean) as Professional[]
                }))
        );

        const genTasks: DelegatedTaskItem[] = generalTasks
            .filter(t => t.createdBy === currentUser.id && t.assignedTo && t.assignedTo.length > 0 && !t.assignedTo.includes(currentUser.id))
            .map(t => ({
                type: 'task' as const,
                task: t,
                caseData: null,
                caseId: null,
                assignees: (t.assignedTo || []).map(id => professionals.find(p => p.id === id)).filter(Boolean) as Professional[]
            }));

        return [...caseTasks, ...genTasks];
    }, [cases, generalTasks, currentUser, professionals]);

    // Notas asignadas a OTROS compañeros creadas por mí
    const delegatedNotes: DelegatedNoteItem[] = useMemo(() => {
        if (!currentUser) return [];
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const caseNotes: DelegatedNoteItem[] = activeCases.flatMap(c => {
            if (!c.myNotes || !Array.isArray(c.myNotes)) return [];
            return c.myNotes
                .filter(n => n.createdBy === currentUser.id && n.assignedTo && n.assignedTo.length > 0 && !n.assignedTo.includes(currentUser.id))
                .map(n => ({
                    type: 'note' as const,
                    note: n,
                    caseData: c,
                    caseId: c.id,
                    assignees: (n.assignedTo || []).map(id => professionals.find(p => p.id === id)).filter(Boolean) as Professional[]
                }));
        });

        const genNotes: DelegatedNoteItem[] = generalNotes
            .filter(n => n.createdBy === currentUser.id && n.assignedTo && n.assignedTo.length > 0 && !n.assignedTo.includes(currentUser.id))
            .map(n => ({
                type: 'note' as const,
                note: n,
                caseData: null,
                caseId: null,
                assignees: (n.assignedTo || []).map(id => professionals.find(p => p.id === id)).filter(Boolean) as Professional[]
            }));

        return [...caseNotes, ...genNotes];
    }, [cases, generalNotes, currentUser, professionals]);

    const pendingAssignedTasks = useMemo(() => {
        return assignedTasksByOthers.filter(item => !item.task.completed);
    }, [assignedTasksByOthers]);

    const pendingDelegatedTasks = useMemo(() => {
        return delegatedTasks.filter(item => !item.task.completed);
    }, [delegatedTasks]);

    const totalAssignedAlerts = pendingAssignedTasks.length + assignedNotesByOthers.length;
    const totalDelegatedCount = pendingDelegatedTasks.length + delegatedNotes.length;

    const stats = useMemo(() => {
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        // Mis tareas pendientes: SOLO tareas asignadas al usuario actual
        const pendingCaseTasks = activeCases.reduce((acc, c) => acc + c.tasks.filter(isAssignedToMe).filter(t => !t.completed).length, 0);
        const pendingGeneralTasks = generalTasks.filter(isAssignedToMe).filter(t => !t.completed).length;
        const pendingTasksCount = pendingCaseTasks + pendingGeneralTasks;

        // Mis notas pendientes: notas asignadas al usuario actual
        const pendingCaseNotesCount = activeCases.reduce((acc, c) => {
            if (!c.myNotes) return acc;
            if (Array.isArray(c.myNotes)) {
                const userNotes = c.myNotes.filter(isAssignedToMe);
                return acc + userNotes.length;
            }
            return acc + (c.myNotes ? 1 : 0);
        }, 0);
        const pendingGeneralNotesCount = generalNotes.filter(isAssignedToMe).length;
        const pendingNotesCount = pendingCaseNotesCount + pendingGeneralNotesCount;
        
        // Find cases with notebook entries (interventions registered in the notebook)
        const casesWithNotebookEntries: { caseItem: Case; latestNotebookDate: string }[] = [];

        activeCases.forEach(c => {
            const notebookInterventions = (c.interventions || []).filter(i => i.isRegistered);
            if (notebookInterventions.length > 0) {
                // Find the latest date among notebook interventions
                const latestDate = notebookInterventions.reduce((latest, current) => {
                    const currentTime = new Date(current.start).getTime();
                    const latestTime = new Date(latest).getTime();
                    return currentTime > latestTime ? current.start : latest;
                }, notebookInterventions[0].start);

                casesWithNotebookEntries.push({
                    caseItem: c,
                    latestNotebookDate: latestDate
                });
            }
        });

        // Sort by the latest notebook entry date descending, and take the top 5
        casesWithNotebookEntries.sort((a, b) => new Date(b.latestNotebookDate).getTime() - new Date(a.latestNotebookDate).getTime());

        const recentlyUpdated = casesWithNotebookEntries.slice(0, 5);

        return { pendingTasksCount, pendingNotesCount, recentlyUpdated };
    }, [cases, generalTasks, generalNotes, currentUser]);
    
    const getAgendaForDate = (dateObj: Date) => {
        const allInterventions = [
            ...cases.flatMap(c => c.interventions || []),
            ...generalInterventions
        ];
        
        const dateString = dateObj.toDateString();

        return allInterventions
            .filter(event => {
                const isOnDay = new Date(event.start).toDateString() === dateString;
                if (!isOnDay) return false;

                // Users see interventions where they are assigned or which they created
                const isAssigned = Boolean(event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(currentUser.id));
                const isCreator = event.createdBy === currentUser.id;

                return isAssigned || isCreator;
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    };

    const yesterdayAgenda = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return getAgendaForDate(d);
    }, [cases, generalInterventions, currentUser]);

    const todaysAgenda = useMemo(() => {
        return getAgendaForDate(new Date());
    }, [cases, generalInterventions, currentUser]);

    const tomorrowAgenda = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return getAgendaForDate(d);
    }, [cases, generalInterventions, currentUser]);

    const displayedAgenda = useMemo(() => {
        if (agendaTab === 'yesterday') return yesterdayAgenda;
        if (agendaTab === 'tomorrow') return tomorrowAgenda;
        return todaysAgenda;
    }, [agendaTab, yesterdayAgenda, todaysAgenda, tomorrowAgenda]);

    const selectedAgendaDate = useMemo(() => {
        const d = new Date();
        if (agendaTab === 'yesterday') {
            d.setDate(d.getDate() - 1);
        } else if (agendaTab === 'tomorrow') {
            d.setDate(d.getDate() + 1);
        }
        return d;
    }, [agendaTab]);

    const formattedAgendaDate = useMemo(() => {
        return new Intl.DateTimeFormat('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        }).format(selectedAgendaDate);
    }, [selectedAgendaDate]);

    const getAssociatedProfessionals = (event: Intervention, caseForEvent: Case | null | undefined): Professional[] => {
        const found = new Map<string, Professional>();

        if (event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.length > 0) {
            event.assignedTo.forEach(id => {
                const prof = professionals.find(p => p.id === id);
                if (prof) found.set(prof.id, prof);
            });
        }

        if (found.size === 0 && event.createdBy) {
            const prof = professionals.find(p => p.id === event.createdBy);
            if (prof) found.set(prof.id, prof);
        }

        if (found.size === 0 && caseForEvent?.professionalIds && caseForEvent.professionalIds.length > 0) {
            caseForEvent.professionalIds.forEach(id => {
                const prof = professionals.find(p => p.id === id);
                if (prof) found.set(prof.id, prof);
            });
        }

        return Array.from(found.values());
    };

    const expiredActions = useMemo(() => {
        const allInterventions = [
            ...cases.flatMap(c => c.interventions || []),
            ...generalInterventions
        ];
        const twentyFiveHoursAgo = new Date().getTime() - (25 * 60 * 60 * 1000);

        return allInterventions.filter(event =>
            event.createdBy === currentUser.id &&
            event.status === InterventionStatus.Planned &&
            new Date(event.start).getTime() < twentyFiveHoursAgo
        );
    }, [cases, generalInterventions, currentUser]);

    const casesWithMissingProfs = useMemo(() => {
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const professionalMap = new Map(professionals.map(p => [p.id, p]));
        
        return activeCases
            .map(caseData => {
                const assignedProfs = (caseData.professionalIds || []).map(id => professionalMap.get(id)).filter(Boolean) as Professional[];
                const hasTS = assignedProfs.some(p => p.role === ProfessionalRole.SocialWorker || p.role === "Trabajador/a Social" as any);
                const hasEDIS = assignedProfs.some(p => p.role === ProfessionalRole.EdisTechnician || p.role === "Técnico/a EDIS" as any);
                
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

    const handleAddNewEventForSelectedDay = () => {
        const targetDate = new Date();
        if (agendaTab === 'yesterday') {
            targetDate.setDate(targetDate.getDate() - 1);
        } else if (agendaTab === 'tomorrow') {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        setModalState({
            item: null,
            initialValues: { start: targetDate.toISOString() }
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
            {/* Alert Banner for pending tasks/notes assigned by other professionals */}
            {totalAssignedAlerts > 0 && (
                <div className="mb-6 bg-gradient-to-r from-indigo-50 via-white to-sky-50 border border-indigo-200/90 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs flex-shrink-0 relative">
                            <IoPersonAddOutline className="text-xl" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-white"></span>
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-800">
                                    Asignaciones de Compañeros
                                </h4>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                    {totalAssignedAlerts} {totalAssignedAlerts === 1 ? 'pendiente' : 'pendientes'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Tienes {pendingAssignedTasks.length} {pendingAssignedTasks.length === 1 ? 'tarea' : 'tareas'} y {assignedNotesByOthers.length} {assignedNotesByOthers.length === 1 ? 'nota' : 'notas'} asignadas por otros miembros del equipo.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAssignedByOthersModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs hover:shadow transition-all cursor-pointer flex-shrink-0"
                    >
                        <span>Revisar asignaciones</span>
                        <span>&rarr;</span>
                    </button>
                </div>
            )}

            <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <AnimatedItem delay={0}>
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 mr-1">
                                        <IoCalendarClearOutline className="text-teal-600 text-xl" />
                                        <h3 className="font-semibold text-slate-800 text-base">Agenda</h3>
                                    </div>
                                    
                                    {/* Pestañas de Agenda: Ayer, Hoy, Mañana */}
                                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setAgendaTab('yesterday')}
                                            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                agendaTab === 'yesterday'
                                                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                            }`}
                                            title="Ver agenda de ayer"
                                        >
                                            <span>Ayer</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                                agendaTab === 'yesterday' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {yesterdayAgenda.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setAgendaTab('today')}
                                            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                agendaTab === 'today'
                                                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                            }`}
                                            title="Ver agenda de hoy"
                                        >
                                            <span>Hoy</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                                agendaTab === 'today' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {todaysAgenda.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setAgendaTab('tomorrow')}
                                            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                agendaTab === 'tomorrow'
                                                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                            }`}
                                            title="Ver agenda de mañana"
                                        >
                                            <span>Mañana</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                                agendaTab === 'tomorrow' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {tomorrowAgenda.length}
                                            </span>
                                        </button>
                                    </div>

                                    <span className="text-xs font-medium text-slate-500 capitalize hidden md:inline-block">
                                        {formattedAgendaDate}
                                    </span>
                                </div>

                                <button
                                    onClick={handleAddNewEventForSelectedDay}
                                    className="bg-teal-50 text-teal-700 h-9 px-3 rounded-lg hover:bg-teal-100 font-semibold flex items-center justify-center gap-1.5 transition-colors text-sm border border-teal-200 cursor-pointer"
                                    title={`Añadir intervención para ${agendaTab === 'yesterday' ? 'ayer' : agendaTab === 'tomorrow' ? 'mañana' : 'hoy'}`}
                                >
                                    <IoAddOutline className="text-lg" /> Añadir Intervención
                                </button>
                            </div>
                            {displayedAgenda.length > 0 ? (
                                <ul className="space-y-3">
                                    {displayedAgenda.map((event, index) => {
                                        const Icon = interventionIcons[event.interventionType] || IoDocumentTextOutline;
                                        const styleClass = interventionTypeStyles[event.interventionType] || 'text-gray-500';
                                        const caseForEvent = event.caseId ? cases.find(c => c.id === event.caseId) : null;
                                        const associatedProfs = getAssociatedProfessionals(event, caseForEvent);
                                        const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                                        const currentStatusStyle = statusStyles[event.status];
                                        const isMenuOpen = openMenuId === event.id;
                                        
                                        return (
                                            <AnimatedLi 
                                                key={event.id} 
                                                delay={index * 100} 
                                                className={`p-3 rounded-lg border flex flex-col gap-3 transition-colors shadow-sm ${event.status === InterventionStatus.Cancelled ? 'bg-slate-50 opacity-70' : 'bg-white'} ${isMenuOpen ? 'relative z-20' : ''}`}
                                            >
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
                                                                className="text-sm text-teal-700 hover:underline font-medium truncate text-left block"
                                                            >
                                                                {caseForEvent.name}
                                                                {caseForEvent.nickname && ` (${caseForEvent.nickname})`}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {associatedProfs.length > 0 && (
                                                            <div className="flex -space-x-1.5 items-center">
                                                                {associatedProfs.slice(0, 3).map(prof => (
                                                                    <TechnicianAvatar
                                                                        key={prof.id}
                                                                        professional={prof}
                                                                        size="sm"
                                                                        prefix="Asignado/a:"
                                                                        isCurrentUser={prof.id === currentUser?.id}
                                                                        tooltipPosition="top"
                                                                    />
                                                                ))}
                                                                {associatedProfs.length > 3 && (
                                                                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700 border border-white">
                                                                        +{associatedProfs.length - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <button onClick={() => handleOpenEditModal(event)} className="text-slate-400 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors" title="Editar intervención">
                                                            <IoPencilOutline className="text-lg" />
                                                        </button>
                                                    </div>
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
                                            </AnimatedLi>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="text-center text-slate-500 py-6">
                                    <p>
                                        {agendaTab === 'yesterday' && 'No hubo nada programado para ayer.'}
                                        {agendaTab === 'today' && 'No hay nada programado para hoy.'}
                                        {agendaTab === 'tomorrow' && 'No hay nada programado para mañana.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </AnimatedItem>
                </div>
                
                <div className="space-y-6">
                    <AnimatedItem delay={100}>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={onOpenAllTasks} 
                                    className="w-full h-full text-left" 
                                    title="Desplegar todas las tareas pendientes en el panel lateral"
                                >
                                    <StatCard 
                                        icon={IoCheckboxOutline} 
                                        title="Tareas pendientes" 
                                        value={stats.pendingTasksCount} 
                                        variant="amber"
                                        className="cursor-pointer h-full"
                                    />
                                </button>
                                <button 
                                    onClick={onOpenNotesPanel} 
                                    className="w-full h-full text-left" 
                                    title="Desplegar notas de colores ordenadas por casos"
                                >
                                    <StatCard 
                                        icon={IoJournalOutline} 
                                        title="Notas" 
                                        value={stats.pendingNotesCount} 
                                        variant="teal"
                                        className="cursor-pointer h-full"
                                    />
                                </button>
                            </div>

                            <button 
                                onClick={onOpenAllNotes} 
                                className="w-full bg-slate-50 hover:bg-teal-50/80 p-3.5 rounded-lg shadow-sm border border-slate-200 hover:border-teal-300 flex items-center justify-between gap-3 text-slate-700 hover:text-teal-900 transition-all cursor-pointer group"
                                title="Abrir la vista de gestión de todas las tareas y notas"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-teal-100 text-teal-700 rounded-lg p-2 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                        <IoJournalOutline className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-bold text-slate-800 group-hover:text-teal-800">Notas y tareas</span>
                                        <p className="text-xs text-slate-500">Gestión global de notas y tareas</p>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-teal-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                    Abrir gestor &rarr;
                                </span>
                            </button>
                        </div>
                    </AnimatedItem>
                    
                    <AnimatedItem delay={200}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {/* Card 1: Asignado por otros (Recibidas) */}
                            {totalAssignedAlerts > 0 ? (
                                <button 
                                    onClick={() => {
                                        setAssignedModalInitialTab('received');
                                        setIsAssignedByOthersModalOpen(true);
                                    }} 
                                    className="w-full h-full text-left focus:outline-none" 
                                    title="Ver tareas y notas asignadas por otros compañeros"
                                >
                                    <div className="bg-indigo-50 p-4 rounded-xl shadow-xs border border-indigo-200 flex flex-col items-center justify-center gap-2 text-center hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer h-full group">
                                        <div className="bg-indigo-100 text-indigo-700 rounded-full p-2.5 group-hover:scale-105 transition-transform relative">
                                            <IoPersonAddOutline className="w-5 h-5" />
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 border border-white rounded-full"></span>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-indigo-700">{totalAssignedAlerts}</p>
                                            <p className="text-xs font-semibold text-slate-700">Asignado por otros</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                                {pendingAssignedTasks.length} {pendingAssignedTasks.length === 1 ? 'tarea' : 'tareas'} · {assignedNotesByOthers.length} {assignedNotesByOthers.length === 1 ? 'nota' : 'notas'}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setAssignedModalInitialTab('received');
                                        setIsAssignedByOthersModalOpen(true);
                                    }}
                                    className="w-full h-full text-left focus:outline-none"
                                    title="Ver asignaciones recibidas"
                                >
                                    <div className="bg-emerald-50/80 hover:bg-emerald-100/80 p-4 rounded-xl shadow-xs border border-emerald-200 flex flex-col items-center justify-center gap-2 text-center h-full transition-all cursor-pointer">
                                        <div className="bg-emerald-100 text-emerald-700 rounded-full p-2.5">
                                            <IoCheckmarkCircleOutline className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-800">Todo al día</p>
                                            <p className="text-xs font-medium text-slate-500">Asignado por otros</p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* Card 2: Asignadas a otros (Delegadas) */}
                            {pendingDelegatedTasks.length > 0 ? (
                                <button 
                                    onClick={() => {
                                        setAssignedModalInitialTab('delegated');
                                        setIsAssignedByOthersModalOpen(true);
                                    }} 
                                    className="w-full h-full text-left focus:outline-none" 
                                    title="Ver tareas que has asignado a otros compañeros"
                                >
                                    <div className="bg-amber-50 p-4 rounded-xl shadow-xs border border-amber-200 flex flex-col items-center justify-center gap-2 text-center hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer h-full group">
                                        <div className="bg-amber-100 text-amber-800 rounded-full p-2.5 group-hover:scale-105 transition-transform relative">
                                            <IoSendOutline className="w-5 h-5" />
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 border border-white rounded-full"></span>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-amber-800">{pendingDelegatedTasks.length}</p>
                                            <p className="text-xs font-semibold text-slate-800">Asignadas a otros</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                                {pendingDelegatedTasks.length === 1 ? '1 tarea pendiente' : `${pendingDelegatedTasks.length} tareas pendientes`}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setAssignedModalInitialTab('delegated');
                                        setIsAssignedByOthersModalOpen(true);
                                    }}
                                    className="w-full h-full text-left focus:outline-none"
                                    title="Ver tareas asignadas a otros compañeros"
                                >
                                    <div className="bg-slate-50 hover:bg-slate-100 p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col items-center justify-center gap-2 text-center h-full transition-all cursor-pointer">
                                        <div className="bg-slate-200 text-slate-600 rounded-full p-2.5">
                                            <IoSendOutline className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">Sin pendientes</p>
                                            <p className="text-xs font-medium text-slate-500">Asignadas a otros</p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* Card 3: Acciones Caducadas */}
                            {expiredActions.length > 0 ? (
                                <button onClick={() => setIsExpiredActionsModalOpen(true)} className="w-full h-full text-left focus:outline-none" title="Gestionar acciones caducadas">
                                    <div className="bg-red-50 p-4 rounded-xl shadow-xs border border-red-200 flex flex-col items-center justify-center gap-2 text-center hover:bg-red-100 hover:border-red-300 transition-all cursor-pointer h-full group">
                                        <div className="bg-red-100 text-red-700 rounded-full p-2.5 group-hover:scale-105 transition-transform">
                                            <IoAlertCircleOutline className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-red-600">{expiredActions.length}</p>
                                            <p className="text-xs font-semibold text-slate-700">Acciones Caducadas</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Intervenciones pasadas</p>
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <div className="bg-emerald-50/80 p-4 rounded-xl shadow-xs border border-emerald-200 flex flex-col items-center justify-center gap-2 text-center h-full">
                                    <div className="bg-emerald-100 text-emerald-700 rounded-full p-2.5">
                                        <IoCheckmarkCircleOutline className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-800">Todo en orden</p>
                                        <p className="text-xs font-medium text-slate-500">Acciones Caducadas</p>
                                    </div>
                                </div>
                            )}

                            {/* Card 4: Asignaciones Pendientes de Profesionales en Casos */}
                            {casesWithMissingProfs.length > 0 ? (
                                <button onClick={() => setIsMissingProfsModalOpen(true)} className="w-full h-full text-left focus:outline-none" title="Gestionar casos sin profesionales">
                                    <div className="bg-purple-50 p-4 rounded-xl shadow-xs border border-purple-200 flex flex-col items-center justify-center gap-2 text-center hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer h-full group">
                                        <div className="bg-purple-100 text-purple-700 rounded-full p-2.5 group-hover:scale-105 transition-transform">
                                            <IoWarningOutline className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-purple-600">{casesWithMissingProfs.length}</p>
                                            <p className="text-xs font-semibold text-slate-700">Equipos de Caso</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Sin TS o EDIS asignado</p>
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <div className="bg-emerald-50/80 p-4 rounded-xl shadow-xs border border-emerald-200 flex flex-col items-center justify-center gap-2 text-center h-full">
                                    <div className="bg-emerald-100 text-emerald-700 rounded-full p-2.5">
                                        <IoCheckmarkCircleOutline className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-800">Todo en orden</p>
                                        <p className="text-xs font-medium text-slate-500">Equipos de Caso</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </AnimatedItem>
                    
                    <AnimatedItem delay={300}>
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <IoTimeOutline className="text-teal-600 text-xl" />
                                <h3 className="font-semibold text-slate-800">Actualizados Recientemente</h3>
                            </div>
                            {stats.recentlyUpdated.length > 0 ? (
                                <ul className="space-y-2 text-sm">
                                    {stats.recentlyUpdated.map(({ caseItem: c, latestNotebookDate }) => (
                                        <li key={c.id} className="flex justify-between items-center">
                                            <button onClick={() => onSelectCaseById(c.id)} className="text-teal-700 hover:underline font-medium truncate text-left" title={`Abrir caso de ${c.name}`}>
                                                {c.name}
                                            </button>
                                            <span className="text-slate-500 flex-shrink-0 ml-2">{timeSinceSpanish(latestNotebookDate)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No hay casos con actuaciones en el cuaderno.</p>
                            )}
                        </div>
                    </AnimatedItem>
                </div>
            </div>
            <NewEventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                itemData={modalState.item || modalState.initialValues}
                cases={cases}
                professionals={professionals}
                currentUser={currentUser}
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
                onSaveIntervention={onSaveIntervention}
                onDeleteIntervention={onDeleteIntervention}
                requestConfirmation={requestConfirmation}
            />
            <MissingProfessionalsModal
                isOpen={isMissingProfsModalOpen}
                onClose={() => setIsMissingProfsModalOpen(false)}
                alertCases={casesWithMissingProfs}
                onGoToCase={(caseId) => onSelectCaseById(caseId, 'professionals')}
            />
            <AssignedByOthersModal
                isOpen={isAssignedByOthersModalOpen}
                onClose={() => setIsAssignedByOthersModalOpen(false)}
                assignedTasks={assignedTasksByOthers}
                assignedNotes={assignedNotesByOthers}
                delegatedTasks={delegatedTasks}
                delegatedNotes={delegatedNotes}
                initialTab={assignedModalInitialTab}
                professionals={professionals}
                currentUser={currentUser}
                onToggleTask={onToggleTask}
                onToggleGeneralTask={onToggleGeneralTask}
                onSelectCaseById={onSelectCaseById}
                onOpenTasksPanel={() => onOpenAllTasks()}
                onOpenNotesPanel={() => onOpenNotesPanel()}
            />
        </>
    );
};

export default CaseStatsDashboard;
