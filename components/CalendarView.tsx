import React, { useState, useMemo } from 'react';
import { Case, Intervention, InterventionType, DashboardView, User } from '../types';
import NewEventModal from './NewEventModal';
import { IoAddOutline, IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5';

interface CalendarViewProps {
    cases: Case[];
    generalInterventions: Intervention[];
    onSaveIntervention: (intervention: Omit<Intervention, 'id'> | Intervention) => void;
    onDeleteIntervention: (intervention: Intervention) => void;
    onSelectCaseById: (caseId: string, view: DashboardView) => void;
    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
    currentUser: User;
}

type CalendarViewType = 'month' | 'week' | 'day';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOUR_HEIGHT = 60; // in pixels
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

const CalendarView: React.FC<CalendarViewProps> = ({ cases, generalInterventions, onSaveIntervention, onDeleteIntervention, onSelectCaseById, requestConfirmation, currentUser }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [modalState, setModalState] = useState<{
        item: Intervention | null;
        initialValues?: Partial<Intervention>;
    }>({ item: null, initialValues: undefined });
    
    const allInterventions = useMemo(() => {
        const caseInterventions = cases.flatMap(c => c.interventions);
        const combined = [...caseInterventions, ...generalInterventions];
        // Filter interventions for the current user
        return combined.filter(i => i.createdBy === currentUser.id);
    }, [cases, generalInterventions, currentUser]);


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

    const EventItem: React.FC<{event: Intervention}> = ({ event }) => {
        const caseForEvent = event.caseId ? cases.find(c => c.id === event.caseId) : null;
        const style = getInterventionTypeColor(event.interventionType);

        return (
            <div
                style={{ ...style, borderLeft: `4px solid ${style.borderLeftColor}` }}
                className="text-xs p-1.5 rounded-sm overflow-hidden mb-1 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleOpenModal(event, undefined); }}
            >
                <div className="font-semibold truncate">
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
            </div>
        );
    };
    
    const TimedEventItem: React.FC<{event: Intervention}> = ({ event }) => {
        const caseForEvent = event.caseId ? cases.find(c => c.id === event.caseId) : null;
        const style = getInterventionTypeColor(event.interventionType);
        const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

        return (
            <div
                style={{ ...style, borderLeft: `4px solid ${style.borderLeftColor}` }}
                className="text-xs p-1.5 rounded-sm overflow-hidden h-full flex flex-col cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleOpenModal(event, undefined); }}
            >
                <div className="font-semibold truncate">
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
                {!event.isAllDay && <div className="text-slate-700">{timeFormat.format(new Date(event.start))}</div>}
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

        const navButtonStyle = "px-3 py-1.5 text-sm font-semibold rounded-md transition-colors focus:outline-none";
        const activeStyle = "bg-white text-teal-700 shadow-sm";
        const inactiveStyle = "bg-transparent text-slate-600 hover:bg-white/60";

        return (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 capitalize text-center sm:text-left">
                    {getTitle()}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2">
                     <button
                        onClick={() => handleOpenModal(null, { start: currentDate.toISOString() })}
                        className="bg-teal-600 text-white w-10 h-10 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors"
                        aria-label="Añadir nueva intervención"
                        title="Añadir nueva intervención"
                    >
                        <IoAddOutline className="text-2xl" />
                    </button>
                    <div className="flex items-center border border-slate-300 rounded-lg">
                        <button onClick={handlePrev} className="p-2 text-slate-600 hover:bg-slate-100 rounded-l-lg"><IoChevronBackOutline /></button>
                        <button onClick={handleToday} className="px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 border-x border-slate-300">Hoy</button>
                        <button onClick={handleNext} className="p-2 text-slate-600 hover:bg-slate-100 rounded-r-lg"><IoChevronForwardOutline /></button>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setView('month')} className={`${navButtonStyle} ${view === 'month' ? activeStyle : inactiveStyle}`}>Mes</button>
                        <button onClick={() => setView('week')} className={`${navButtonStyle} ${view === 'week' ? activeStyle : inactiveStyle}`}>Semana</button>
                        <button onClick={() => setView('day')} className={`${navButtonStyle} ${view === 'day' ? activeStyle : inactiveStyle}`}>Día</button>
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
                        onClick={() => handleOpenModal(null, { start: cloneDay.toISOString() })}
                    >
                        <span className={`text-sm font-medium ${isToday ? 'bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                            {cloneDay.getDate()}
                        </span>
                        <div className={`mt-1 space-y-1 ${!isCurrentMonth ? 'opacity-60' : ''}`}>
                            {dayEvents.map(event => <EventItem key={event.id} event={event} />)}
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
        const timedEventsByDay = weekDays.map(day => getEventsForDay(day).filter(e => !e.isAllDay));
    
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
                    {Array.from({ length: (END_HOUR - START_HOUR) * 7 }).map((_, i) => (
                        <div key={`grid-cell-${i}`} className="h-[60px] border-b border-l border-slate-200"></div>
                    ))}
                </div>
    
                {/* Events */}
                <div className="absolute top-0 left-0 right-0 bottom-0 grid grid-cols-7">
                    {timedEventsByDay.map((events, dayIndex) => (
                        <div key={dayIndex} className="relative border-l border-slate-200">
                            {events.map(event => {
                                const start = new Date(event.start);
                                const end = new Date(event.end);
                                const startMinutes = start.getHours() * 60 + start.getMinutes();
                                const endMinutes = end.getHours() * 60 + end.getMinutes();
                                
                                if (start.getHours() >= END_HOUR || end.getHours() < START_HOUR) return null;
                                
                                const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                                const duration = Math.max(15, endMinutes - startMinutes);
                                const height = (duration / 60) * HOUR_HEIGHT;
                                
                                return (
                                    <div key={event.id} className="absolute left-1 right-1 z-10" style={{ top: `${top}px`, height: `${height - 2}px` }}>
                                        <TimedEventItem event={event} />
                                    </div>
                                );
                            })}
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
        const timedEvents = dayEvents.filter(e => !e.isAllDay);
        const allDayEvents = dayEvents.filter(e => e.isAllDay);
    
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
                    {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                        <div key={`grid-line-${i}`} className="h-[60px] border-b border-slate-200"></div>
                    ))}
                </div>
                
                {/* Timed Events */}
                <div className="absolute top-0 left-0 right-0 bottom-0">
                    {timedEvents.map(event => {
                        const start = new Date(event.start);
                        const end = new Date(event.end);
                        const startMinutes = start.getHours() * 60 + start.getMinutes();
                        const endMinutes = end.getHours() * 60 + end.getMinutes();
                        
                        if (start.getHours() >= END_HOUR || end.getHours() < START_HOUR) return null;
                        
                        const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                        const duration = Math.max(15, endMinutes - startMinutes);
                        const height = (duration / 60) * HOUR_HEIGHT;
                        
                        return (
                            <div key={event.id} className="absolute left-2 right-2 z-10" style={{ top: `${top}px`, height: `${height - 2}px` }}>
                                <TimedEventItem event={event} />
                            </div>
                        );
                    })}
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
                onSaveIntervention={onSaveIntervention}
                onDeleteIntervention={onDeleteIntervention}
                requestConfirmation={requestConfirmation}
            />
        </div>
    );
};

export default CalendarView;