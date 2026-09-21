import React, { useState, useMemo } from 'react';
import { Case, Intervention, InterventionType, DashboardView, User, Professional, ProfessionalRole } from '../types';
import NewEventModal from './NewEventModal';
import CalendarSearchModal from './CalendarSearchModal';
import TechnicianAvatar from './TechnicianAvatar';
import { 
    IoAddOutline, 
    IoChevronBackOutline, 
    IoChevronForwardOutline, 
    IoSearchOutline,
    IoPeopleOutline,
    IoLockClosedOutline,
    IoEyeOutline,
    IoInformationCircleOutline,
    IoCloseOutline
} from 'react-icons/io5';

interface CalendarViewProps {
    cases: Case[];
    generalInterventions: Intervention[];
    professionals: Professional[];
    onSaveIntervention: (intervention: Omit<Intervention, 'id'> | Intervention) => void;
    onDeleteIntervention: (intervention: Intervention) => void;
    onSelectCaseById: (caseId: string, view: DashboardView) => void;
    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
    currentUser: User;
}

type CalendarViewType = 'month' | 'week' | 'day';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOUR_HEIGHT = 96; // in pixels (increased from 60 to provide ample room for title, time, notes, and avatars)
const START_HOUR = 8;
const END_HOUR = 20;

// FIX: Add missing general intervention types to satisfy Record<InterventionType, ...>
const interventionTypeColors: Record<InterventionType, { backgroundColor: string, color: string, borderLeftColor: string }> = {
    [InterventionType.HomeVisit]: { backgroundColor: '#d1fae5', color: '#065f46', borderLeftColor: '#10b981' }, // emerald
    [InterventionType.PhoneCall]: { backgroundColor: '#e0f2fe', color: '#0c4a6e', borderLeftColor: '#38bdf8' }, // sky
    [InterventionType.Meeting]: { backgroundColor: '#e0e7ff', color: '#3730a3', borderLeftColor: '#6366f1' }, // indigo
    [InterventionType.Workshop]: { backgroundColor: '#f3e8ff', color: '#5b21b6', borderLeftColor: '#a855f7' }, // purple
    [InterventionType.Administrative]: { backgroundColor: '#f1f5f9', color: '#334155', borderLeftColor: '#64748b' }, // slate
    [InterventionType.Coordination]: { backgroundColor: '#fef3c7', color: '#92400e', borderLeftColor: '#f59e0b' }, // amber
    [InterventionType.PsychologicalSupport]: { backgroundColor: '#ffe4e6', color: '#9f1239', borderLeftColor: '#f43f5e' }, // rose
    [InterventionType.GroupSession]: { backgroundColor: '#cffafe', color: '#155e75', borderLeftColor: '#22d3ee' }, // cyan
    [InterventionType.Accompaniment]: { backgroundColor: '#ecfccb', color: '#3f6212', borderLeftColor: '#84cc16' }, // lime
    [InterventionType.Other]: { backgroundColor: '#f3f4f6', color: '#374151', borderLeftColor: '#9ca3af' }, // gray
    [InterventionType.Reunion]: { backgroundColor: '#dbeafe', color: '#1e40af', borderLeftColor: '#3b82f6' }, // blue
    [InterventionType.AssessmentInterview]: { backgroundColor: '#e0f2fe', color: '#0c4a6e', borderLeftColor: '#0ea5e9' },
    [InterventionType.ElaborarMemoria]: { backgroundColor: '#e5e7eb', color: '#374151', borderLeftColor: '#6b7280' }, // gray
    [InterventionType.ElaborarDocumento]: { backgroundColor: '#e5e7eb', color: '#374151', borderLeftColor: '#6b7280' }, // gray
    [InterventionType.Fiesta]: { backgroundColor: '#fce7f3', color: '#9d174d', borderLeftColor: '#ec4899' }, // pink
    [InterventionType.Vacaciones]: { backgroundColor: '#fef9c3', color: '#854d0e', borderLeftColor: '#facc15' }, // yellow
    [InterventionType.Viaje]: { backgroundColor: '#cffafe', color: '#164e63', borderLeftColor: '#06b6d4' }, // cyan
    [InterventionType.CursoFormacion]: { backgroundColor: '#ffedd5', color: '#9a3412', borderLeftColor: '#fb923c' }, // orange
};

const getInterventionTypeColor = (type: InterventionType): { backgroundColor: string, color: string, borderLeftColor: string } => {
    return interventionTypeColors[type] || interventionTypeColors[InterventionType.Other];
};

