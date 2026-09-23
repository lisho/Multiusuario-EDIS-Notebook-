import React, { useState, useMemo, useRef, useEffect } from 'react';
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
    IoEyeOffOutline,
    IoExpandOutline,
    IoContractOutline,
    IoInformationCircleOutline,
    IoCloseOutline,
    IoCheckmarkOutline,
    IoFilterOutline,
    IoPersonAddOutline,
    IoChevronDownOutline,
    IoCloseCircleOutline,
    IoSparklesOutline,
    IoColorPaletteOutline,
    IoFlashOutline
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
const COMMON_FREE_START_HOUR = 8; // Restricción horaria: 8:00
const COMMON_FREE_END_HOUR = 15;   // Restricción horaria: 15:00

// Paleta de colores armónica y contrastada para cada técnico/a
export interface TechnicianColorConfig {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
    ring: string;
    name: string;
}

export const TECHNICIAN_PALETTES: TechnicianColorConfig[] = [
    { bg: '#eff6ff', text: '#1e3a8a', border: '#3b82f6', badgeBg: '#dbeafe', badgeText: '#1e40af', dot: '#2563eb', ring: '#93c5fd', name: 'Azul' },
    { bg: '#f0fdf4', text: '#14532d', border: '#22c55e', badgeBg: '#dcfce7', badgeText: '#166534', dot: '#16a34a', ring: '#86efac', name: 'Verde' },
    { bg: '#faf5ff', text: '#581c87', border: '#a855f7', badgeBg: '#f3e8ff', badgeText: '#6b21a8', dot: '#9333ea', ring: '#d8b4fe', name: 'Morado' },
    { bg: '#fff7ed', text: '#7c2d12', border: '#f97316', badgeBg: '#ffedd5', badgeText: '#9a3412', dot: '#ea580c', ring: '#fdba74', name: 'Naranja' },
    { bg: '#fdf2f8', text: '#831843', border: '#ec4899', badgeBg: '#fce7f3', badgeText: '#9d174d', dot: '#db2777', ring: '#f9a8d4', name: 'Rosa' },
    { bg: '#ecfeff', text: '#164e63', border: '#06b6d4', badgeBg: '#cffafe', badgeText: '#155e75', dot: '#0891b2', ring: '#67e8f9', name: 'Cian' },
    { bg: '#fefce8', text: '#713f12', border: '#eab308', badgeBg: '#fef9c3', badgeText: '#854d0e', dot: '#ca8a04', ring: '#fde047', name: 'Ámbar' },
    { bg: '#f0fdfa', text: '#134e4a', border: '#14b8a6', badgeBg: '#ccfbf1', badgeText: '#115e59', dot: '#0d9488', ring: '#5eead4', name: 'Turquesa' },
    { bg: '#fff1f2', text: '#881337', border: '#f43f5e', badgeBg: '#ffe4e6', badgeText: '#9f1239', dot: '#e11d48', ring: '#fda4af', name: 'Rojo suave' },
    { bg: '#f5f3ff', text: '#3b0764', border: '#8b5cf6', badgeBg: '#ede9fe', badgeText: '#4c1d95', dot: '#7c3aed', ring: '#c4b5fd', name: 'Índigo' },
];

