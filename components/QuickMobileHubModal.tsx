import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Case, Intervention, InterventionStatus, InterventionType, Professional, ProfessionalRole, User } from '../types';
import { enhanceInterventionNotes, EnhancementStyle } from '../services/geminiService';
import { 
    IoMicOutline, 
    IoMicOffOutline, 
    IoSparkles, 
    IoCalendarOutline, 
    IoTimeOutline, 
    IoCheckmarkCircleOutline, 
    IoSunnyOutline, 
    IoCloseOutline, 
    IoSaveOutline, 
    IoBookOutline, 
    IoRefreshOutline, 
    IoCopyOutline, 
    IoCheckmarkOutline, 
    IoPersonOutline, 
    IoFlashOutline,
    IoChevronForwardOutline,
    IoAlertCircleOutline,
    IoCreateOutline,
    IoAddOutline,
    IoDocumentTextOutline
} from 'react-icons/io5';

interface QuickMobileHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    cases: Case[];
    generalInterventions: Intervention[];
    professionals: Professional[];
    currentUser: User | null;
    onSaveIntervention: (intervention: Omit<Intervention, 'id'> | Intervention) => Promise<void> | void;
    onSelectCaseById: (caseId: string) => void;
    onNavigateToView: (view: 'cases' | 'calendar' | 'stats' | 'allNotes') => void;
}

const allInterventionTypes = [
    InterventionType.Meeting,
    InterventionType.HomeVisit,
    InterventionType.PhoneCall,
    InterventionType.Coordination,
    InterventionType.Administrative,
    InterventionType.Accompaniment,
    InterventionType.PsychologicalSupport,
    InterventionType.Workshop,
    InterventionType.Other
];