const isDateInRange = (date: Date, start: Date, end: Date) => {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return checkDate >= startDate && checkDate <= endDate;
};

// Helper interface for positioning
interface PositionedEvent {
    event: Intervention;
    style: {
        top: number; // pixels
        height: number; // pixels
        left: number; // percentage
        width: number; // percentage
    };
}

const calculateEventPositions = (events: Intervention[]): PositionedEvent[] => {
    if (events.length === 0) return [];

    // 1. Sort events by start time, then by duration (longer first)
    const sortedEvents = [...events].sort((a, b) => {
        const startA = new Date(a.start).getTime();
        const startB = new Date(b.start).getTime();
        if (startA !== startB) return startA - startB;
        const durationA = new Date(a.end).getTime() - startA;
        const durationB = new Date(b.end).getTime() - startB;
        return durationB - durationA;
    });

    // 2. Group overlapping events into clusters
    const clusters: Intervention[][] = [];
    let currentCluster: Intervention[] = [];
    let clusterEnd = 0;

    sortedEvents.forEach(event => {
        const start = new Date(event.start).getTime();
        const end = new Date(event.end).getTime();

        if (currentCluster.length === 0) {
            currentCluster.push(event);
            clusterEnd = end;
        } else {
            if (start < clusterEnd) {
                // Overlap: add to current cluster
                currentCluster.push(event);
                clusterEnd = Math.max(clusterEnd, end);
            } else {
                // No overlap: seal current cluster and start new one
                clusters.push(currentCluster);
                currentCluster = [event];
                clusterEnd = end;
            }
        }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);

    // 3. Assign columns within each cluster and calculate positions
    const positionedEvents: PositionedEvent[] = [];

    clusters.forEach(cluster => {
        const columns: Intervention[][] = []; // Array of columns, each containing non-overlapping events

        cluster.forEach(event => {
            let placed = false;
            // Try to place event in an existing column
            for (let i = 0; i < columns.length; i++) {
                const lastEventInColumn = columns[i][columns[i].length - 1];
                if (new Date(event.start).getTime() >= new Date(lastEventInColumn.end).getTime()) {
                    columns[i].push(event);
                    // Store column index temporarily on the event object wrapper logic below
                    (event as any)._colIndex = i; 
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                // Create new column
                columns.push([event]);
                (event as any)._colIndex = columns.length - 1;
            }
        });

        const totalColumns = columns.length;
        const widthPercent = 100 / totalColumns;

        cluster.forEach(event => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            
            // Calculate vertical position
            const startMinutes = start.getHours() * 60 + start.getMinutes();
            const endMinutes = end.getHours() * 60 + end.getMinutes();

            // Filter out events completely outside view range (though they shouldn't be here based on parent logic)
            if (start.getHours() >= END_HOUR || end.getHours() < START_HOUR) return;

            const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
            const durationMinutes = Math.max(30, endMinutes - startMinutes); // Minimum visual duration 30m for comfortable readability
            const height = (durationMinutes / 60) * HOUR_HEIGHT;
            
            const colIndex = (event as any)._colIndex;

            positionedEvents.push({
                event,
                style: {
                    top,
                    height: height - 2, // margin for border
                    left: colIndex * widthPercent,
                    width: widthPercent
                }
            });
        });
    });

    return positionedEvents;
};


const CalendarView: React.FC<CalendarViewProps> = ({ cases, generalInterventions, professionals, onSaveIntervention, onDeleteIntervention, onSelectCaseById, requestConfirmation, currentUser }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [calendarFilter, setCalendarFilter] = useState<'me' | 'all' | string>('me');
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [privateEventInfo, setPrivateEventInfo] = useState<Intervention | null>(null);
    const [modalState, setModalState] = useState<{
        item: Intervention | null;
        initialValues?: Partial<Intervention>;
    }>({ item: null, initialValues: undefined });
    
    // Check if the current user is authorized to see full details of this event (Title, Case, Notes)
    const isFullDetailsAuthorized = (event: Intervention): boolean => {
        if (currentUser.role === 'admin') return true;
        if (event.createdBy === currentUser.id) return true;
        if (event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(currentUser.id)) return true;
        // If it is shared (isShared !== false), colleagues can see full details!
        if (event.isShared !== false) return true;
        return false;
    };

    const allInterventions = useMemo(() => {
        const uniqueMap = new Map<string, Intervention>();
        cases.forEach(c => {
            (c.interventions || []).forEach(i => {
                if (i && i.id) {
                    uniqueMap.set(i.id, i);
                }
            });
        });
        (generalInterventions || []).forEach(i => {
            if (i && i.id && !uniqueMap.has(i.id)) {
                uniqueMap.set(i.id, i);
            }
        });
        const combined = Array.from(uniqueMap.values());

        if (calendarFilter === 'me') {
            return combined.filter(i => 
                i.createdBy === currentUser.id || 
                (i.assignedTo && Array.isArray(i.assignedTo) && i.assignedTo.includes(currentUser.id)) ||
                currentUser.role === 'admin'
            );
        } else if (calendarFilter === 'all') {
            return combined;
        } else {
            // Filter by specific professional ID
            return combined.filter(i => 
                i.createdBy === calendarFilter || 
                (i.assignedTo && Array.isArray(i.assignedTo) && i.assignedTo.includes(calendarFilter))
            );
        }
    }, [cases, generalInterventions, currentUser, calendarFilter]);


    const handlePrev = () => {
        const newDate = new Date(currentDate);
        switch (view) {
            case 'day': newDate.setDate(newDate.getDate() - 1); break;
            case 'week': newDate.setDate(newDate.getDate() - 7); break;
            case 'month': newDate.setMonth(newDate.getMonth() - 1); break;
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        switch (view) {
            case 'day': newDate.setDate(newDate.getDate() + 1); break;
            case 'week': newDate.setDate(newDate.getDate() + 7); break;
            case 'month': newDate.setMonth(newDate.getMonth() + 1); break;
        }
        setCurrentDate(newDate);
    };
    
    const handleToday = () => {
        setCurrentDate(new Date());
        setView('day');
    };
    
    const handleOpenModal = (item: Intervention | null, initialValues?: Partial<Intervention>) => {
        setModalState({ item, initialValues });
        setIsEventModalOpen(true);
    };

    const handleSelectDay = (day: Date) => {
        setCurrentDate(day);
        setView('day');
    };

    const getEventsForDay = (day: Date) => {
        return allInterventions.filter(event => {
            const eventStart = new Date(event.start);
            if (event.isAllDay) {
                return isDateInRange(day, eventStart, new Date(event.end));
            }
            return eventStart.toDateString() === day.toDateString();
        }).sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    };

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

    const EventItem: React.FC<{event: Intervention}> = ({ event }) => {
        const canView = isFullDetailsAuthorized(event);
        const caseForEvent = canView && event.caseId ? cases.find(c => c.id === event.caseId) : null;
        const style = getInterventionTypeColor(event.interventionType);
        const associatedProfs = getAssociatedProfessionals(event, caseForEvent);

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (canView) {
                handleOpenModal(event, undefined);
            } else {
                setPrivateEventInfo(event);
            }
        };

        if (!canView) {
            return (
                <div
                    style={{ ...style, borderLeft: `4px solid ${style.borderLeftColor}` }}
                    className="text-xs p-1.5 rounded-sm overflow-hidden mb-1 cursor-pointer hover:brightness-95 transition-all shadow-2xs opacity-90"
                    onClick={handleClick}
                    title="Cita privada: pulsa para ver disponibilidad horaria"
                >
                    <div className="flex items-center justify-between gap-1">
                        <div className="font-semibold truncate flex-1 min-w-0 flex items-center gap-1 text-slate-700">
                            <IoLockClosedOutline className="text-amber-600 flex-shrink-0 text-xs" />
                            <span>Ocupado ({event.interventionType})</span>
                        </div>
                        {associatedProfs.length > 0 && (
                            <div className="flex -space-x-1 flex-shrink-0 items-center pl-1">
                                {associatedProfs.slice(0, 2).map(prof => (
                                    <TechnicianAvatar
                                        key={prof.id}
                                        professional={prof}
                                        size="xs"
                                        prefix="Asignado/a:"
                                        isCurrentUser={prof.id === currentUser?.id}
                                        tooltipPosition="top"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div
                style={{ ...style, borderLeft: `4px solid ${style.borderLeftColor}` }}
                className="text-xs p-1.5 rounded-sm overflow-hidden mb-1 cursor-pointer hover:brightness-95 transition-all shadow-2xs"
                onClick={handleClick}
            >
                <div className="flex items-center justify-between gap-1">
                    <div className="font-semibold truncate flex-1 min-w-0 flex items-center gap-1">
                        {event.isShared === false && (
                            <span title="Cita privada (compañeros solo ven Ocupado)">
                                <IoLockClosedOutline className="text-amber-600 flex-shrink-0 text-xs" />
                            </span>
                        )}
                        {caseForEvent ? (
                            <>
                                <button
                                    className="hover:underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectCaseById(event.caseId!, 'notebook');
                                    }}
                                >
                                    {caseForEvent.name.split(' ')[0]}
                                    {caseForEvent.nickname && (
                                        <strong className="ml-1">({caseForEvent.nickname})</strong>
                                    )}
                                </button>
                                <span>&nbsp;- {event.title}</span>
                            </>
                        ) : (
                            <span>{event.title}</span>
                        )}
                    </div>
                    {associatedProfs.length > 0 && (
                        <div className="flex -space-x-1 flex-shrink-0 items-center pl-1">
                            {associatedProfs.slice(0, 3).map(prof => (
                                <TechnicianAvatar
                                    key={prof.id}
                                    professional={prof}
                                    size="xs"
                                    prefix="Asociado/a a:"
                                    isCurrentUser={prof.id === currentUser?.id}
                                    tooltipPosition="top"
                                />
                            ))}
                            {associatedProfs.length > 3 && (
                                <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-slate-200 text-slate-700 border border-white">
                                    +{associatedProfs.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const TimedEventItem: React.FC<{event: Intervention}> = ({ event }) => {
        const canView = isFullDetailsAuthorized(event);
        const caseForEvent = canView && event.caseId ? cases.find(c => c.id === event.caseId) : null;
        const style = getInterventionTypeColor(event.interventionType);
        const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const associatedProfs = getAssociatedProfessionals(event, caseForEvent);

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (canView) {
                handleOpenModal(event, undefined);
            } else {
                setPrivateEventInfo(event);
            }
        };

        if (!canView) {
            return (
                <div
                    style={{ ...style, borderLeft: `4px solid ${style.borderLeftColor}` }}
                    className="text-xs p-2 rounded-md overflow-hidden h-full flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-sm opacity-90 hover:opacity-100 group select-none hover:shadow-lg hover:z-30 hover:h-auto hover:min-h-full hover:ring-2 hover:ring-amber-500/40"
                    onClick={handleClick}
                    title="Cita privada: pulsa para ver disponibilidad horaria"
                >
                    <div className="space-y-1.5 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-black/5">
                            <span className="text-[10px] font-bold tracking-wider opacity-90 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center gap-1 truncate">
                                <IoLockClosedOutline className="text-xs" />
                                <span>{event.interventionType}</span>
                            </span>

                            {associatedProfs.length > 0 && (
                                <div className="flex -space-x-1.5 flex-shrink-0 items-center pl-1">
                                    {associatedProfs.slice(0, 3).map(prof => (
                                        <TechnicianAvatar
                                            key={prof.id}
                                            professional={prof}
                                            size="xs"
                                            prefix="Técnico:"
                                            isCurrentUser={prof.id === currentUser?.id}
                                            tooltipPosition="top"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Masked Title */}
                        <div className="font-bold text-[13px] text-slate-800 flex items-center gap-1.5 mt-0.5">
                            <span className="text-amber-800">Ocupado</span>
                            <span className="text-xs font-normal text-slate-500">({event.interventionType})</span>
                        </div>

                        {/* Hora */}
                        <div className="pt-0.5">
                            {!event.isAllDay ? (
                                <span className="inline-block bg-white/90 px-1.5 py-0.5 rounded border border-black/5 font-semibold text-slate-700 text-[11px]">
                                    {timeFormat.format(new Date(event.start))} - {timeFormat.format(new Date(event.end))}
                                </span>
                            ) : (
                                <span className="inline-block bg-white/90 px-1.5 py-0.5 rounded border border-black/5 font-semibold text-slate-600 text-[10px]">
                                    Todo el día
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div
                style={{ ...style, borderLeft: `4px solid ${style.borderLeftColor}` }}
                className="text-xs p-2 rounded-md overflow-hidden h-full flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-sm group select-none hover:overflow-visible hover:shadow-xl hover:z-30 hover:h-auto hover:min-h-full hover:ring-2 hover:ring-teal-500/40"
                onClick={handleClick}
            >
                <div className="space-y-1.5 min-w-0">
                    {/* Header: Técnicos asignados en la parte superior derecha + Badge de Tipo de Cita */}
                    <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-black/5">
                        <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 px-1.5 py-0.5 rounded bg-black/5 truncate">
                                {event.interventionType}
                            </span>
                            {event.isShared === false && (
                                <span className="p-0.5 bg-amber-100 text-amber-800 rounded text-[10px] flex items-center" title="Cita privada (solo tú ves los detalles)">
                                    <IoLockClosedOutline />
                                </span>
                            )}
                        </div>

                        {associatedProfs.length > 0 && (
                            <div className="flex -space-x-1.5 flex-shrink-0 items-center pl-1">
                                {associatedProfs.slice(0, 4).map(prof => (
                                    <TechnicianAvatar
                                        key={prof.id}
                                        professional={prof}
                                        size="xs"
                                        prefix="Asignado/a:"
                                        isCurrentUser={prof.id === currentUser?.id}
                                        tooltipPosition="top"
                                    />
                                ))}
                                {associatedProfs.length > 4 && (
                                    <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-slate-200 text-slate-700 border border-white">
                                        +{associatedProfs.length - 4}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Usuario / Caso & Título */}
                    <div className="leading-snug">
                        {caseForEvent && (
                            <div className="text-[12px] font-bold text-slate-900 flex items-center gap-1">
                                <button
                                    className="hover:underline text-teal-800 font-bold truncate text-left"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectCaseById(event.caseId!, 'notebook');
                                    }}
                                    title={`Ir al caso de ${caseForEvent.name}`}
                                >
                                    {caseForEvent.name}
                                    {caseForEvent.nickname && (
                                        <span className="ml-1 text-slate-600 font-medium">({caseForEvent.nickname})</span>
                                    )}
                                </button>
                            </div>
                        )}
                        <div className="font-semibold text-[13px] text-slate-800 mt-0.5 group-hover:whitespace-normal line-clamp-2 group-hover:line-clamp-none break-words">
                            {event.title}
                        </div>
                    </div>

                    {/* Hora */}
                    <div className="pt-0.5">
                        {!event.isAllDay ? (
                            <span className="inline-block bg-white/90 px-1.5 py-0.5 rounded border border-black/5 font-semibold text-slate-700 text-[11px]">
                                {timeFormat.format(new Date(event.start))} - {timeFormat.format(new Date(event.end))}
                            </span>
                        ) : (
                            <span className="inline-block bg-white/90 px-1.5 py-0.5 rounded border border-black/5 font-semibold text-slate-600 text-[10px]">
                                Todo el día
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    
    const renderHeader = () => {
        const monthYearFormat = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
        const monthDayYearFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const getTitle = () => {
            switch(view) {
                case 'day':
                    return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(currentDate);
                case 'week':
                    const startOfWeek = new Date(currentDate);
                    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 6) % 7);
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(endOfWeek.getDate() + 6);
                    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                         return `${startOfWeek.getDate()} - ${monthDayYearFormat.format(endOfWeek)}`;
                    }
                    return `${monthDayYearFormat.format(startOfWeek)} - ${monthDayYearFormat.format(endOfWeek)}`;
                case 'month':
                default:
                    return monthYearFormat.format(currentDate);
            }
        };

        const navButtonStyle = "px-3 py-1.5 text-sm font-semibold rounded-md transition-colors focus:outline-none cursor-pointer";
        const activeStyle = "bg-white text-teal-700 shadow-sm";
        const inactiveStyle = "bg-transparent text-slate-600 hover:bg-white/60";

        // Filter list of technicians for the selector
        const techniciansList = professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);

        return (
            <div className="space-y-3 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 capitalize text-center sm:text-left">
                        {getTitle()}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                         <button
                            onClick={() => setIsSearchModalOpen(true)}
                            className="bg-slate-100 text-slate-600 w-10 h-10 rounded-lg hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Buscar intervenciones"
                            title="Buscar intervenciones"
                        >
                            <IoSearchOutline className="text-xl" />
                        </button>
                         <button
                            onClick={() => handleOpenModal(null, { start: currentDate.toISOString(), isDayOnly: true } as any)}
                            className="bg-teal-600 text-white w-10 h-10 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Añadir nueva intervención"
                            title="Añadir nueva intervención"
                        >
                            <IoAddOutline className="text-2xl" />
                        </button>
                        <div className="flex items-center border border-slate-300 rounded-lg bg-white shadow-2xs">
                            <button onClick={handlePrev} className="p-2 text-slate-600 hover:bg-slate-100 rounded-l-lg cursor-pointer"><IoChevronBackOutline /></button>
                            <button onClick={handleToday} className="px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 border-x border-slate-300 cursor-pointer">Hoy</button>
                            <button onClick={handleNext} className="p-2 text-slate-600 hover:bg-slate-100 rounded-r-lg cursor-pointer"><IoChevronForwardOutline /></button>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setView('month')} className={`${navButtonStyle} ${view === 'month' ? activeStyle : inactiveStyle}`}>Mes</button>
                            <button onClick={() => setView('week')} className={`${navButtonStyle} ${view === 'week' ? activeStyle : inactiveStyle}`}>Semana</button>
                            <button onClick={() => setView('day')} className={`${navButtonStyle} ${view === 'day' ? activeStyle : inactiveStyle}`}>Día</button>
                        </div>
                    </div>
                </div>

                {/* Team Visibility & Colleague Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <IoPeopleOutline className="text-sm text-teal-700" />
                            <span>Agenda:</span>
                        </span>
                        
                        <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setCalendarFilter('me')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                    calendarFilter === 'me'
                                        ? 'bg-teal-700 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                Mi agenda
                            </button>
                            <button
                                type="button"
                                onClick={() => setCalendarFilter('all')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                    calendarFilter === 'all'
                                        ? 'bg-teal-700 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <span>Todo el equipo</span>
                            </button>
                        </div>

                        {/* Dropdown for specific colleague */}
                        <div className="flex items-center gap-1.5">
                            <select
                                value={calendarFilter !== 'me' && calendarFilter !== 'all' ? calendarFilter : ''}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setCalendarFilter(e.target.value);
                                    }
                                }}
                                className={`text-xs py-1 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                                    calendarFilter !== 'me' && calendarFilter !== 'all'
                                        ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <option value="" disabled={calendarFilter === 'me' || calendarFilter === 'all'}>
                                    {calendarFilter !== 'me' && calendarFilter !== 'all' ? 'Ver compañero:' : 'Filtrar por compañero...'}
                                </option>
                                {techniciansList.map(prof => (
                                    <option key={prof.id} value={prof.id}>
                                        {prof.name} {prof.id === currentUser?.id ? '(Tú)' : ''}
                                    </option>
                                ))}
                            </select>
                            {calendarFilter !== 'me' && calendarFilter !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => setCalendarFilter('me')}
                                    className="text-xs text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer"
                                >
                                    ✕ Restablecer
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Privacy Legend */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 self-end sm:self-auto">
                        <span className="flex items-center gap-1 font-medium">
                            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                            <span>Visible para equipo</span>
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                            <IoLockClosedOutline className="text-amber-600 text-xs" />
                            <span>Privada ("Ocupado")</span>
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startDate = new Date(monthStart);
        const startDay = (monthStart.getDay() + 6) % 7; // Monday is 0
        startDate.setDate(startDate.getDate() - startDay);

        const rows = [];
        let day = new Date(startDate);
        
        for (let w = 0; w < 6; w++) {
            let days = [];
            for (let i = 0; i < 7; i++) {
                const cloneDay = new Date(day);
                const isCurrentMonth = cloneDay.getMonth() === currentDate.getMonth();
                const isToday = new Date().toDateString() === cloneDay.toDateString();
                const dayEvents = getEventsForDay(cloneDay);

                days.push(
                    <div
                        key={day.toISOString()}
                        className={`relative border-t border-r border-slate-200 min-h-[90px] sm:min-h-[120px] overflow-y-auto p-1.5 cursor-pointer transition-colors hover:bg-slate-100/50 ${isCurrentMonth ? 'bg-white' : 'bg-slate-50'}`}
                        onClick={() => handleOpenModal(null, { start: cloneDay.toISOString(), isDayOnly: true } as any)}
                    >
                        <span className={`text-sm font-medium ${isToday ? 'bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                            {cloneDay.getDate()}
                        </span>
                        <div className={`mt-1 space-y-1 ${!isCurrentMonth ? 'opacity-60' : ''}`}>
                            {dayEvents.slice(0, 4).map(event => <EventItem key={event.id} event={event} />)}
                            {dayEvents.length > 4 && <p className="text-xs text-slate-400 font-medium text-center">+ {dayEvents.length - 4} más</p>}
                        </div>
                    </div>
                );
                day.setDate(day.getDate() + 1);
            }
            rows.push(<div key={w} className="grid grid-cols-7">{days}</div>);
        }
        return (
            <>
                <div className="grid grid-cols-7 text-center font-semibold text-slate-600">
                    {WEEKDAYS.map(day => <div key={day} className="py-2 border-b border-slate-200">{day}</div>)}
                </div>
                <div className="border-l border-b border-slate-200">{rows}</div>
            </>
        );
    };
    
    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 6) % 7);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            return day;
        });

        const allDayEventsByDay = weekDays.map(day => getEventsForDay(day).filter(e => e.isAllDay));
        const timedEventsPositionsByDay = weekDays.map(day => {
             const rawEvents = getEventsForDay(day).filter(e => !e.isAllDay);
             return calculateEventPositions(rawEvents);
        });
    
        const timeColumn = (
            <div className="w-16 flex-shrink-0 text-right pr-2">
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                    <div key={`time-label-${i}`} style={{ height: `${HOUR_HEIGHT}px` }}>
                        <span className="relative -top-3 text-xs text-slate-500">
                            {`${(START_HOUR + i).toString().padStart(2, '0')}:00`}
                        </span>
                    </div>
                ))}
            </div>
        );
    
        const gridColumn = (
            <div className="relative flex-1">
                {/* Background Grid */}
                <div className="grid-lines grid grid-cols-7">
                    {Array.from({ length: (END_HOUR - START_HOUR) * 7 }).map((_, i) => {
                        const dayIndex = i % 7;
                        const hourIndex = Math.floor(i / 7);
                        const hour = START_HOUR + hourIndex;
                        const targetDay = weekDays[dayIndex];
                        const slotDate = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), hour, 0, 0, 0);
                        return (
                            <div 
                                key={`grid-cell-${i}`} 
                                style={{ height: `${HOUR_HEIGHT}px` }} 
                                className="border-b border-l border-slate-200 cursor-pointer hover:bg-teal-50/40 transition-colors"
                                onClick={() => handleOpenModal(null, { start: slotDate.toISOString(), hasExplicitTime: true } as any)}
                                title={`Crear cita para ${targetDay.toLocaleDateString('es-ES')} a las ${hour.toString().padStart(2, '0')}:00`}
                            ></div>
                        );
                    })}
                </div>
    
                {/* Events */}
                <div className="absolute top-0 left-0 right-0 bottom-0 grid grid-cols-7 pointer-events-none">
                    {timedEventsPositionsByDay.map((positionedEvents, dayIndex) => (
                        <div key={dayIndex} className="relative border-l border-slate-200">
                            {positionedEvents.map(({event, style}) => (
                                <div 
                                    key={event.id} 
                                    className="absolute z-10 pointer-events-auto hover:z-40" 
                                    style={{ 
                                        top: `${style.top}px`, 
                                        height: `${style.height}px`,
                                        left: `${style.left}%`,
                                        width: `${style.width}%`,
                                        paddingRight: '2px' // small visual gap
                                    }}
                                >
                                    <TimedEventItem event={event} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    
        return (
            <div className="overflow-x-auto rounded-lg">
                <div className="border border-slate-200 bg-white min-w-[900px]">
                    {/* Day Headers */}
                    <div className="flex">
                        <div className="w-16 flex-shrink-0 border-b border-slate-200"></div> {/* Top-left corner */}
                        <div className="flex-1 grid grid-cols-7">
                            {weekDays.map(day => (
                                <div key={day.toISOString()} className="text-center p-2 border-b border-l border-slate-200">
                                    <div className="text-sm font-semibold text-slate-600">{WEEKDAYS[(day.getDay() + 6) % 7]}</div>
                                    <button
                                        onClick={() => handleSelectDay(day)}
                                        className={`text-lg font-bold rounded-full w-8 h-8 mx-auto flex items-center justify-center transition-colors hover:bg-teal-100 ${new Date().toDateString() === day.toDateString() ? 'bg-teal-600 text-white hover:bg-teal-700' : 'text-slate-800'}`}
                                    >
                                        {day.getDate()}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* All-day Events Section */}
                    {allDayEventsByDay.some(e => e.length > 0) && (
                        <div className="flex">
                             <div className="w-16 flex-shrink-0 border-b border-slate-200 text-center flex items-center justify-center">
                                <span className="text-xs font-semibold text-slate-500">Todo el día</span>
                             </div>
                             <div className="flex-1 grid grid-cols-7">
                                 {allDayEventsByDay.map((events, dayIndex) => (
                                     <div key={dayIndex} className="border-b border-l border-slate-200 p-1 min-h-[30px]">
                                        {events.map(event => <EventItem key={event.id} event={event} />)}
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
        
                    {/* Timed Events Grid */}
                    <div className="flex">
                        {timeColumn}
                        {gridColumn}
                    </div>
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const dayEvents = getEventsForDay(currentDate);
        const allDayEvents = dayEvents.filter(e => e.isAllDay);
        
        const rawTimedEvents = dayEvents.filter(e => !e.isAllDay);
        const positionedEvents = calculateEventPositions(rawTimedEvents);
    
        const timeColumn = (
            <div className="w-16 flex-shrink-0 text-right pr-2">
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                    <div key={`time-label-${i}`} style={{ height: `${HOUR_HEIGHT}px` }}>
                        <span className="relative -top-3 text-xs text-slate-500">
                            {`${(START_HOUR + i).toString().padStart(2, '0')}:00`}
                        </span>
                    </div>
                ))}
            </div>
        );
    
        const gridColumn = (
            <div className="relative flex-1">
                {/* Background grid lines */}
                <div className="grid-lines">
                    {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                        const hour = START_HOUR + i;
                        const slotDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, 0, 0, 0);
                        return (
                            <div 
                                key={`grid-line-${i}`} 
                                style={{ height: `${HOUR_HEIGHT}px` }} 
                                className="border-b border-slate-200 cursor-pointer hover:bg-teal-50/40 transition-colors"
                                onClick={() => handleOpenModal(null, { start: slotDate.toISOString(), hasExplicitTime: true } as any)}
                                title={`Crear cita para ${currentDate.toLocaleDateString('es-ES')} a las ${hour.toString().padStart(2, '0')}:00`}
                            ></div>
                        );
                    })}
                </div>
                
                {/* Timed Events */}
                <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                    {positionedEvents.map(({event, style}) => (
                        <div 
                            key={event.id} 
                            className="absolute z-10 pointer-events-auto hover:z-40" 
                            style={{ 
                                top: `${style.top}px`, 
                                height: `${style.height}px`,
                                left: `${style.left}%`,
                                width: `${style.width}%`,
                                paddingRight: '4px'
                            }}
                        >
                            <TimedEventItem event={event} />
                        </div>
                    ))}
                </div>
            </div>
        );
    
        return (
            <div className="border border-slate-200 bg-white rounded-lg">
                 {allDayEvents.length > 0 && (
                    <div className="p-2 border-b border-slate-200 flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 w-16 text-center flex-shrink-0">Todo el día</span>
                        <div className="flex-1 flex flex-wrap gap-1">
                            {allDayEvents.map(event => <EventItem key={event.id} event={event} />)}
                        </div>
                    </div>
                 )}
                <div className="flex">
                    {timeColumn}
                    <div className="flex-1 border-l border-slate-200">
                        {gridColumn}
                    </div>
                </div>
            </div>
        );
    };


    return (
        <div className="container mx-auto px-4 py-8">
            {renderHeader()}
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
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
            
            <CalendarSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                interventions={allInterventions}
                cases={cases}
                professionals={professionals}
                currentUser={currentUser}
                onSelectIntervention={(intervention) => {
                    if (isFullDetailsAuthorized(intervention)) {
                        handleOpenModal(intervention, undefined);
                    } else {
                        setPrivateEventInfo(intervention);
                    }
                }}
            />

            {/* Private Event Info Modal */}
            {privateEventInfo && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-200">
                        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IoLockClosedOutline className="text-xl" />
                                <h3 className="font-bold text-lg">Cita privada</h3>
                            </div>
                            <button
                                onClick={() => setPrivateEventInfo(null)}
                                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                            >
                                <IoCloseOutline className="text-2xl" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 text-slate-700 text-sm">
                            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3">
                                <IoInformationCircleOutline className="text-amber-700 text-xl flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-900 leading-relaxed">
                                    Esta cita ha sido marcada como no compartida por su creador/a. Solo se muestra la disponibilidad horaria y el tipo de intervención.
                                </p>
                            </div>

                            <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Estado:</span>
                                    <span className="font-bold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full text-xs">
                                        Ocupado
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Tipo de intervención:</span>
                                    <span className="font-semibold text-slate-800">
                                        {privateEventInfo.interventionType}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Fecha:</span>
                                    <span className="font-semibold text-slate-800">
                                        {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(privateEventInfo.start))}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Horario:</span>
                                    <span className="font-semibold text-slate-800">
                                        {privateEventInfo.isAllDay
                                            ? 'Todo el día'
                                            : `${new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(privateEventInfo.start))} - ${new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(privateEventInfo.end))}`}
                                    </span>
                                </div>
                                {getAssociatedProfessionals(privateEventInfo, null).length > 0 && (
                                    <div className="flex items-center justify-between py-1.5">
                                        <span className="text-slate-500 font-medium">Técnico/s:</span>
                                        <div className="flex items-center gap-1.5">
                                            {getAssociatedProfessionals(privateEventInfo, null).map(p => (
                                                <span key={p.id} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold text-slate-700">
                                                    {p.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setPrivateEventInfo(null)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;