export const getProfessionalColorConfig = (profId: string | undefined, allProfs: Professional[]): TechnicianColorConfig => {
    if (!profId) return TECHNICIAN_PALETTES[0];
    const idx = allProfs.findIndex(p => p.id === profId);
    if (idx >= 0) {
        return TECHNICIAN_PALETTES[idx % TECHNICIAN_PALETTES.length];
    }
    let hash = 0;
    for (let i = 0; i < profId.length; i++) {
        hash = (hash << 5) - hash + profId.charCodeAt(i);
        hash |= 0;
    }
    return TECHNICIAN_PALETTES[Math.abs(hash) % TECHNICIAN_PALETTES.length];
};

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
    const [collapseWeekends, setCollapseWeekends] = useState<boolean>(true);
    const [calendarFilter, setCalendarFilter] = useState<'me' | 'all' | 'custom'>('me');
    const [selectedColleagueIds, setSelectedColleagueIds] = useState<string[]>([currentUser.id]);
    const [isMultiSelectOpen, setIsMultiSelectOpen] = useState<boolean>(false);
    const [colleagueSearchQuery, setColleagueSearchQuery] = useState<string>('');
    const multiSelectRef = useRef<HTMLDivElement>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [privateEventInfo, setPrivateEventInfo] = useState<Intervention | null>(null);
    const [modalState, setModalState] = useState<{
        item: Intervention | null;
        initialValues?: Partial<Intervention>;
    }>({ item: null, initialValues: undefined });

    // Nuevos estados para vistas compartidas:
    // 1. Modo de color: por tipo de cita o por técnico/a
    const [colorMode, setColorMode] = useState<'by-type' | 'by-technician'>('by-type');
    // 2. Resaltar huecos comunes libres
    const [highlightFreeSlots, setHighlightFreeSlots] = useState<boolean>(true);
    // 3. Resaltar tareas conjuntas entre los calendarios mostrados
    const [highlightJointTasks, setHighlightJointTasks] = useState<boolean>(true);
    // 4. Aviso modal de acceso restringido para citas donde el técnico no está asignado
    const [restrictedAccessNotice, setRestrictedAccessNotice] = useState<{
        isOpen: boolean;
        title: string;
        associatedNames: string;
    }>({ isOpen: false, title: '', associatedNames: '' });
    
    // Close multi-select popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (multiSelectRef.current && !multiSelectRef.current.contains(event.target as Node)) {
                setIsMultiSelectOpen(false);
            }
        };
        if (isMultiSelectOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMultiSelectOpen]);

    // Check if the current user is authorized to see full details of this event (Title, Case, Notes)
    const isFullDetailsAuthorized = (event: Intervention): boolean => {
        if (currentUser.role === 'admin') return true;
        if (event.createdBy === currentUser.id) return true;
        if (event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(currentUser.id)) return true;
        // If it is shared (isShared !== false), colleagues can see full details!
        if (event.isShared !== false) return true;
        return false;
    };

    // Determina si el usuario actual tiene permisos para entrar en la cita y editar su información
    // Un técnico NO debe poder editar las citas en las que no aparece asignado (ni entrar en su modal)
    const canEditOrEnterEvent = (event: Intervention): boolean => {
        if (currentUser.role === 'admin') return true;
        const isAssigned = (event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(currentUser.id)) || event.createdBy === currentUser.id;
        return Boolean(isAssigned);
    };

    // Personal EDIS para asignación y desplegables (todos los técnicos del equipo EDIS, incluidos administradores)
    const edisTechnicians = useMemo(() => {
        return professionals.filter(p => 
            p.role === ProfessionalRole.EdisTechnician || 
            (p.role !== ProfessionalRole.SocialWorker && p.isSystemUser) ||
            p.role !== ProfessionalRole.SocialWorker
        );
    }, [professionals]);

    // Técnicos activos en la vista compartida actual
    const activeSharedTechnicians = useMemo(() => {
        if (calendarFilter === 'all') {
            return edisTechnicians;
        }
        if (calendarFilter === 'custom') {
            return edisTechnicians.filter(p => selectedColleagueIds.includes(p.id));
        }
        const meProf = professionals.find(p => p.id === currentUser.id);
        return meProf ? [meProf] : [];
    }, [calendarFilter, edisTechnicians, selectedColleagueIds, currentUser, professionals]);

    // Indica si se están comparando múltiples técnicos simultáneamente
    const isSharedViewActive = activeSharedTechnicians.length > 1;

    const toggleColleague = (profId: string) => {
        let next: string[];
        if (calendarFilter !== 'custom') {
            if (calendarFilter === 'me') {
                if (profId === currentUser.id) {
                    next = [];
                } else {
                    next = [currentUser.id, profId];
                }
            } else {
                next = [profId];
            }
        } else {
            if (selectedColleagueIds.includes(profId)) {
                next = selectedColleagueIds.filter(id => id !== profId);
            } else {
                next = [...selectedColleagueIds, profId];
            }
        }
        setSelectedColleagueIds(next);
        setCalendarFilter('custom');
    };

    const selectOnlyColleague = (profId: string) => {
        setSelectedColleagueIds([profId]);
        setCalendarFilter('custom');
        setIsMultiSelectOpen(false);
    };

    const selectMeAndColleague = (profId: string) => {
        const newSet = new Set([currentUser.id, profId]);
        setSelectedColleagueIds(Array.from(newSet));
        setCalendarFilter('custom');
        setIsMultiSelectOpen(false);
    };

    const selectAllTechnicians = () => {
        setSelectedColleagueIds(edisTechnicians.map(p => p.id));
        setCalendarFilter('custom');
    };

    const clearSelectedColleagues = () => {
        setSelectedColleagueIds([]);
        setCalendarFilter('custom');
    };

    const resetToMe = () => {
        setSelectedColleagueIds([currentUser.id]);
        setCalendarFilter('me');
        setIsMultiSelectOpen(false);
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
            // Filter by multiple selected professional IDs
            if (selectedColleagueIds.length === 0) return [];
            return combined.filter(i => {
                const isCreatedBy = selectedColleagueIds.includes(i.createdBy);
                const isAssignedTo = i.assignedTo && Array.isArray(i.assignedTo) && i.assignedTo.some(id => selectedColleagueIds.includes(id));
                return isCreatedBy || isAssignedTo;
            });
        }
    }, [cases, generalInterventions, currentUser, calendarFilter, selectedColleagueIds]);


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
        if (item && currentUser.role !== 'admin' && !canEditOrEnterEvent(item)) {
            const caseForEvent = item.caseId ? cases.find(c => c.id === item.caseId) : null;
            const associatedProfs = getAssociatedProfessionals(item, caseForEvent);
            setRestrictedAccessNotice({
                isOpen: true,
                title: item.title,
                associatedNames: associatedProfs.map(p => p.name).join(', ') || 'Otros técnicos'
            });
            return;
        }
        let enhancedInitialValues = initialValues;
        if (!item && calendarFilter === 'custom' && selectedColleagueIds.length > 0) {
            enhancedInitialValues = {
                assignedTo: selectedColleagueIds,
                ...initialValues,
            };
        }
        setModalState({ item, initialValues: enhancedInitialValues });
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

    // Calculate count of events on Saturday and Sunday for the current view period
    const currentPeriodWeekendEvents = useMemo(() => {
        if (view === 'day') return { total: 0 };
        if (view === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 6) % 7);
            const sat = new Date(startOfWeek);
            sat.setDate(sat.getDate() + 5);
            const sun = new Date(startOfWeek);
            sun.setDate(sun.getDate() + 6);
            const satEvents = getEventsForDay(sat);
            const sunEvents = getEventsForDay(sun);
            return {
                satCount: satEvents.length,
                sunCount: sunEvents.length,
                total: satEvents.length + sunEvents.length
            };
        }
        if (view === 'month') {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const startDate = new Date(monthStart);
            const startDay = (monthStart.getDay() + 6) % 7;
            startDate.setDate(startDate.getDate() - startDay);
            let total = 0;
            let day = new Date(startDate);
            for (let i = 0; i < 42; i++) {
                const dayOfWeek = (day.getDay() + 6) % 7;
                if (dayOfWeek >= 5 && day.getMonth() === currentDate.getMonth()) {
                    total += getEventsForDay(day).length;
                }
                day.setDate(day.getDate() + 1);
            }
            return {
                satCount: 0,
                sunCount: 0,
                total
            };
        }
        return { total: 0 };
    }, [currentDate, view, allInterventions]);

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

    // Comprobar si una franja de 30 minutos [hour:minute, hour:minute + 30 min] en targetDay está libre para TODOS los técnicos activos en la vista
    // NOTA: Únicamente se calculan y resaltan espacios libres comunes dentro de la jornada de 8:00 a 15:00
    const checkIsCommonFreeSlot = (targetDay: Date, hour: number, minute: number = 0): boolean => {
        if (!isSharedViewActive || activeSharedTechnicians.length <= 1) return false;
        
        // Restricción: sólo resaltar huecos comunes entre las 8:00 y las 15:00
        if (hour < COMMON_FREE_START_HOUR || hour >= COMMON_FREE_END_HOUR) {
            return false;
        }

        const slotStart = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), hour, minute, 0, 0).getTime();
        const slotEnd = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), hour, minute + 30, 0, 0).getTime();

        for (const tech of activeSharedTechnicians) {
            const hasConflict = allInterventions.some(event => {
                const isAssigned = (event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(tech.id)) ||
                                   event.createdBy === tech.id;
                if (!isAssigned) return false;

                // Las acciones de día completo son tareas o gestiones a realizar a lo largo del día y NO bloquean tramos horarios específicos de la agenda
                if (event.isAllDay) {
                    return false;
                }

                const evStart = new Date(event.start);
                const evEnd = new Date(event.end);

                return evStart.getTime() < slotEnd && evEnd.getTime() > slotStart;
            });

            if (hasConflict) return false;
        }
        return true;
    };

    // Contar cuántos tramos de 30 min libres comunes hay en un día entre 8:00 y 15:00
    const getCommonFreeSlotsCountForDay = (targetDay: Date): number => {
        if (!isSharedViewActive) return 0;
        let count = 0;
        for (let h = COMMON_FREE_START_HOUR; h < COMMON_FREE_END_HOUR; h++) {
            if (checkIsCommonFreeSlot(targetDay, h, 0)) count++;
            if (checkIsCommonFreeSlot(targetDay, h, 30)) count++;
        }
        return count;
    };

    // Total de huecos (y horas equivalentes) libres comunes en el período actual
    const currentPeriodCommonFreeInfo = useMemo(() => {
        if (!isSharedViewActive) return { slots: 0, hours: 0 };
        let totalSlots = 0;
        if (view === 'day') {
            totalSlots = getCommonFreeSlotsCountForDay(currentDate);
        } else if (view === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 6) % 7);
            for (let d = 0; d < (collapseWeekends ? 5 : 7); d++) {
                const day = new Date(startOfWeek);
                day.setDate(day.getDate() + d);
                totalSlots += getCommonFreeSlotsCountForDay(day);
            }
        }
        return {
            slots: totalSlots,
            hours: Number((totalSlots * 0.5).toFixed(1))
        };
    }, [currentDate, isSharedViewActive, view, collapseWeekends, allInterventions, activeSharedTechnicians]);

    // Información de si una tarea es conjunta entre los calendarios mostrados
    const getEventJointInfo = (event: Intervention, associatedProfs: Professional[]) => {
        if (!isSharedViewActive) {
            return { isJoint: false, matchingTechs: [], totalAssociated: associatedProfs.length };
        }
        const matchingTechs = activeSharedTechnicians.filter(tech => 
            (event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(tech.id)) ||
            event.createdBy === tech.id
        );
        const isJoint = matchingTechs.length >= 2;
        return {
            isJoint,
            matchingTechs,
            totalAssociated: associatedProfs.length
        };
    };

    // Obtener estilo computado para una cita (por tipo de cita o por técnico/a, más destaque conjunto)
    const getEventComputedStyle = (event: Intervention, associatedProfs: Professional[]) => {
        const typeStyle = getInterventionTypeColor(event.interventionType);
        const jointInfo = getEventJointInfo(event, associatedProfs);

        if (colorMode === 'by-technician') {
            if (jointInfo.isJoint && highlightJointTasks) {
                return {
                    backgroundColor: '#f5f3ff',
                    color: '#3730a3',
                    borderLeftColor: '#6366f1',
                    badgeBg: 'bg-indigo-600 text-white',
                    isJoint: true,
                    matchingTechs: jointInfo.matchingTechs,
                    primaryTech: jointInfo.matchingTechs[0] || associatedProfs[0]
                };
            }

            const primaryTech = associatedProfs.find(p => activeSharedTechnicians.some(at => at.id === p.id)) || associatedProfs[0];
            const techColor = getProfessionalColorConfig(primaryTech?.id, professionals);
            return {
                backgroundColor: techColor.bg,
                color: techColor.text,
                borderLeftColor: techColor.border,
                badgeBg: `${techColor.badgeBg} ${techColor.badgeText}`,
                isJoint: jointInfo.isJoint,
                matchingTechs: jointInfo.matchingTechs,
                primaryTech
            };
        }

        // Modo predeterminado por tipo de cita
        const isJointHighlighted = jointInfo.isJoint && highlightJointTasks;
        return {
            backgroundColor: typeStyle.backgroundColor,
            color: typeStyle.color,
            borderLeftColor: isJointHighlighted ? '#4f46e5' : typeStyle.borderLeftColor,
            badgeBg: 'bg-black/5 text-slate-700',
            isJoint: jointInfo.isJoint,
            matchingTechs: jointInfo.matchingTechs,
            primaryTech: associatedProfs[0]
        };
    };

    const EventItem: React.FC<{event: Intervention}> = ({ event }) => {
        const canView = isFullDetailsAuthorized(event);
        const canEnter = canEditOrEnterEvent(event);
        const caseForEvent = canView && event.caseId ? cases.find(c => c.id === event.caseId) : null;
        const associatedProfs = getAssociatedProfessionals(event, caseForEvent);
        const computedStyle = getEventComputedStyle(event, associatedProfs);
        const jointInfo = getEventJointInfo(event, associatedProfs);

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!canView) {
                setPrivateEventInfo(event);
                return;
            }
            if (!canEnter) {
                setRestrictedAccessNotice({
                    isOpen: true,
                    title: event.title,
                    associatedNames: associatedProfs.map(p => p.name).join(', ') || 'Otros técnicos'
                });
                return;
            }
            handleOpenModal(event, undefined);
        };

        if (!canView) {
            return (
                <div
                    style={{ backgroundColor: computedStyle.backgroundColor, color: computedStyle.color, borderLeft: `4px solid ${computedStyle.borderLeftColor}` }}
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
                style={{ backgroundColor: computedStyle.backgroundColor, color: computedStyle.color, borderLeft: `4px solid ${computedStyle.borderLeftColor}` }}
                className={`text-xs p-1.5 rounded-sm overflow-hidden mb-1 cursor-pointer hover:brightness-95 transition-all shadow-2xs ${
                    jointInfo.isJoint && highlightJointTasks ? 'ring-1 ring-indigo-400 font-medium' : ''
                } ${!canEnter ? 'hover:ring-1 hover:ring-amber-400' : ''}`}
                onClick={handleClick}
                title={!canEnter ? 'Solo lectura: cita de otros compañeros (no puedes editarla)' : undefined}
            >
                <div className="flex items-center justify-between gap-1">
                    <div className="font-semibold truncate flex-1 min-w-0 flex items-center gap-1">
                        {event.isShared === false && (
                            <span title="Cita privada (compañeros solo ven Ocupado)">
                                <IoLockClosedOutline className="text-amber-600 flex-shrink-0 text-xs" />
                            </span>
                        )}
                        {!canEnter && (
                            <span className="text-[10px] shrink-0 text-amber-700" title="Solo lectura (no asignado/a)">
                                🔒
                            </span>
                        )}
                        {event.isAllDay && (
                            <span className="text-[10px] shrink-0 text-amber-700" title="Acción/tarea a realizar a lo largo del día (sin hora prefijada)">
                                📋
                            </span>
                        )}
                        {jointInfo.isJoint && highlightJointTasks && (
                            <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-indigo-600 text-white shrink-0 flex items-center gap-0.5" title="Tarea conjunta entre los calendarios activos">
                                <span>👥</span>
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
        const canEnter = canEditOrEnterEvent(event);
        const caseForEvent = canView && event.caseId ? cases.find(c => c.id === event.caseId) : null;
        const associatedProfs = getAssociatedProfessionals(event, caseForEvent);
        const computedStyle = getEventComputedStyle(event, associatedProfs);
        const jointInfo = getEventJointInfo(event, associatedProfs);
        const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

        const isJointHighlighted = jointInfo.isJoint && highlightJointTasks;

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!canView) {
                setPrivateEventInfo(event);
                return;
            }
            if (!canEnter) {
                setRestrictedAccessNotice({
                    isOpen: true,
                    title: event.title,
                    associatedNames: associatedProfs.map(p => p.name).join(', ') || 'Otros técnicos'
                });
                return;
            }
            handleOpenModal(event, undefined);
        };

        if (!canView) {
            return (
                <div
                    style={{ backgroundColor: computedStyle.backgroundColor, color: computedStyle.color, borderLeft: `4px solid ${computedStyle.borderLeftColor}` }}
                    className={`text-xs p-2 rounded-md overflow-hidden h-full flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-sm opacity-90 hover:opacity-100 group select-none hover:shadow-lg hover:z-30 hover:h-auto hover:min-h-full hover:ring-2 hover:ring-amber-500/40 ${
                        isJointHighlighted ? 'ring-2 ring-indigo-400/80 shadow-md' : ''
                    }`}
                    onClick={handleClick}
                    title="Cita privada: pulsa para ver disponibilidad horaria"
                >
                    <div className="space-y-1.5 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-black/5">
                            <div className="flex items-center gap-1 truncate">
                                {isJointHighlighted && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white flex items-center gap-1 shrink-0">
                                        <IoPeopleOutline className="text-xs" />
                                        <span>Conjunta ({jointInfo.matchingTechs.length})</span>
                                    </span>
                                )}
                                <span className="text-[10px] font-bold tracking-wider opacity-90 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center gap-1 truncate">
                                    <IoLockClosedOutline className="text-xs" />
                                    <span>{event.interventionType}</span>
                                </span>
                            </div>

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
                                <span className="inline-block bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 font-bold text-amber-800 text-[10px]">
                                    📋 Acción del día
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div
                style={{ backgroundColor: computedStyle.backgroundColor, color: computedStyle.color, borderLeft: `4px solid ${computedStyle.borderLeftColor}` }}
                className={`text-xs p-2 rounded-md overflow-hidden h-full flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-sm group select-none hover:overflow-visible hover:shadow-xl hover:z-30 hover:h-auto hover:min-h-full ${
                    isJointHighlighted ? 'ring-2 ring-indigo-500/90 shadow-md hover:ring-indigo-600' : 'hover:ring-2 hover:ring-teal-500/40'
                }`}
                onClick={handleClick}
            >
                <div className="space-y-1.5 min-w-0">
                    {/* Header: Técnicos asignados en la parte superior derecha + Badges */}
                    <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-black/5">
                        <div className="flex items-center gap-1 min-w-0 flex-wrap">
                            {isJointHighlighted && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-teal-700 to-indigo-700 text-white flex items-center gap-1 shadow-2xs shrink-0" title={`Tarea compartida entre ${jointInfo.matchingTechs.map(t => t.name).join(', ')}`}>
                                    <IoPeopleOutline className="text-xs" />
                                    <span>Conjunta ({jointInfo.matchingTechs.length})</span>
                                </span>
                            )}
                            <span className={`text-[10px] uppercase font-bold tracking-wider opacity-85 px-1.5 py-0.5 rounded truncate ${
                                colorMode === 'by-technician' ? 'bg-white/80 border border-black/5 font-semibold' : 'bg-black/5'
                            }`}>
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
                    <div className="pt-0.5 flex items-center justify-between gap-1 flex-wrap">
                        {!event.isAllDay ? (
                            <span className="inline-block bg-white/90 px-1.5 py-0.5 rounded border border-black/5 font-semibold text-slate-700 text-[11px]">
                                {timeFormat.format(new Date(event.start))} - {timeFormat.format(new Date(event.end))}
                            </span>
                        ) : (
                            <span className="inline-block bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 font-bold text-amber-800 text-[10px]">
                                📋 Acción del día
                            </span>
                        )}

                        {colorMode === 'by-technician' && computedStyle.primaryTech && (
                            <span 
                                className="text-[10px] font-bold opacity-90 truncate ml-auto flex items-center gap-1 bg-white/75 px-1.5 py-0.5 rounded border border-black/5 shadow-2xs"
                                title={event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(computedStyle.primaryTech.id)
                                    ? `Técnico/a asignado/a: ${computedStyle.primaryTech.name}`
                                    : `Creador/a de la intervención: ${computedStyle.primaryTech.name}`}
                            >
                                <span>👤</span>
                                <span>
                                    {event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(computedStyle.primaryTech.id)
                                        ? computedStyle.primaryTech.name.split(' ')[0]
                                        : `Creador: ${computedStyle.primaryTech.name.split(' ')[0]}`}
                                </span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Compact Indicator Event Item for Collapsed Saturday/Sunday columns
    const CollapsedWeekendEventItem: React.FC<{event: Intervention}> = ({ event }) => {
        const canView = isFullDetailsAuthorized(event);
        const caseForEvent = canView && event.caseId ? cases.find(c => c.id === event.caseId) : null;
        const associatedProfs = getAssociatedProfessionals(event, caseForEvent);
        const computedStyle = getEventComputedStyle(event, associatedProfs);
        const jointInfo = getEventJointInfo(event, associatedProfs);
        const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (canView) {
                handleOpenModal(event, undefined);
            } else {
                setPrivateEventInfo(event);
            }
        };

        const startTimeStr = timeFormat.format(new Date(event.start));
        const endTimeStr = timeFormat.format(new Date(event.end));

        return (
            <div
                style={{ backgroundColor: computedStyle.backgroundColor, color: computedStyle.color, borderLeft: `3px solid ${computedStyle.borderLeftColor}` }}
                className={`text-[10px] p-1 rounded overflow-hidden h-full flex flex-col items-center justify-center cursor-pointer transition-all shadow-xs group/collapsed relative hover:z-50 hover:ring-2 hover:ring-teal-500 hover:shadow-lg ${
                    jointInfo.isJoint && highlightJointTasks ? 'ring-1 ring-indigo-500' : ''
                }`}
                onClick={handleClick}
            >
                <div className="font-bold text-[9px] text-slate-800 leading-none truncate w-full text-center">
                    {startTimeStr}
                </div>
                {!canView || event.isShared === false ? (
                    <IoLockClosedOutline className="text-[10px] text-amber-700 mt-0.5" />
                ) : jointInfo.isJoint && highlightJointTasks ? (
                    <span className="text-[9px] mt-0.5">👥</span>
                ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-0.5"></span>
                )}

                {/* Floating Popover on Hover */}
                <div className="hidden group-hover/collapsed:flex flex-col absolute right-0 top-full mt-1 z-50 w-56 bg-white rounded-lg shadow-xl border border-slate-200 p-2.5 text-left text-xs pointer-events-auto animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100 mb-1.5">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 truncate">
                            {event.interventionType}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                            {startTimeStr} - {endTimeStr}
                        </span>
                    </div>

                    {!canView ? (
                        <div className="font-bold text-slate-800 flex items-center gap-1 text-amber-800">
                            <IoLockClosedOutline className="text-xs" />
                            <span>Ocupado ({event.interventionType})</span>
                        </div>
                    ) : (
                        <>
                            {caseForEvent && (
                                <div className="font-bold text-teal-800 text-xs truncate">
                                    {caseForEvent.name}
                                </div>
                            )}
                            <div className="font-semibold text-slate-800 line-clamp-2">
                                {event.title}
                            </div>
                        </>
                    )}

                    {associatedProfs.length > 0 && (
                        <div className="mt-2 pt-1 border-t border-slate-100 flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Técnico/s:</span>
                            <div className="flex -space-x-1">
                                {associatedProfs.map(p => (
                                    <TechnicianAvatar
                                        key={p.id}
                                        professional={p}
                                        size="xs"
                                        prefix="Asignado:"
                                        isCurrentUser={p.id === currentUser?.id}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-1.5 text-[9px] text-teal-600 font-medium text-right">
                        Clic para abrir cita →
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

        // Filter list of technicians for the selector (strictly EDIS only)
        const techniciansList = edisTechnicians;

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

                        {view !== 'day' && (
                            <button
                                type="button"
                                onClick={() => setCollapseWeekends(!collapseWeekends)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                    collapseWeekends
                                        ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs'
                                        : 'bg-teal-50 hover:bg-teal-100 border-teal-300 text-teal-800 font-bold'
                                }`}
                                title={collapseWeekends ? "Mostrar sábado y domingo completos" : "Colapsar fin de semana para ampliar de lunes a viernes"}
                            >
                                {collapseWeekends ? (
                                    <>
                                        <IoExpandOutline className="text-sm text-teal-600" />
                                        <span>Mostrar Sáb/Dom</span>
                                    </>
                                ) : (
                                    <>
                                        <IoContractOutline className="text-sm text-slate-500" />
                                        <span>Colapsar Sáb/Dom</span>
                                    </>
                                )}
                                {currentPeriodWeekendEvents.total > 0 && collapseWeekends && (
                                    <span 
                                        className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-bold rounded-full bg-amber-500 text-white shadow-2xs animate-pulse"
                                        title={`${currentPeriodWeekendEvents.total} cita(s) en fin de semana`}
                                    >
                                        {currentPeriodWeekendEvents.total}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Team Visibility & Multi-Colleague Filter Bar */}
                <div className="flex flex-col gap-2.5 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <IoPeopleOutline className="text-sm text-teal-700" />
                                <span>Agenda:</span>
                            </span>
                            
                            <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={resetToMe}
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
                                    onClick={() => {
                                        setCalendarFilter('all');
                                        setIsMultiSelectOpen(false);
                                    }}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                        calendarFilter === 'all'
                                            ? 'bg-teal-700 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <span>Todo el equipo</span>
                                </button>
                            </div>

                            {/* Multi-Colleague Selector Button & Dropdown */}
                            <div className="relative" ref={multiSelectRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                        calendarFilter === 'custom'
                                            ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                    title="Seleccionar varias compañeras/os para ver agendas simultáneas"
                                >
                                    <IoFilterOutline className={`text-sm ${calendarFilter === 'custom' ? 'text-white' : 'text-teal-700'}`} />
                                    <span>
                                        {calendarFilter === 'custom' 
                                            ? `Selección conjunta (${selectedColleagueIds.length})` 
                                            : 'Seleccionar compañeros...'}
                                    </span>
                                    <IoChevronDownOutline className={`text-xs transition-transform duration-200 ${isMultiSelectOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Multi-Select Dropdown Popover */}
                                {isMultiSelectOpen && (
                                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-3 text-left animate-in fade-in zoom-in-95 duration-150">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-800">
                                                    Técnicos/as EDIS
                                                </h4>
                                                <p className="text-[11px] text-slate-500">
                                                    Selecciona los técnicos de EDIS para ver agendas simultáneas y coordinar actuaciones
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => setIsMultiSelectOpen(false)}
                                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                                                title="Cerrar"
                                            >
                                                <IoCloseOutline className="text-base" />
                                            </button>
                                        </div>

                                        {/* Quick Action Shortcuts */}
                                        <div className="flex items-center gap-1.5 my-2 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedColleagueIds([currentUser.id]);
                                                    setCalendarFilter('custom');
                                                }}
                                                className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-colors cursor-pointer"
                                            >
                                                Solo yo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={selectAllTechnicians}
                                                className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-colors cursor-pointer"
                                            >
                                                Seleccionar todos los EDIS
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearSelectedColleagues}
                                                className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                                            >
                                                Desmarcar todos
                                            </button>
                                        </div>

                                        {/* Search Filter Box */}
                                        <div className="relative mb-2">
                                            <IoSearchOutline className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                            <input
                                                type="text"
                                                placeholder="Buscar técnico/a EDIS..."
                                                value={colleagueSearchQuery}
                                                onChange={(e) => setColleagueSearchQuery(e.target.value)}
                                                className="w-full text-xs pl-7 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-colors"
                                            />
                                            {colleagueSearchQuery && (
                                                <button
                                                    onClick={() => setColleagueSearchQuery('')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                                                >
                                                    <IoCloseOutline />
                                                </button>
                                            )}
                                        </div>

                                        {/* Colleagues List */}
                                        <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-50">
                                            {edisTechnicians
                                                .filter(p => {
                                                    if (!colleagueSearchQuery.trim()) return true;
                                                    const q = colleagueSearchQuery.toLowerCase();
                                                    return p.name.toLowerCase().includes(q) || (p.role && p.role.toLowerCase().includes(q));
                                                })
                                                .map(prof => {
                                                    const isChecked = calendarFilter === 'custom' 
                                                        ? selectedColleagueIds.includes(prof.id)
                                                        : (calendarFilter === 'me' ? prof.id === currentUser.id : true);
                                                    const isCurrentUser = prof.id === currentUser?.id;

                                                    return (
                                                        <div
                                                            key={prof.id}
                                                            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer group ${
                                                                isChecked 
                                                                    ? 'bg-teal-50/80 border border-teal-200/60' 
                                                                    : 'hover:bg-slate-50 border border-transparent'
                                                            }`}
                                                            onClick={() => toggleColleague(prof.id)}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {}} // handled by parent onClick
                                                                    className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 pointer-events-none"
                                                                />
                                                                <TechnicianAvatar professional={prof} size="xs" />
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 truncate">
                                                                        <span>{prof.name}</span>
                                                                        {isCurrentUser && (
                                                                            <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1 rounded">
                                                                                Tú
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 truncate">
                                                                        {prof.role}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {!isCurrentUser && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            selectMeAndColleague(prof.id);
                                                                        }}
                                                                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-100 hover:bg-teal-200 text-teal-800 cursor-pointer"
                                                                        title={`Ver mi agenda + ${prof.name}`}
                                                                    >
                                                                        Yo + {prof.name.split(' ')[0]}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        selectOnlyColleague(prof.id);
                                                                    }}
                                                                    className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                                                                    title={`Ver solo a ${prof.name}`}
                                                                >
                                                                    Solo
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        {/* Footer */}
                                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="text-[11px] font-medium text-slate-500">
                                                {selectedColleagueIds.length} seleccionado(s)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsMultiSelectOpen(false)}
                                                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                                            >
                                                Aplicar selección
                                            </button>
                                        </div>
                                    </div>
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

                    {/* Active Multi-Colleague Joint Planning Banner */}
                    {calendarFilter === 'custom' && (
                        <div className="mt-1 pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1 shrink-0">
                                    <IoPeopleOutline className="text-teal-700" />
                                    <span>Planificación conjunta ({selectedColleagueIds.length}):</span>
                                </span>
                                {selectedColleagueIds.length === 0 ? (
                                    <span className="text-xs italic text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        Ningún compañero seleccionado. Haz clic en "Añadir compañeros"
                                    </span>
                                ) : (
                                    selectedColleagueIds.map(id => {
                                        const prof = professionals.find(p => p.id === id);
                                        if (!prof) return null;
                                        const profColor = getProfessionalColorConfig(prof.id, professionals);
                                        return (
                                            <span 
                                                key={id}
                                                className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-2xs"
                                                style={colorMode === 'by-technician' ? { borderLeft: `4px solid ${profColor.border}` } : {}}
                                            >
                                                <TechnicianAvatar professional={prof} size="xs" />
                                                <span>{prof.name} {prof.id === currentUser?.id ? '(Tú)' : ''}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleColleague(id)}
                                                    className="text-slate-400 hover:text-rose-600 ml-0.5 transition-colors cursor-pointer"
                                                    title={`Quitar a ${prof.name}`}
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        );
                                    })
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsMultiSelectOpen(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-teal-800 hover:text-teal-950 bg-teal-100 hover:bg-teal-200 rounded-full transition-colors cursor-pointer shadow-2xs"
                                >
                                    <IoPersonAddOutline className="text-xs" />
                                    <span>+ Añadir</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={resetToMe}
                                className="text-xs text-slate-500 hover:text-slate-800 font-semibold hover:underline self-end sm:self-auto cursor-pointer"
                            >
                                ✕ Volver a mi agenda
                            </button>
                        </div>
                    )}

                    {/* Shared Calendar Analysis & Coordination Toolbar (Visible when 2+ calendars are displayed) */}
                    {isSharedViewActive && (
                        <div className="mt-1 pt-2.5 border-t border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-gradient-to-r from-teal-50/70 via-indigo-50/50 to-white p-2.5 rounded-xl border border-teal-100 shadow-2xs">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 flex items-center gap-1.5 shrink-0">
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
                                    </span>
                                    <span>Vista Compartida ({activeSharedTechnicians.length} técnicos):</span>
                                </span>

                                {/* Toggle: Color por tipo vs Color por técnico */}
                                <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => setColorMode('by-type')}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                            colorMode === 'by-type'
                                                ? 'bg-teal-700 text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                        title="Colorear citas según tipo de intervención (Social, Psicológica, etc.)"
                                    >
                                        <span>🏷️ Por tipo de cita</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setColorMode('by-technician')}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                            colorMode === 'by-technician'
                                                ? 'bg-teal-700 text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                        title="Asignar un color distintivo exclusivo a cada técnico para analizar las citas de cada uno a la vez"
                                    >
                                        <IoColorPaletteOutline className="text-sm" />
                                        <span>🎨 Por técnico/a</span>
                                    </button>
                                </div>

                                {/* Toggle: Resaltar huecos comunes libres */}
                                <button
                                    type="button"
                                    onClick={() => setHighlightFreeSlots(!highlightFreeSlots)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                        highlightFreeSlots
                                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold hover:bg-emerald-100'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title="Destacar franjas horarias donde TODOS los técnicos mostrados están libres a la vez para agendar reuniones o intervenciones conjuntas"
                                >
                                    <IoSparklesOutline className={`text-sm ${highlightFreeSlots ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    <span>Huecos comunes (8:00 - 15:00)</span>
                                    {highlightFreeSlots && currentPeriodCommonFreeInfo.slots > 0 && (
                                        <span 
                                            className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-emerald-600 text-white shadow-2xs"
                                            title={`${currentPeriodCommonFreeInfo.slots} franja(s) de 30 min libres entre 8:00 y 15:00`}
                                        >
                                            {currentPeriodCommonFreeInfo.hours}h ({currentPeriodCommonFreeInfo.slots} de 30m)
                                        </span>
                                    )}
                                </button>

                                {/* Toggle: Resaltar tareas conjuntas */}
                                <button
                                    type="button"
                                    onClick={() => setHighlightJointTasks(!highlightJointTasks)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                        highlightJointTasks
                                            ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold hover:bg-indigo-100'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title="Resaltar con indicador y borde especial las citas que involucran a 2 o más de los técnicos mostrados"
                                >
                                    <IoFlashOutline className={`text-sm ${highlightJointTasks ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    <span>Tareas conjuntas</span>
                                </button>
                            </div>

                            {/* Programar rápida conjunta & Leyenda de Colores de Técnicos */}
                            <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
                                {colorMode === 'by-technician' && (
                                    <div className="flex items-center gap-1.5 text-[11px] bg-white/90 px-2 py-1 rounded-lg border border-slate-200 shadow-2xs overflow-x-auto max-w-full">
                                        <span className="font-bold text-slate-500 text-[10px] uppercase">Leyenda:</span>
                                        {activeSharedTechnicians.map(tech => {
                                            const cfg = getProfessionalColorConfig(tech.id, professionals);
                                            return (
                                                <div key={tech.id} className="flex items-center gap-1 shrink-0" title={`${tech.name} (${tech.role})`}>
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.border }}></span>
                                                    <span className="font-medium text-slate-700">{tech.name.split(' ')[0]}</span>
                                                </div>
                                            );
                                        })}
                                        {highlightJointTasks && (
                                            <div className="flex items-center gap-1 shrink-0 border-l border-slate-200 pl-1.5 text-indigo-800 font-bold">
                                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                                                <span>Conjunta</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handleOpenModal(null, {
                                        start: currentDate.toISOString(),
                                        hasExplicitTime: true,
                                        assignedTo: activeSharedTechnicians.map(t => t.id)
                                    } as any)}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                                    title="Crear una nueva intervención con todos los técnicos activos asignados"
                                >
                                    <IoAddOutline className="text-sm font-bold" />
                                    <span>+ Programar tarea conjunta</span>
                                </button>
                            </div>
                        </div>
                    )}
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
        
        const gridTemplateColumns = collapseWeekends 
            ? 'repeat(5, minmax(0, 1fr)) 46px 46px' 
            : 'repeat(7, minmax(0, 1fr))';

        for (let w = 0; w < 6; w++) {
            let days = [];
            for (let i = 0; i < 7; i++) {
                const cloneDay = new Date(day);
                const isCurrentMonth = cloneDay.getMonth() === currentDate.getMonth();
                const isToday = new Date().toDateString() === cloneDay.toDateString();
                const isWeekend = i >= 5; // Saturday (5) and Sunday (6)
                const dayEvents = getEventsForDay(cloneDay);

                if (collapseWeekends && isWeekend) {
                    days.push(
                        <div
                            key={day.toISOString()}
                            className={`relative border-t border-r border-slate-200 min-h-[90px] sm:min-h-[120px] p-1 flex flex-col items-center cursor-pointer transition-colors group/month-weekend ${
                                isCurrentMonth 
                                    ? (dayEvents.length > 0 ? 'bg-amber-50/70 hover:bg-amber-100/70' : 'bg-slate-100/80 hover:bg-teal-50/50')
                                    : 'bg-slate-200/60 opacity-60'
                            }`}
                            onClick={() => handleOpenModal(null, { start: cloneDay.toISOString(), isDayOnly: true } as any)}
                        >
                            {/* Day Number */}
                            <div className="flex flex-col items-center">
                                <span className={`text-xs font-bold ${
                                    isToday 
                                        ? 'bg-teal-600 text-white rounded-full w-5 h-5 flex items-center justify-center' 
                                        : isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                                }`}>
                                    {cloneDay.getDate()}
                                </span>
                            </div>

                            {/* Events indicators in collapsed weekend */}
                            {dayEvents.length > 0 ? (
                                <>
                                    <div className="mt-1 flex flex-col gap-1 w-full items-center">
                                        <span 
                                            className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] font-bold rounded-full bg-amber-500 text-white shadow-2xs animate-pulse"
                                            title={`${dayEvents.length} cita(s) este día`}
                                        >
                                            {dayEvents.length}
                                        </span>
                                        <div className="w-full flex flex-col gap-0.5 mt-0.5">
                                            {dayEvents.slice(0, 3).map(event => {
                                                const style = getInterventionTypeColor(event.interventionType);
                                                const canView = isFullDetailsAuthorized(event);
                                                return (
                                                    <div
                                                        key={event.id}
                                                        style={{ backgroundColor: style.backgroundColor, borderLeft: `2.5px solid ${style.borderLeftColor}` }}
                                                        className="w-full h-3 rounded-2xs flex items-center justify-center overflow-hidden px-0.5 cursor-pointer hover:scale-105 transition-transform shadow-2xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (canView) {
                                                                handleOpenModal(event, undefined);
                                                            } else {
                                                                setPrivateEventInfo(event);
                                                            }
                                                        }}
                                                        title={`${event.title} (${event.interventionType})`}
                                                    >
                                                        {!canView || event.isShared === false ? (
                                                            <IoLockClosedOutline className="text-[8px] text-amber-800" />
                                                        ) : (
                                                            <span className="text-[7.5px] font-bold text-slate-700 leading-none truncate">
                                                                {event.interventionType.slice(0, 3)}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {dayEvents.length > 3 && (
                                                <span className="text-[8px] font-bold text-slate-500 text-center leading-none">
                                                    +{dayEvents.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hover Popover with full event details */}
                                    <div className="hidden group-hover/month-weekend:flex flex-col absolute right-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left text-xs pointer-events-auto animate-in fade-in duration-150">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                                            <span className="font-bold text-slate-800 text-xs">
                                                {i === 5 ? 'Sábado' : 'Domingo'} {cloneDay.getDate()}
                                            </span>
                                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                                                {dayEvents.length} cita(s)
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                            {dayEvents.map(event => {
                                                const canView = isFullDetailsAuthorized(event);
                                                const caseForEv = canView && event.caseId ? cases.find(c => c.id === event.caseId) : null;
                                                const style = getInterventionTypeColor(event.interventionType);
                                                const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
                                                const associatedProfs = getAssociatedProfessionals(event, caseForEv);

                                                return (
                                                    <div 
                                                        key={event.id}
                                                        style={{ ...style, borderLeft: `3px solid ${style.borderLeftColor}` }}
                                                        className="p-1.5 rounded text-xs cursor-pointer hover:brightness-95 transition-all shadow-2xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (canView) {
                                                                handleOpenModal(event, undefined);
                                                            } else {
                                                                setPrivateEventInfo(event);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold pb-0.5">
                                                            <span className="truncate">{event.interventionType}</span>
                                                            <span className="text-slate-600 font-normal shrink-0">
                                                                {!event.isAllDay 
                                                                    ? `${timeFormat.format(new Date(event.start))} - ${timeFormat.format(new Date(event.end))}`
                                                                    : 'Todo el día'}
                                                            </span>
                                                        </div>
                                                        <div className="font-semibold truncate text-slate-900">
                                                            {canView ? (caseForEv ? `${caseForEv.name} - ${event.title}` : event.title) : 'Ocupado'}
                                                        </div>
                                                        {associatedProfs.length > 0 && (
                                                            <div className="mt-1 flex items-center gap-1">
                                                                <div className="flex -space-x-1">
                                                                    {associatedProfs.map(p => (
                                                                        <TechnicianAvatar key={p.id} professional={p} size="xs" />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                            <span className="text-teal-600 font-semibold">Clic en cita para abrir</span>
                                            <button 
                                                type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCollapseWeekends(false);
                                                }}
                                                className="text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                                            >
                                                Expandir fin de semana
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-2 opacity-0 group-hover/month-weekend:opacity-100 text-[10px] text-slate-400 font-bold">
                                    +
                                </div>
                            )}
                        </div>
                    );
                    day.setDate(day.getDate() + 1);
                    continue;
                }

                // Distinct shaded background for weekends vs weekdays (uncollapsed)
                const bgStyle = isWeekend
                    ? (isCurrentMonth ? 'bg-slate-100/70 hover:bg-slate-200/50' : 'bg-slate-200/60')
                    : (isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50');

                days.push(
                    <div
                        key={day.toISOString()}
                        className={`relative border-t border-r border-slate-200 min-h-[90px] sm:min-h-[120px] overflow-y-auto p-1.5 cursor-pointer transition-colors ${bgStyle}`}
                        onClick={() => handleOpenModal(null, { start: cloneDay.toISOString(), isDayOnly: true } as any)}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isToday ? 'bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold' : isCurrentMonth ? (isWeekend ? 'text-slate-800 font-semibold' : 'text-slate-700') : 'text-slate-400'}`}>
                                {cloneDay.getDate()}
                            </span>
                            {isWeekend && isCurrentMonth && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter sm:inline hidden">
                                    {i === 5 ? 'Sáb' : 'Dom'}
                                </span>
                            )}
                        </div>
                        <div className={`mt-1 space-y-1 ${!isCurrentMonth ? 'opacity-60' : ''}`}>
                            {dayEvents.slice(0, 4).map(event => <EventItem key={event.id} event={event} />)}
                            {dayEvents.length > 4 && <p className="text-xs text-slate-400 font-medium text-center">+ {dayEvents.length - 4} más</p>}
                        </div>
                    </div>
                );
                day.setDate(day.getDate() + 1);
            }
            rows.push(<div key={w} className="grid" style={{ gridTemplateColumns }}>{days}</div>);
        }
        return (
            <div className="overflow-x-auto rounded-lg">
                <div className={`border-l border-b border-slate-200 bg-white ${collapseWeekends ? 'min-w-[720px]' : 'min-w-[850px]'}`}>
                    <div className="grid text-center font-semibold text-slate-600" style={{ gridTemplateColumns }}>
                        {WEEKDAYS.map((day, idx) => {
                            const isWeekend = idx >= 5;
                            return (
                                <div 
                                    key={day} 
                                    className={`py-2 border-b border-r border-slate-200 ${
                                        isWeekend 
                                            ? `bg-slate-100/90 text-slate-800 font-bold border-t-2 border-t-slate-300 ${collapseWeekends ? 'text-[11px] px-0.5 cursor-pointer hover:bg-teal-50' : ''}` 
                                            : 'text-sm'
                                    }`}
                                    onClick={isWeekend && collapseWeekends ? () => setCollapseWeekends(false) : undefined}
                                    title={isWeekend && collapseWeekends ? "Fin de semana colapsado. Clic para expandir" : undefined}
                                >
                                    {collapseWeekends && isWeekend ? (idx === 5 ? 'Sáb' : 'Dom') : day}
                                </div>
                            );
                        })}
                    </div>
                    <div>{rows}</div>
                </div>
            </div>
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

        const gridTemplateColumns = collapseWeekends 
            ? 'repeat(5, minmax(0, 1fr)) 44px 44px' 
            : 'repeat(7, minmax(0, 1fr))';
    
        const timeColumn = (
            <div className="w-16 flex-shrink-0 text-right pr-2 select-none">
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                    <div key={`time-label-${i}`} style={{ height: `${HOUR_HEIGHT}px` }} className="relative flex flex-col justify-between py-1">
                        <span className="relative -top-2 text-xs font-semibold text-slate-600">
                            {`${(START_HOUR + i).toString().padStart(2, '0')}:00`}
                        </span>
                        <span className="relative text-[10px] text-slate-400 font-medium opacity-70">
                            {`${(START_HOUR + i).toString().padStart(2, '0')}:30`}
                        </span>
                    </div>
                ))}
            </div>
        );
    
        const gridColumn = (
            <div className="relative flex-1">
                {/* Background Grid */}
                <div className="grid-lines grid" style={{ gridTemplateColumns }}>
                    {Array.from({ length: (END_HOUR - START_HOUR) * 7 }).map((_, i) => {
                        const dayIndex = i % 7;
                        const hourIndex = Math.floor(i / 7);
                        const hour = START_HOUR + hourIndex;
                        const targetDay = weekDays[dayIndex];
                        const isWeekend = dayIndex >= 5;
                        const slotDate0 = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), hour, 0, 0, 0);
                        const slotDate30 = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), hour, 30, 0, 0);

                        const isFirstHalfFree = isSharedViewActive && highlightFreeSlots && (!collapseWeekends || !isWeekend) && checkIsCommonFreeSlot(targetDay, hour, 0);
                        const isSecondHalfFree = isSharedViewActive && highlightFreeSlots && (!collapseWeekends || !isWeekend) && checkIsCommonFreeSlot(targetDay, hour, 30);

                        if (collapseWeekends && isWeekend) {
                            return (
                                <div 
                                    key={`grid-cell-${i}`} 
                                    style={{ height: `${HOUR_HEIGHT}px` }} 
                                    className="border-b border-l border-slate-200 bg-slate-100/80 cursor-pointer hover:bg-teal-50/50 transition-colors flex flex-col"
                                    onClick={() => {
                                        setCollapseWeekends(false);
                                        handleOpenModal(null, { 
                                            start: slotDate0.toISOString(), 
                                            hasExplicitTime: true,
                                            assignedTo: isSharedViewActive ? activeSharedTechnicians.map(t => t.id) : undefined 
                                        } as any);
                                    }}
                                    title={`Sábado/Domingo a las ${hour.toString().padStart(2, '0')}:00. Clic para expandir`}
                                >
                                    <div className="h-1/2 border-b border-dashed border-slate-200/60"></div>
                                    <div className="h-1/2"></div>
                                </div>
                            );
                        }

                        return (
                            <div 
                                key={`grid-cell-${i}`} 
                                style={{ height: `${HOUR_HEIGHT}px` }} 
                                className={`border-b border-l border-slate-200 flex flex-col ${isWeekend ? 'bg-slate-100/50' : 'bg-white'}`}
                            >
                                {/* First 30-min slot (:00 to :30) */}
                                <div 
                                    className={`h-1/2 border-b border-dashed transition-colors cursor-pointer relative group/free0 flex items-center justify-between px-1.5 ${
                                        isFirstHalfFree 
                                            ? 'bg-emerald-50/70 border-emerald-300/70 hover:bg-emerald-100/90' 
                                            : 'border-slate-100 hover:bg-teal-50/40'
                                    }`}
                                    onClick={() => handleOpenModal(null, { 
                                        start: slotDate0.toISOString(), 
                                        hasExplicitTime: true,
                                        assignedTo: isSharedViewActive ? activeSharedTechnicians.map(t => t.id) : undefined 
                                    } as any)}
                                    title={isFirstHalfFree 
                                        ? `✨ Espacio común libre de ${hour.toString().padStart(2, '0')}:00 a ${hour.toString().padStart(2, '0')}:30 (${activeSharedTechnicians.length} técnicos libres). Clic para programar tarea conjunta.`
                                        : `Crear cita para ${targetDay.toLocaleDateString('es-ES')} a las ${hour.toString().padStart(2, '0')}:00`}
                                >
                                    {isFirstHalfFree ? (
                                        <div className="h-full w-full flex items-center justify-between opacity-85 group-hover/free0:opacity-100 transition-opacity">
                                            <span className="text-[9px] font-bold text-emerald-800 flex items-center gap-0.5 bg-emerald-100/95 px-1 py-0.2 rounded shadow-2xs">
                                                <IoSparklesOutline className="text-emerald-700 text-[10px] shrink-0" />
                                                <span className="hidden xl:inline">{`${hour.toString().padStart(2, '0')}:00`}</span>
                                                <span className="xl:hidden text-[8.5px]">Libre</span>
                                            </span>
                                            <span className="text-[9px] font-bold text-emerald-700 opacity-0 group-hover/free0:opacity-100 transition-opacity hidden sm:inline">
                                                + 30m
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[8px] font-semibold text-slate-300 opacity-0 group-hover/free0:opacity-100 transition-opacity">
                                            {`${hour.toString().padStart(2, '0')}:00`}
                                        </span>
                                    )}
                                </div>

                                {/* Second 30-min slot (:30 to :00) */}
                                <div 
                                    className={`h-1/2 transition-colors cursor-pointer relative group/free30 flex items-center justify-between px-1.5 ${
                                        isSecondHalfFree 
                                            ? 'bg-emerald-50/70 hover:bg-emerald-100/90' 
                                            : 'hover:bg-teal-50/40'
                                    }`}
                                    onClick={() => handleOpenModal(null, { 
                                        start: slotDate30.toISOString(), 
                                        hasExplicitTime: true,
                                        assignedTo: isSharedViewActive ? activeSharedTechnicians.map(t => t.id) : undefined 
                                    } as any)}
                                    title={isSecondHalfFree 
                                        ? `✨ Espacio común libre de ${hour.toString().padStart(2, '0')}:30 a ${(hour + 1).toString().padStart(2, '0')}:00 (${activeSharedTechnicians.length} técnicos libres). Clic para programar tarea conjunta.`
                                        : `Crear cita para ${targetDay.toLocaleDateString('es-ES')} a las ${hour.toString().padStart(2, '0')}:30`}
                                >
                                    {isSecondHalfFree ? (
                                        <div className="h-full w-full flex items-center justify-between opacity-85 group-hover/free30:opacity-100 transition-opacity">
                                            <span className="text-[9px] font-bold text-emerald-800 flex items-center gap-0.5 bg-emerald-100/95 px-1 py-0.2 rounded shadow-2xs">
                                                <IoSparklesOutline className="text-emerald-700 text-[10px] shrink-0" />
                                                <span className="hidden xl:inline">{`${hour.toString().padStart(2, '0')}:30`}</span>
                                                <span className="xl:hidden text-[8.5px]">Libre</span>
                                            </span>
                                            <span className="text-[9px] font-bold text-emerald-700 opacity-0 group-hover/free30:opacity-100 transition-opacity hidden sm:inline">
                                                + 30m
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[8px] font-semibold text-slate-300 opacity-0 group-hover/free30:opacity-100 transition-opacity">
                                            {`${hour.toString().padStart(2, '0')}:30`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
    
                {/* Events Overlay */}
                <div className="absolute top-0 left-0 right-0 bottom-0 grid pointer-events-none" style={{ gridTemplateColumns }}>
                    {timedEventsPositionsByDay.map((positionedEvents, dayIndex) => {
                        const isWeekend = dayIndex >= 5;
                        return (
                            <div key={dayIndex} className="relative border-l border-slate-200">
                                {positionedEvents.map(({event, style}) => {
                                    if (collapseWeekends && isWeekend) {
                                        return (
                                            <div 
                                                key={event.id} 
                                                className="absolute z-10 pointer-events-auto hover:z-40" 
                                                style={{ 
                                                    top: `${style.top}px`, 
                                                    height: `${Math.max(style.height, 28)}px`,
                                                    left: '2px',
                                                    right: '2px',
                                                    width: 'calc(100% - 4px)'
                                                }}
                                            >
                                                <CollapsedWeekendEventItem event={event} />
                                            </div>
                                        );
                                    }

                                    return (
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
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    
        return (
            <div className="overflow-x-auto rounded-lg">
                <div className={`border border-slate-200 bg-white ${collapseWeekends ? 'min-w-[760px]' : 'min-w-[900px]'}`}>
                    {/* Day Headers */}
                    <div className="flex">
                        <div className="w-16 flex-shrink-0 border-b border-slate-200"></div> {/* Top-left corner */}
                        <div className="flex-1 grid" style={{ gridTemplateColumns }}>
                            {weekDays.map((day, dayIndex) => {
                                const isWeekend = dayIndex >= 5;
                                const isToday = new Date().toDateString() === day.toDateString();
                                const dayEvents = getEventsForDay(day);
                                const hasEvents = dayEvents.length > 0;

                                if (collapseWeekends && isWeekend) {
                                    return (
                                        <div 
                                            key={day.toISOString()} 
                                            className={`text-center py-2 px-0.5 border-b border-l border-slate-200 cursor-pointer transition-all hover:bg-teal-50/70 group border-t-2 border-t-slate-300 ${hasEvents ? 'bg-amber-100/70' : 'bg-slate-100/90'}`}
                                            onClick={() => setCollapseWeekends(false)}
                                            title={`Fin de semana (${WEEKDAYS[(day.getDay() + 6) % 7]} ${day.getDate()}) - ${hasEvents ? `${dayEvents.length} cita(s)` : 'Sin citas'}. Clic para expandir`}
                                        >
                                            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                                                {WEEKDAYS[(day.getDay() + 6) % 7]}
                                            </div>
                                            <div
                                                className={`text-xs font-bold rounded-full w-5 h-5 mx-auto flex items-center justify-center mt-0.5 ${
                                                    isToday ? 'bg-teal-600 text-white' : 'text-slate-800 group-hover:bg-teal-100'
                                                }`}
                                            >
                                                {day.getDate()}
                                            </div>
                                            {/* Visual Indicator of events */}
                                            {hasEvents ? (
                                                <div className="mt-1 flex justify-center">
                                                    <span 
                                                        className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] font-bold rounded-full bg-amber-500 text-white shadow-2xs animate-pulse"
                                                        title={`${dayEvents.length} cita(s) programada(s)`}
                                                    >
                                                        {dayEvents.length}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="mt-1 opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 font-bold">
                                                    +
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div 
                                        key={day.toISOString()} 
                                        className={`text-center p-2 border-b border-l border-slate-200 ${
                                            isWeekend ? 'bg-slate-100/80 border-t-2 border-t-slate-300' : 'bg-white'
                                        }`}
                                    >
                                        <div className={`text-sm ${isWeekend ? 'font-bold text-slate-800' : 'font-semibold text-slate-600'}`}>
                                            {WEEKDAYS[(day.getDay() + 6) % 7]}
                                        </div>
                                        <button
                                            onClick={() => handleSelectDay(day)}
                                            className={`text-lg font-bold rounded-full w-8 h-8 mx-auto flex items-center justify-center transition-colors hover:bg-teal-100 cursor-pointer ${
                                                isToday ? 'bg-teal-600 text-white hover:bg-teal-700' : 'text-slate-800'
                                            }`}
                                        >
                                            {day.getDate()}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* All-day Events Section */}
                    {allDayEventsByDay.some(e => e.length > 0) && (
                        <div className="flex border-b border-amber-200/80 bg-amber-50/40">
                             <div className="w-16 flex-shrink-0 text-center flex items-center justify-center p-0.5">
                                <span className="text-[9px] uppercase font-bold text-amber-800 bg-amber-100/90 px-1 py-0.5 rounded border border-amber-200/80 shadow-2xs" title="Acciones a realizar a lo largo del día (sin horario fijado)">
                                    📋 A realizar
                                </span>
                             </div>
                             <div className="flex-1 grid" style={{ gridTemplateColumns }}>
                                 {allDayEventsByDay.map((events, dayIndex) => {
                                     const isWeekend = dayIndex >= 5;
                                     if (collapseWeekends && isWeekend) {
                                         return (
                                             <div 
                                                 key={dayIndex} 
                                                 className={`border-b border-l border-slate-200 p-1 min-h-[30px] flex items-center justify-center cursor-pointer hover:bg-teal-50/50 ${events.length > 0 ? 'bg-amber-100/60' : 'bg-slate-100/80'}`}
                                                 onClick={() => setCollapseWeekends(false)}
                                                 title={events.length > 0 ? `${events.length} cita(s) de todo el día. Clic para expandir` : 'Clic para expandir'}
                                             >
                                                 {events.length > 0 && (
                                                     <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] font-bold rounded-full bg-amber-500 text-white shadow-2xs">
                                                         {events.length}
                                                     </span>
                                                 )}
                                             </div>
                                         );
                                     }

                                     return (
                                         <div 
                                            key={dayIndex} 
                                            className={`border-b border-l border-slate-200 p-1 min-h-[30px] ${
                                                isWeekend ? 'bg-slate-100/50' : 'bg-white'
                                            }`}
                                         >
                                            {events.map(event => <EventItem key={event.id} event={event} />)}
                                         </div>
                                     );
                                 })}
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
            <div className="w-16 flex-shrink-0 text-right pr-2 select-none">
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                    <div key={`time-label-${i}`} style={{ height: `${HOUR_HEIGHT}px` }} className="relative flex flex-col justify-between py-1">
                        <span className="relative -top-2 text-xs font-semibold text-slate-600">
                            {`${(START_HOUR + i).toString().padStart(2, '0')}:00`}
                        </span>
                        <span className="relative text-[10px] text-slate-400 font-medium opacity-70">
                            {`${(START_HOUR + i).toString().padStart(2, '0')}:30`}
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
                        const slotDate0 = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, 0, 0, 0);
                        const slotDate30 = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, 30, 0, 0);

                        const isFirstHalfFree = isSharedViewActive && highlightFreeSlots && checkIsCommonFreeSlot(currentDate, hour, 0);
                        const isSecondHalfFree = isSharedViewActive && highlightFreeSlots && checkIsCommonFreeSlot(currentDate, hour, 30);

                        return (
                            <div 
                                key={`grid-line-${i}`} 
                                style={{ height: `${HOUR_HEIGHT}px` }} 
                                className="border-b border-slate-200 flex flex-col"
                            >
                                {/* First 30-min slot (:00 to :30) */}
                                <div 
                                    className={`h-1/2 border-b border-dashed transition-colors cursor-pointer flex items-center justify-between px-3 group/free0 ${
                                        isFirstHalfFree 
                                            ? 'bg-emerald-50/70 border-emerald-300/70 hover:bg-emerald-100/90' 
                                            : 'border-slate-100 hover:bg-teal-50/40'
                                    }`}
                                    onClick={() => handleOpenModal(null, { 
                                        start: slotDate0.toISOString(), 
                                        hasExplicitTime: true,
                                        assignedTo: isSharedViewActive ? activeSharedTechnicians.map(t => t.id) : undefined 
                                    } as any)}
                                    title={isFirstHalfFree 
                                        ? `✨ Espacio común libre de ${hour.toString().padStart(2, '0')}:00 a ${hour.toString().padStart(2, '0')}:30 (${activeSharedTechnicians.length} técnicos libres). Clic para programar tarea conjunta.`
                                        : `Crear cita para ${currentDate.toLocaleDateString('es-ES')} a las ${hour.toString().padStart(2, '0')}:00`}
                                >
                                    {isFirstHalfFree ? (
                                        <>
                                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-100/90 px-2 py-0.5 rounded shadow-2xs">
                                                <IoSparklesOutline className="text-emerald-700 text-xs" />
                                                <span>{`${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:30`} · Espacio común libre ({activeSharedTechnicians.length} técnicos)</span>
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700 opacity-0 group-hover/free0:opacity-100 transition-opacity bg-white/90 px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">
                                                + Programar conjunta (30 min)
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] font-medium text-slate-300 opacity-0 group-hover/free0:opacity-100 transition-opacity">
                                            {`${hour.toString().padStart(2, '0')}:00`}
                                        </span>
                                    )}
                                </div>

                                {/* Second 30-min slot (:30 to :00) */}
                                <div 
                                    className={`h-1/2 transition-colors cursor-pointer flex items-center justify-between px-3 group/free30 ${
                                        isSecondHalfFree 
                                            ? 'bg-emerald-50/70 hover:bg-emerald-100/90' 
                                            : 'hover:bg-teal-50/40'
                                    }`}
                                    onClick={() => handleOpenModal(null, { 
                                        start: slotDate30.toISOString(), 
                                        hasExplicitTime: true,
                                        assignedTo: isSharedViewActive ? activeSharedTechnicians.map(t => t.id) : undefined 
                                    } as any)}
                                    title={isSecondHalfFree 
                                        ? `✨ Espacio común libre de ${hour.toString().padStart(2, '0')}:30 a ${(hour + 1).toString().padStart(2, '0')}:00 (${activeSharedTechnicians.length} técnicos libres). Clic para programar tarea conjunta.`
                                        : `Crear cita para ${currentDate.toLocaleDateString('es-ES')} a las ${hour.toString().padStart(2, '0')}:30`}
                                >
                                    {isSecondHalfFree ? (
                                        <>
                                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-100/90 px-2 py-0.5 rounded shadow-2xs">
                                                <IoSparklesOutline className="text-emerald-700 text-xs" />
                                                <span>{`${hour.toString().padStart(2, '0')}:30 - ${(hour + 1).toString().padStart(2, '0')}:00`} · Espacio común libre ({activeSharedTechnicians.length} técnicos)</span>
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700 opacity-0 group-hover/free30:opacity-100 transition-opacity bg-white/90 px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">
                                                + Programar conjunta (30 min)
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] font-medium text-slate-300 opacity-0 group-hover/free30:opacity-100 transition-opacity">
                                            {`${hour.toString().padStart(2, '0')}:30`}
                                        </span>
                                    )}
                                </div>
                            </div>
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
                    <div className="p-2 border-b border-amber-200/80 bg-amber-50/40 flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200/80 w-24 text-center flex-shrink-0 shadow-2xs" title="Acciones a realizar a lo largo del día (sin horario fijado)">
                            📋 A realizar
                        </span>
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

            {/* Restricted Access Modal Notice */}
            {restrictedAccessNotice.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 text-2xl shrink-0">
                                <IoLockClosedOutline />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-slate-800">
                                    Acceso Restringido
                                </h3>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    No puedes entrar ni editar la cita <strong className="text-slate-800">"{restrictedAccessNotice.title}"</strong> porque no figuras como técnico/a asignado/a ni como creador/a.
                                </p>
                                {restrictedAccessNotice.associatedNames && (
                                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">Técnicos asignados:</span>
                                        <div className="mt-0.5 font-medium text-teal-800">{restrictedAccessNotice.associatedNames}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setRestrictedAccessNotice({ isOpen: false, title: '', associatedNames: '' })}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;