export const QuickMobileHubModal: React.FC<QuickMobileHubModalProps> = ({
    isOpen,
    onClose,
    cases,
    generalInterventions,
    professionals,
    currentUser,
    onSaveIntervention,
    onSelectCaseById,
    onNavigateToView
}) => {
    const [activeTab, setActiveTab] = useState<'dictate' | 'agenda' | 'quickEvent'>('dictate');

    // Selected event for dictation & editing (null means creating a new spontaneous intervention)
    const [selectedEventForDictation, setSelectedEventForDictation] = useState<Intervention | null>(null);

    // --- Dictation & AI Enhancement State ---
    const [dictatedNotes, setDictatedNotes] = useState('');
    const [originalNotesBackup, setOriginalNotesBackup] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [speechError, setSpeechError] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
    const [enhancementStyle, setEnhancementStyle] = useState<EnhancementStyle>('technical');
    
    // Intervention details for dictation flow
    const [targetCaseId, setTargetCaseId] = useState<string>('');
    const [caseSearchTerm, setCaseSearchTerm] = useState('');
    const [interventionType, setInterventionType] = useState<InterventionType>(InterventionType.Meeting);
    const [customTitle, setCustomTitle] = useState('');
    const [isAllDay, setIsAllDay] = useState(true);
    const [markAsCompleted, setMarkAsCompleted] = useState(true);
    const [isRegisteredInNotebook, setIsRegisteredInNotebook] = useState(true);
    const [assignedTechIds, setAssignedTechIds] = useState<string[]>(currentUser?.id ? [currentUser.id] : []);
    const [isSavingIntervention, setIsSavingIntervention] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);

    // --- Quick Event State ---
    const getLocalHHMM = (d: Date) => {
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const [quickTitle, setQuickTitle] = useState('');
    const [quickCaseId, setQuickCaseId] = useState('');
    const [quickType, setQuickType] = useState<InterventionType>(InterventionType.Meeting);
    const [quickDate, setQuickDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [quickStartTime, setQuickStartTime] = useState(() => getLocalHHMM(new Date()));
    const [quickEndTime, setQuickEndTime] = useState(() => getLocalHHMM(new Date(Date.now() + 60 * 60 * 1000)));
    const [quickIsAllDay, setQuickIsAllDay] = useState(false);
    const [quickAssigned, setQuickAssigned] = useState<string[]>(currentUser?.id ? [currentUser.id] : []);
    const [quickNotes, setQuickNotes] = useState('');
    const [isQuickSaving, setIsQuickSaving] = useState(false);

    const recognitionRef = useRef<any>(null);

    // Helper to load an agenda event into the dictation & AI editor
    const loadEventIntoDictateTab = (event: Intervention | null) => {
        setSelectedEventForDictation(event);
        setSpeechError(null);
        setAiSuccessMessage(null);
        setOriginalNotesBackup(null);

        if (event) {
            setDictatedNotes(event.notes || '');
            setTargetCaseId(event.caseId || '');
            setInterventionType(event.interventionType || InterventionType.Meeting);
            setCustomTitle(event.title || '');
            setIsAllDay(Boolean(event.isAllDay));
            setIsRegisteredInNotebook(Boolean(event.isRegistered));
            setMarkAsCompleted(event.status === InterventionStatus.Completed || true);
            setAssignedTechIds(event.assignedTo && event.assignedTo.length > 0 ? event.assignedTo : (currentUser?.id ? [currentUser.id] : []));
        } else {
            // New spontaneous intervention
            setDictatedNotes('');
            setTargetCaseId('');
            setInterventionType(InterventionType.Meeting);
            setCustomTitle('');
            setIsAllDay(true);
            setIsRegisteredInNotebook(true);
            setMarkAsCompleted(true);
            setAssignedTechIds(currentUser?.id ? [currentUser.id] : []);
        }
        setActiveTab('dictate');
    };

    // Filter active cases for selection
    const availableCases = useMemo(() => {
        return cases.filter(c => c.status !== 'Cerrado' as any);
    }, [cases]);

    const filteredCases = useMemo(() => {
        if (!caseSearchTerm.trim()) return availableCases.slice(0, 15);
        const term = caseSearchTerm.toLowerCase();
        return availableCases.filter(c => 
            c.name.toLowerCase().includes(term) || 
            (c.nickname && c.nickname.toLowerCase().includes(term))
        ).slice(0, 20);
    }, [availableCases, caseSearchTerm]);

    // Selected case helper
    const selectedCaseObj = useMemo(() => {
        return cases.find(c => c.id === targetCaseId) || null;
    }, [cases, targetCaseId]);

    // EDIS Technicians
    const edisTechnicians = useMemo(() => {
        return professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
    }, [professionals]);

    // Today's agenda interventions
    const todayAgendaEvents = useMemo(() => {
        const todayStr = new Date().toDateString();
        const uniqueMap = new Map<string, Intervention>();

        cases.forEach(c => {
            (c.interventions || []).forEach(i => {
                if (i && i.id) uniqueMap.set(i.id, i);
            });
        });
        generalInterventions.forEach(i => {
            if (i && i.id && !uniqueMap.has(i.id)) uniqueMap.set(i.id, i);
        });

        return Array.from(uniqueMap.values())
            .filter(event => {
                if (!event || !event.start) return false;
                const isOnDay = event.isAllDay && event.end
                    ? (() => {
                        const now = new Date();
                        const check = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const s = new Date(new Date(event.start).getFullYear(), new Date(event.start).getMonth(), new Date(event.start).getDate());
                        const e = new Date(new Date(event.end).getFullYear(), new Date(event.end).getMonth(), new Date(event.end).getDate());
                        return check >= s && check <= e;
                    })()
                    : new Date(event.start).toDateString() === todayStr;

                if (!isOnDay) return false;
                if (!currentUser || currentUser.role === 'admin') return true;

                const isAssigned = Boolean(event.assignedTo && Array.isArray(event.assignedTo) && event.assignedTo.includes(currentUser.id));
                const isCreator = event.createdBy === currentUser.id;
                return isAssigned || isCreator;
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }, [cases, generalInterventions, currentUser]);

    const todayPendingAllDay = useMemo(() => {
        return todayAgendaEvents.filter(e => e.isAllDay && e.status === InterventionStatus.Planned);
    }, [todayAgendaEvents]);

    const todayTimedEvents = useMemo(() => {
        return todayAgendaEvents.filter(e => !(e.isAllDay && e.status === InterventionStatus.Planned));
    }, [todayAgendaEvents]);

    // Initialize Web Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechSupported(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'es-ES';

            recognition.onstart = () => {
                setIsListening(true);
                setSpeechError(null);
            };

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setDictatedNotes(prev => {
                        const spacer = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
                        return prev + spacer + finalTranscript.trim();
                    });
                }
            };

            recognition.onerror = (event: any) => {
                console.warn('Speech recognition event:', event.error);
                if (event.error === 'not-allowed') {
                    setSpeechError('Permiso de micrófono no concedido en el navegador.');
                } else if (event.error === 'no-speech') {
                    // Ignore silent timeout
                } else {
                    setSpeechError(`Aviso de dictado: ${event.error}`);
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        } catch (e) {
            console.error('Error initializing SpeechRecognition:', e);
            setSpeechSupported(false);
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore
                }
            }
        };
    }, []);

    // Cleanup when modal closes
    useEffect(() => {
        if (!isOpen && isListening && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
            setIsListening(false);
        }
    }, [isOpen, isListening]);

    const toggleDictation = () => {
        if (!speechSupported) {
            setSpeechError('El dictado por voz no es compatible con este navegador. Puedes escribir o usar el teclado de tu móvil.');
            return;
        }

        if (isListening) {
            try {
                recognitionRef.current?.stop();
            } catch (e) {}
            setIsListening(false);
        } else {
            setSpeechError(null);
            try {
                recognitionRef.current?.start();
            } catch (err: any) {
                console.error('Error starting speech recognition:', err);
                setSpeechError('No se pudo iniciar el micrófono. Verifica los permisos.');
                setIsListening(false);
            }
        }
    };

    // AI Enhancement Handler
    const handleEnhanceWithAI = async () => {
        if (!dictatedNotes.trim()) {
            setSpeechError('Primero dicta o escribe algunas notas para que la IA pueda redactarlas profesionalmente.');
            return;
        }

        setIsEnhancing(true);
        setSpeechError(null);
        setAiSuccessMessage(null);

        try {
            if (!originalNotesBackup) {
                setOriginalNotesBackup(dictatedNotes);
            }

            const enhanced = await enhanceInterventionNotes(
                dictatedNotes,
                enhancementStyle,
                {
                    caseName: selectedCaseObj ? (selectedCaseObj.nickname ? `${selectedCaseObj.name} (${selectedCaseObj.nickname})` : selectedCaseObj.name) : undefined,
                    interventionType: interventionType
                }
            );

            setDictatedNotes(enhanced);
            setAiSuccessMessage('¡Redacción mejorada con IA aplicada con éxito!');
            setTimeout(() => setAiSuccessMessage(null), 4000);
        } catch (err: any) {
            console.error('Error enhancing notes with AI:', err);
            setSpeechError(err.message || 'Error al conectar con el asistente de IA.');
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleRestoreOriginal = () => {
        if (originalNotesBackup) {
            setDictatedNotes(originalNotesBackup);
            setOriginalNotesBackup(null);
        }
    };

    const handleCopyNotes = () => {
        if (!dictatedNotes) return;
        navigator.clipboard.writeText(dictatedNotes);
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2500);
    };

    // Save Dictated / Edited Intervention
    const handleSaveDictatedIntervention = async () => {
        const titleToUse = customTitle.trim() || `${interventionType}${selectedCaseObj ? ` - ${selectedCaseObj.nickname || selectedCaseObj.name}` : ''}`;
        
        if (!dictatedNotes.trim() && !customTitle.trim()) {
            setSpeechError('Por favor introduce un título o notas para la intervención.');
            return;
        }

        setIsSavingIntervention(true);
        setSpeechError(null);

        try {
            if (selectedEventForDictation) {
                // Updating existing intervention from today's agenda
                const updatedIntervention: Intervention = {
                    ...selectedEventForDictation,
                    title: titleToUse,
                    interventionType: interventionType,
                    isAllDay: isAllDay,
                    notes: dictatedNotes.trim(),
                    isRegistered: isRegisteredInNotebook && Boolean(targetCaseId),
                    caseId: targetCaseId || null,
                    status: markAsCompleted ? InterventionStatus.Completed : selectedEventForDictation.status,
                    assignedTo: assignedTechIds.length > 0 ? assignedTechIds : (selectedEventForDictation.assignedTo || []),
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.id
                };
                await onSaveIntervention(updatedIntervention);
            } else {
                // Creating new spontaneous intervention
                const now = new Date();
                const startIso = now.toISOString();
                const endIso = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

                const newIntervention: Omit<Intervention, 'id'> = {
                    title: titleToUse,
                    interventionType: interventionType,
                    start: startIso,
                    end: endIso,
                    isAllDay: isAllDay,
                    notes: dictatedNotes.trim(),
                    isRegistered: isRegisteredInNotebook && Boolean(targetCaseId),
                    caseId: targetCaseId || null,
                    status: markAsCompleted ? InterventionStatus.Completed : InterventionStatus.Planned,
                    assignedTo: assignedTechIds.length > 0 ? assignedTechIds : (currentUser?.id ? [currentUser.id] : []),
                    createdBy: currentUser?.id
                };
                await onSaveIntervention(newIntervention);
            }

            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                // Reset form
                setSelectedEventForDictation(null);
                setDictatedNotes('');
                setOriginalNotesBackup(null);
                setCustomTitle('');
                onClose();
            }, 1200);
        } catch (err: any) {
            console.error('Error saving intervention:', err);
            setSpeechError('Error al guardar la intervención.');
        } finally {
            setIsSavingIntervention(false);
        }
    };

    // Save Quick Calendar Event
    const handleSaveQuickEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickTitle.trim()) return;

        setIsQuickSaving(true);
        try {
            const startDateTime = quickIsAllDay 
                ? new Date(`${quickDate}T00:00:00`).toISOString()
                : new Date(`${quickDate}T${quickStartTime}:00`).toISOString();

            const endDateTime = quickIsAllDay 
                ? new Date(`${quickDate}T23:59:59`).toISOString()
                : new Date(`${quickDate}T${quickEndTime}:00`).toISOString();

            const newEvent: Omit<Intervention, 'id'> = {
                title: quickTitle.trim(),
                interventionType: quickType,
                start: startDateTime,
                end: endDateTime,
                isAllDay: quickIsAllDay,
                notes: quickNotes.trim(),
                isRegistered: false,
                caseId: quickCaseId || null,
                status: InterventionStatus.Planned,
                assignedTo: quickAssigned.length > 0 ? quickAssigned : (currentUser?.id ? [currentUser.id] : []),
                createdBy: currentUser?.id
            };

            await onSaveIntervention(newEvent);
            setQuickTitle('');
            setQuickNotes('');
            onClose();
        } catch (err) {
            console.error('Error saving quick event:', err);
        } finally {
            setIsQuickSaving(false);
        }
    };

    // Quick Status Toggle for Today's Agenda in Mobile View
    const handleToggleTodayStatus = async (event: Intervention) => {
        const nextStatus = event.status === InterventionStatus.Planned 
            ? InterventionStatus.Completed 
            : InterventionStatus.Planned;
        
        await onSaveIntervention({
            ...event,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.id
        });
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-hub-title"
        >
            <div 
                className="w-full sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-slideUp"
            >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-800 text-white px-5 py-3.5 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-teal-200 border border-white/20">
                            <IoFlashOutline className="w-5 h-5 text-amber-300" />
                        </span>
                        <div>
                            <h3 id="mobile-hub-title" className="text-base font-bold leading-tight flex items-center gap-2">
                                <span>Acceso Rápido Móvil</span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-600/70 border border-teal-400/40 text-teal-100">
                                    EDIS
                                </span>
                            </h3>
                            <p className="text-[11px] text-teal-200/90">
                                {currentUser?.name ? `Hola, ${currentUser.name.split(' ')[0]}` : 'Intervención rápida'}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Cerrar modal rápido"
                    >
                        <IoCloseOutline className="text-2xl" />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="grid grid-cols-3 bg-slate-100/90 border-b border-slate-200 p-1.5 gap-1 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActiveTab('dictate')}
                        className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'dictate'
                                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                    >
                        <IoMicOutline className={`text-base ${activeTab === 'dictate' ? 'text-teal-600' : ''}`} />
                        <span>Dictar & IA</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('agenda')}
                        className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all relative cursor-pointer ${
                            activeTab === 'agenda'
                                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                    >
                        <IoCalendarOutline className={`text-base ${activeTab === 'agenda' ? 'text-teal-600' : ''}`} />
                        <span>Agenda Hoy</span>
                        {todayPendingAllDay.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('quickEvent')}
                        className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'quickEvent'
                                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                    >
                        <IoTimeOutline className={`text-base ${activeTab === 'quickEvent' ? 'text-teal-600' : ''}`} />
                        <span>Nueva Cita</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    
                    {/* TAB 1: DICTATION & AI ENHANCEMENT */}
                    {activeTab === 'dictate' && (
                        <div className="space-y-4">
                            {/* Actuación Selector (New vs Agenda item) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                        <IoCreateOutline className="text-teal-600 text-sm" />
                                        <span>Seleccionar actuación para dictar notas:</span>
                                    </label>
                                    {selectedEventForDictation && (
                                        <button
                                            type="button"
                                            onClick={() => loadEventIntoDictateTab(null)}
                                            className="text-[11px] text-teal-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                        >
                                            <IoAddOutline className="text-xs" />
                                            <span>Nueva actuación</span>
                                        </button>
                                    )}
                                </div>

                                <select
                                    value={selectedEventForDictation?.id || ''}
                                    onChange={(e) => {
                                        const eventId = e.target.value;
                                        if (!eventId) {
                                            loadEventIntoDictateTab(null);
                                        } else {
                                            const found = todayAgendaEvents.find(ev => ev.id === eventId);
                                            if (found) loadEventIntoDictateTab(found);
                                        }
                                    }}
                                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-800"
                                >
                                    <option value="">✨ [Nueva actuación espontánea / no planificada]</option>
                                    {todayAgendaEvents.length > 0 && (
                                        <optgroup label="📅 Citas y actuaciones de la agenda de hoy:">
                                            {todayAgendaEvents.map(ev => {
                                                const time = ev.isAllDay ? 'Todo el día' : new Date(ev.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                                const statusEmoji = ev.status === InterventionStatus.Completed ? '✅' : '⏳';
                                                return (
                                                    <option key={ev.id} value={ev.id}>
                                                        {statusEmoji} {time} - {ev.title} ({ev.interventionType})
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}
                                </select>

                                {selectedEventForDictation ? (
                                    <div className="bg-teal-50/80 border border-teal-200 rounded-lg p-2.5 flex items-start justify-between gap-2">
                                        <div className="text-xs min-w-0">
                                            <p className="font-bold text-teal-950 flex items-center gap-1.5 truncate">
                                                <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0" />
                                                <span>Editando cita: {selectedEventForDictation.title}</span>
                                            </p>
                                            <p className="text-[11px] text-teal-800 mt-0.5">
                                                {selectedEventForDictation.isAllDay ? 'Todo el día' : new Date(selectedEventForDictation.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} • {selectedEventForDictation.interventionType}
                                                {selectedEventForDictation.notes ? ' • (Notas previas cargadas)' : ' • (Sin notas aún)'}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                            selectedEventForDictation.status === InterventionStatus.Completed 
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                                        }`}>
                                            {selectedEventForDictation.status === InterventionStatus.Completed ? 'Completada' : 'Planificada'}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-slate-500 italic px-1">
                                        💡 Registrando una actuación nueva e inmediata. Puedes vincularla a un caso o guardarla como intervención general.
                                    </p>
                                )}
                            </div>

                            {/* Case selector with quick filter */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    1. Caso vinculado o intervención general
                                </label>
                                <div className="space-y-1.5">
                                    <input 
                                        type="text"
                                        placeholder="🔍 Buscar caso por nombre o apodo..."
                                        value={caseSearchTerm}
                                        onChange={(e) => setCaseSearchTerm(e.target.value)}
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
                                    />
                                    <select
                                        value={targetCaseId}
                                        onChange={(e) => setTargetCaseId(e.target.value)}
                                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                    >
                                        <option value="">-- Sin vincular a caso (Intervención General) --</option>
                                        {filteredCases.map(c => (
                                            <option key={c.id} value={c.id}>
                                                📁 {c.name} {c.nickname ? `(${c.nickname})` : ''} - {c.status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Quick Intervention Type Pills */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    2. Tipo de actuación
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {allInterventionTypes.map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setInterventionType(type)}
                                            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                                                interventionType === type
                                                    ? 'bg-teal-700 text-white font-semibold shadow-xs scale-102'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dictation Box & Live Voice Controls */}
                            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <IoMicOutline className="text-teal-600 text-base" />
                                        <span>3. Dictado o notas de la intervención</span>
                                    </span>
                                    {dictatedNotes && (
                                        <button
                                            type="button"
                                            onClick={handleCopyNotes}
                                            className="text-[11px] text-slate-500 hover:text-teal-700 font-medium flex items-center gap-1 cursor-pointer"
                                        >
                                            {copiedToClipboard ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline />}
                                            <span>{copiedToClipboard ? 'Copiado' : 'Copiar'}</span>
                                        </button>
                                    )}
                                </div>

                                {/* Main Microphone Action Button */}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={toggleDictation}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                                            isListening
                                                 ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-200'
                                                 : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-100'
                                        }`}
                                    >
                                        {isListening ? (
                                            <>
                                                <IoMicOffOutline className="text-xl" />
                                                <span>Escuchando... Toca para pausar</span>
                                            </>
                                        ) : (
                                            <>
                                                <IoMicOutline className="text-xl" />
                                                <span>{dictatedNotes ? 'Añadir más notas por voz' : 'Iniciar dictado por voz'}</span>
                                            </>
                                        )}
                                    </button>

                                    {dictatedNotes && (
                                        <button
                                            type="button"
                                            onClick={() => setDictatedNotes('')}
                                            className="px-3 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                                            title="Borrar texto"
                                        >
                                            Borrar
                                        </button>
                                    )}
                                </div>

                                {isListening && (
                                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-rose-700 font-semibold bg-rose-50 rounded-lg border border-rose-200">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                                        <span>Micrófono abierto en tiempo real (habla con naturalidad)</span>
                                    </div>
                                )}

                                {/* Dictated text area */}
                                <textarea
                                    value={dictatedNotes}
                                    onChange={(e) => setDictatedNotes(e.target.value)}
                                    rows={5}
                                    placeholder="Aquí aparecerá lo que dictes por voz, o puedes redactar y enriquecer los detalles de la actuación..."
                                    className="w-full text-xs leading-relaxed p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-2xs font-normal"
                                />

                                {/* AI Enhancement Box */}
                                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-teal-50 border border-indigo-200 rounded-xl p-3 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                                            <IoSparkles className="text-amber-500 text-sm" />
                                            <span>Redacción Mejorada con IA</span>
                                        </div>
                                        {originalNotesBackup && (
                                            <button
                                                type="button"
                                                onClick={handleRestoreOriginal}
                                                className="text-[11px] text-indigo-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                            >
                                                <IoRefreshOutline />
                                                <span>Restaurar borrador</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Style selection */}
                                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => setEnhancementStyle('technical')}
                                            className={`py-1.5 px-2 rounded-lg font-semibold text-left transition-all cursor-pointer border ${
                                                enhancementStyle === 'technical'
                                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                                            }`}
                                        >
                                            👔 Redacción Técnica
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setEnhancementStyle('structured')}
                                            className={`py-1.5 px-2 rounded-lg font-semibold text-left transition-all cursor-pointer border ${
                                                enhancementStyle === 'structured'
                                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                                            }`}
                                        >
                                            📋 Estructurada (3 fases)
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setEnhancementStyle('summary')}
                                            className={`py-1.5 px-2 rounded-lg font-semibold text-left transition-all cursor-pointer border ${
                                                enhancementStyle === 'summary'
                                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                                            }`}
                                        >
                                            ⚡ Resumen Ejecutivo
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setEnhancementStyle('grammar')}
                                            className={`py-1.5 px-2 rounded-lg font-semibold text-left transition-all cursor-pointer border ${
                                                enhancementStyle === 'grammar'
                                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                                            }`}
                                        >
                                            ✍️ Ortografía y Estilo
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={isEnhancing || !dictatedNotes.trim()}
                                        onClick={handleEnhanceWithAI}
                                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <IoSparkles className="text-amber-300 text-sm" />
                                        <span>{isEnhancing ? 'Procesando redacción con IA...' : '✨ Mejorar redacción con IA'}</span>
                                    </button>

                                    {aiSuccessMessage && (
                                        <p className="text-[11px] text-emerald-800 font-bold text-center bg-emerald-50 py-1 px-2 rounded border border-emerald-200">
                                            {aiSuccessMessage}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Additional Save Options */}
                            <div className="space-y-2 pt-1">
                                <input
                                    type="text"
                                    placeholder="Título personalizado (opcional, ej: Seguimiento telefónico)"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />

                                <div className="space-y-2 px-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isRegisteredInNotebook}
                                                disabled={!targetCaseId}
                                                onChange={(e) => setIsRegisteredInNotebook(e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                                            />
                                            <span className="flex items-center gap-1">
                                                <IoBookOutline className="text-teal-600" />
                                                <span>Registrar en Cuaderno de Campo</span>
                                            </span>
                                        </label>

                                        <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isAllDay}
                                                onChange={(e) => setIsAllDay(e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            />
                                            <span>Día completo</span>
                                        </label>
                                    </div>

                                    <div className="flex items-center text-xs">
                                        <label className="flex items-center gap-2 font-semibold text-teal-900 cursor-pointer bg-teal-50/70 p-2 rounded-lg border border-teal-200/80 w-full">
                                            <input
                                                type="checkbox"
                                                checked={markAsCompleted}
                                                onChange={(e) => setMarkAsCompleted(e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            />
                                            <span className="flex items-center gap-1">
                                                <IoCheckmarkCircleOutline className="text-emerald-600 text-base" />
                                                <span>Marcar actuación como Realizada / Completada al guardar</span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {speechError && (
                                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                                    <IoAlertCircleOutline className="text-base flex-shrink-0" />
                                    <span>{speechError}</span>
                                </div>
                            )}

                            {/* Submit Save Button */}
                            <button
                                type="button"
                                disabled={isSavingIntervention || saveSuccess}
                                onClick={handleSaveDictatedIntervention}
                                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {saveSuccess ? (
                                    <>
                                        <IoCheckmarkCircleOutline className="text-xl text-emerald-300" />
                                        <span>¡Intervención guardada con éxito!</span>
                                    </>
                                ) : (
                                    <>
                                        <IoSaveOutline className="text-lg" />
                                        <span>
                                            {isSavingIntervention 
                                                ? 'Guardando...' 
                                                : selectedEventForDictation 
                                                    ? 'Actualizar Notas de la Actuación' 
                                                    : 'Guardar Intervención Realizada'
                                            }
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* TAB 2: TODAY'S AGENDA QUICK ACTIONS */}
                    {activeTab === 'agenda' && (
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <IoCalendarOutline className="text-teal-600 text-sm" />
                                    <span>Agenda de hoy ({todayAgendaEvents.length} citas/apuntes)</span>
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateToView('stats');
                                        onClose();
                                    }}
                                    className="text-xs text-teal-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                >
                                    <span>Mesa de trabajo</span>
                                    <IoChevronForwardOutline className="text-xs" />
                                </button>
                            </div>

                            {/* Quick Action Button to Dictate Spontaneous Event */}
                            <button
                                type="button"
                                onClick={() => loadEventIntoDictateTab(null)}
                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                            >
                                <IoMicOutline className="text-amber-300 text-base" />
                                <span>Dictar nueva actuación no planificada</span>
                            </button>

                            {/* Pending All-Day Alerts */}
                            {todayPendingAllDay.length > 0 && (
                                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 shadow-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                                            <IoSunnyOutline className="text-amber-600 text-base" />
                                            <span>{todayPendingAllDay.length} Apuntes de Día Completo</span>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                            Pendiente hoy
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {todayPendingAllDay.map(item => (
                                            <div key={item.id} className="bg-white border border-amber-200 rounded-lg p-2.5 space-y-2 shadow-2xs">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-grow">
                                                        <p className="font-bold text-xs text-slate-900 truncate">{item.title}</p>
                                                        <p className="text-[11px] text-slate-500">{item.interventionType}</p>
                                                        {item.caseId && (
                                                            <button 
                                                                onClick={() => {
                                                                    onSelectCaseById(item.caseId!);
                                                                    onClose();
                                                                }}
                                                                className="text-[11px] text-teal-700 font-semibold hover:underline truncate block"
                                                            >
                                                                📁 Ver caso
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                                                        Todo el día
                                                    </span>
                                                </div>

                                                {item.notes && (
                                                    <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 line-clamp-2">
                                                        {item.notes}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => loadEventIntoDictateTab(item)}
                                                        className="flex-1 py-1.5 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                                        title="Dictar y editar notas con IA"
                                                    >
                                                        <IoMicOutline className="text-sm text-amber-300" />
                                                        <span>{item.notes ? 'Editar / Dictar notas' : 'Dictar notas con IA'}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleTodayStatus(item)}
                                                        className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 flex-shrink-0 shadow-2xs cursor-pointer"
                                                        title="Marcar como realizada"
                                                    >
                                                        <IoCheckmarkCircleOutline className="text-sm" />
                                                        <span>Completar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timed Events List */}
                            {todayTimedEvents.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Citas con horario y realizadas
                                    </p>
                                    {todayTimedEvents.map(event => {
                                        const timeStr = event.isAllDay 
                                            ? 'Todo el día' 
                                            : new Date(event.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                        const isDone = event.status === InterventionStatus.Completed;

                                        return (
                                            <div 
                                                key={event.id}
                                                className={`p-3 rounded-xl border space-y-2 transition-colors ${
                                                    isDone ? 'bg-slate-50 border-slate-200 opacity-90' : 'bg-white border-slate-200 shadow-2xs'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2.5">
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        <div className="text-center flex-shrink-0 w-12 pt-0.5">
                                                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 block">{timeStr}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-xs font-bold text-slate-900 truncate ${isDone ? 'line-through text-slate-500' : ''}`}>
                                                                {event.title}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500">{event.interventionType}</p>
                                                            {event.caseId && (
                                                                <button 
                                                                    onClick={() => {
                                                                        onSelectCaseById(event.caseId!);
                                                                        onClose();
                                                                    }}
                                                                    className="text-[10px] text-teal-700 font-semibold hover:underline truncate block"
                                                                >
                                                                    📁 Ver caso
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                        isDone 
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                                                    }`}>
                                                        {isDone ? 'Realizada' : 'Planificada'}
                                                    </span>
                                                </div>

                                                {event.notes && (
                                                    <p className="text-[11px] text-slate-600 bg-slate-100/70 p-1.5 rounded border border-slate-200 line-clamp-2">
                                                        <span className="font-semibold text-slate-700">Notas: </span>
                                                        {event.notes}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => loadEventIntoDictateTab(event)}
                                                        className="flex-1 py-1.5 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                                        title="Dictar y editar notas con IA"
                                                    >
                                                        <IoMicOutline className="text-sm text-amber-300" />
                                                        <span>{event.notes ? 'Editar / Dictar notas' : 'Dictar notas con IA'}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleTodayStatus(event)}
                                                        className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 flex-shrink-0 transition-colors cursor-pointer ${
                                                            isDone 
                                                                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300' 
                                                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                                        }`}
                                                    >
                                                        <IoCheckmarkCircleOutline className="text-sm" />
                                                        <span>{isDone ? 'Reabrir' : 'Completar'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                !todayPendingAllDay.length && (
                                    <div className="text-center py-8 text-slate-500 text-xs">
                                        <IoCalendarOutline className="text-3xl mx-auto mb-2 text-slate-300" />
                                        <p>No tienes citas programadas para el día de hoy.</p>
                                    </div>
                                )
                            )}

                            {/* Shortcut Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateToView('calendar');
                                        onClose();
                                    }}
                                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <IoCalendarOutline className="text-teal-700" />
                                    <span>Ver Calendario</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateToView('cases');
                                        onClose();
                                    }}
                                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <IoPersonOutline className="text-teal-700" />
                                    <span>Ver Mis Casos</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: FAST CALENDAR CREATION */}
                    {activeTab === 'quickEvent' && (
                        <form onSubmit={handleSaveQuickEvent} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Título de la cita / intervención *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Entrevista presencial, Visita de valoración..."
                                    value={quickTitle}
                                    onChange={(e) => setQuickTitle(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                        Tipo
                                    </label>
                                    <select
                                        value={quickType}
                                        onChange={(e) => setQuickType(e.target.value as InterventionType)}
                                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                    >
                                        {allInterventionTypes.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                        Caso (Opcional)
                                    </label>
                                    <select
                                        value={quickCaseId}
                                        onChange={(e) => setQuickCaseId(e.target.value)}
                                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                    >
                                        <option value="">General (Sin caso)</option>
                                        {availableCases.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} {c.nickname ? `(${c.nickname})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Date and Times */}
                            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Fecha y horario
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={quickIsAllDay}
                                            onChange={(e) => setQuickIsAllDay(e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span>Día completo</span>
                                    </label>
                                </div>

                                <input
                                    type="date"
                                    value={quickDate}
                                    onChange={(e) => setQuickDate(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                />

                                {!quickIsAllDay && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Hora inicio</span>
                                            <input
                                                type="time"
                                                value={quickStartTime}
                                                onChange={(e) => setQuickStartTime(e.target.value)}
                                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Hora fin</span>
                                            <input
                                                type="time"
                                                value={quickEndTime}
                                                onChange={(e) => setQuickEndTime(e.target.value)}
                                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Assigned Technicians Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Técnicos asignados
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {edisTechnicians.map(tech => {
                                        const isSelected = quickAssigned.includes(tech.id);
                                        return (
                                            <button
                                                key={tech.id}
                                                type="button"
                                                onClick={() => {
                                                    setQuickAssigned(prev => 
                                                        isSelected ? prev.filter(id => id !== tech.id) : [...prev, tech.id]
                                                    );
                                                }}
                                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border ${
                                                    isSelected 
                                                        ? 'bg-teal-700 text-white border-teal-800' 
                                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                                }`}
                                            >
                                                {tech.name.split(' ')[0]} {tech.id === currentUser?.id ? '(Tú)' : ''}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Notas previas / recordatorio (opcional)
                                </label>
                                <textarea
                                    value={quickNotes}
                                    onChange={(e) => setQuickNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Detalles sobre el objetivo o lugar..."
                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isQuickSaving || !quickTitle.trim()}
                                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <IoCalendarOutline className="text-lg" />
                                <span>{isQuickSaving ? 'Guardando en Calendario...' : 'Planificar en Calendario'}</span>
                            </button>
                        </form>
                    )}

                </div>

                {/* Footer bar */}
                <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-[11px]">
                        <IoSparkles className="text-amber-500 text-xs" />
                        <span>IA y Dictado por voz activo</span>
                    </span>
                    <button 
                        onClick={onClose}
                        className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer text-xs"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
