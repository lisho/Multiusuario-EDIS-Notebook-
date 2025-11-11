import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './components/Header';
import CaseDashboard from './components/CaseDashboard';
import CaseCard from './components/CaseCard';
import NewCaseModal from './components/NewCaseModal';
// FIX: Changed to a named import to resolve the "Module has no default export" error.
import { AdminDashboard } from './components/admin/AdminDashboard';
import CaseStatsDashboard from './components/CaseStatsDashboard';
import CalendarView from './components/CalendarView';
import TasksSidePanel from './components/TasksSidePanel';
import ConfirmationModal from './components/ConfirmationModal';
import NewTaskModal from './components/NewTaskModal';
import QuickNoteModal from './components/QuickNoteModal';
import Login from './components/Login';
import ProfileEditorModal from './components/ProfileEditorModal';
import GenogramViewer from './components/GenogramViewer';
import { Case, CaseStatus, Task, AdminTool, Intervention, InterventionRecord, Professional, DashboardView, MyNote, User, ProfessionalRole } from './types';
import { db, auth } from './services/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch, setDoc } from 'firebase/firestore';
import { IoAddOutline, IoCloseCircleOutline, IoSearchOutline, IoChevronDownOutline, IoWarningOutline, IoCloseOutline } from 'react-icons/io5';
import { BsPinAngleFill } from 'react-icons/bs';

const AnimatedSection: React.FC<{ children: React.ReactNode; delay: number }> = ({ children, delay }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={`h-full transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
        >
            {children}
        </div>
    );
};

const caseSorter = (a: Case, b: Case): number => {
    const aPinned = a.isPinned ?? false;
    const bPinned = b.isPinned ?? false;
    if (aPinned !== bPinned) {
        return aPinned ? -1 : 1; // Pinned cases come first
    }
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0); // Then sort by orderIndex
};

const App: React.FC = () => {
    const [cases, setCases] = useState<Case[]>([]);
    const [adminTools, setAdminTools] = useState<AdminTool[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [generalInterventions, setGeneralInterventions] = useState<Intervention[]>([]);
    const [generalTasks, setGeneralTasks] = useState<Task[]>([]);
    const [currentView, setCurrentView] = useState<'cases' | 'admin' | 'calendar'>('cases');
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [initialDashboardView, setInitialDashboardView] = useState<DashboardView>('profile');
    const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [tasksPanelState, setTasksPanelState] = useState<{ mode: 'closed' | 'single' | 'all'; caseData?: Case }>({ mode: 'closed' });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [taskToConvert, setTaskToConvert] = useState<Task | null>(null);
    const [statusFilter, setStatusFilter] = useState<CaseStatus | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isClosedCasesVisible, setIsClosedCasesVisible] = useState(false);
    const [draggedItem, setDraggedItem] = useState<Case | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [viewingGenogramUrl, setViewingGenogramUrl] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);
    const [quickNoteState, setQuickNoteState] = useState<{
        isOpen: boolean;
        caseData: Case | null;
    }>({ isOpen: false, caseData: null });

    const requestConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmationState({ isOpen: true, title, message, onConfirm });
    };

    const handleCloseConfirmation = () => {
        setConfirmationState(null);
    };
    
    const handleOpenGenogramViewer = (url: string) => {
        if (url) {
            setViewingGenogramUrl(url);
        }
    };

    const handleCloseGenogramViewer = () => {
        setViewingGenogramUrl(null);
    };

    const handleLogin = (professional: Professional) => {
        if (!professional.isSystemUser || !professional.systemRole) return;
        const user: User = {
            id: professional.id,
            name: professional.name,
            role: professional.systemRole,
        };
        setCurrentUser(user);
    };

    const handleLogout = () => {
        setCurrentUser(null);
    };

    useEffect(() => {
        // Authenticate with Firebase anonymously to allow Storage operations.
        // This is necessary because the default storage rules require authentication.
        signInAnonymously(auth).catch(error => {
            console.error("Firebase Anonymous sign-in failed:", error);
             if (error.code === 'auth/configuration-not-found') {
                setAuthError('Autenticación anónima deshabilitada. Ve a Firebase Console > Authentication > Sign-in method y habilita "Anónimo". Sin esto, la subida de imágenes y otras funciones fallarán.');
            } else {
                setAuthError(`Error de autenticación de Firebase: ${error.message}`);
            }
        });

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const professionalsSnapshot = await getDocs(collection(db, "professionals"));
                const professionalsList = professionalsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const prof: Professional = { id: doc.id, ...data } as Professional;
    
                    // Data migration for existing professionals to add user management fields
                    if (prof.role === ProfessionalRole.EdisTechnician) {
                        if (prof.isSystemUser === undefined) {
                            prof.isSystemUser = true; // All existing technicians could log in
                        }
                        if (prof.isSystemUser && !prof.systemRole) {
                            // The previous hardcoded logic is now a one-time migration
                            prof.systemRole = prof.name === 'Lisho' ? 'admin' : 'tecnico';
                        }
                    } else {
                         if (prof.isSystemUser === undefined) {
                            prof.isSystemUser = false; // Social workers are not system users by default
                        }
                    }

                    // Assign default password to admin if not set
                    if (prof.systemRole === 'admin' && !prof.password) {
                        prof.password = 'admin';
                    }
                    
                    return prof;
                }) as Professional[];
                setProfessionals(professionalsList);
    
                const lisho = professionalsList.find(p => p.name === 'Lisho');
                if (!lisho) {
                    console.warn("User 'Lisho' not found. Cannot migrate old data.");
                }
                const lishoId = lisho?.id;

                const casesQuery = query(collection(db, "cases"));
                const casesSnapshot = await getDocs(casesQuery);
                const casesList = casesSnapshot.docs.map(doc => {
                    const caseData = { id: doc.id, ...doc.data() } as Case;
                    if (lishoId) {
                        caseData.createdBy = caseData.createdBy || lishoId;
                        caseData.interventions = caseData.interventions.map(i => ({...i, createdBy: i.createdBy || lishoId}));
                        caseData.tasks = caseData.tasks.map(t => {
                            const migratedTask = {...t, createdBy: t.createdBy || lishoId};
                            // Data migration for tasks: convert assignedTo from string to string[]
                            if (typeof migratedTask.assignedTo === 'string') {
                                // @ts-ignore
                                migratedTask.assignedTo = [migratedTask.assignedTo];
                            }
                            return migratedTask;
                        });
                        
                        let processedNotes: MyNote[] = [];
                        if (Array.isArray(caseData.myNotes)) {
                            processedNotes = caseData.myNotes.map(n => ({ ...n, createdBy: n.createdBy || lishoId }));
                        } else if (typeof caseData.myNotes === 'string' && (caseData.myNotes as string).trim() !== '') {
                            // This handles legacy data where myNotes was a single string.
                            processedNotes = [{
                                id: `note-${doc.id}-${Date.now()}`,
                                content: caseData.myNotes as string,
                                color: 'yellow',
                                createdAt: new Date().toISOString(),
                                createdBy: lishoId
                            }];
                        }
                        caseData.myNotes = processedNotes;

                        caseData.interventionRecords = caseData.interventionRecords.map(r => ({...r, createdBy: r.createdBy || lishoId}));
                    }
                     // Data migration: ensure creator is always in professionalIds
                    if (caseData.createdBy) {
                        if (!Array.isArray(caseData.professionalIds)) {
                            caseData.professionalIds = [];
                        }
                        if (!caseData.professionalIds.includes(caseData.createdBy)) {
                            // This will add the creator to the list if they aren't there.
                            // This handles old cases created before the logic change in handleAddCase
                            caseData.professionalIds.push(caseData.createdBy);
                        }
                    }
                    return caseData;
                });
                setCases(casesList.sort(caseSorter));

                const toolsSnapshot = await getDocs(collection(db, "adminTools"));
                const toolsList = toolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminTool[];
                setAdminTools(toolsList);
                
                const generalInterventionsSnapshot = await getDocs(collection(db, "generalInterventions"));
                const generalInterventionsList = generalInterventionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdBy: doc.data().createdBy || lishoId,
                })) as Intervention[];
                setGeneralInterventions(generalInterventionsList);
                
                const generalTasksSnapshot = await getDocs(collection(db, "generalTasks"));
                const generalTasksList = generalTasksSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdBy: doc.data().createdBy || lishoId,
                })) as Task[];
                setGeneralTasks(generalTasksList);

            } catch (error) {
                console.error("Error fetching data from Firestore: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const visibleCases = useMemo(() => {
        if (!currentUser) {
            return [];
        }
        if (currentUser.role === 'admin') {
            return cases; // Admins see all cases
        }
        // Technicians only see cases they are assigned to
        return cases.filter(c => c.professionalIds?.includes(currentUser.id));
    }, [cases, currentUser]);
    
    const currentUserProfessional = useMemo(() => {
        if (!currentUser) return null;
        return professionals.find(p => p.id === currentUser.id) || null;
    }, [currentUser, professionals]);

    const currentUserGeneralTasks = useMemo(() => {
        if (!currentUser) return [];
        return generalTasks.filter(task => task.createdBy === currentUser.id);
    }, [generalTasks, currentUser]);

    const handleSetView = (view: 'cases' | 'admin' | 'calendar') => {
        setSelectedCase(null);
        setCurrentView(view);
        setStatusFilter(null);
        setSearchQuery('');
    };
    
    const handleClearFilters = () => {
        setStatusFilter(null);
        setSearchQuery('');
    };

    const handleAddCase = async (newCaseData: { name: string }) => {
        if (!currentUser) return;
        const newCaseDataForDb = {
            name: newCaseData.name,
            status: CaseStatus.Welcome,
            lastUpdate: new Date().toISOString(),
            interventions: [],
            tasks: [],
            nickname: '',
            dni: '', phone: '', email: '', address: '', profileNotes: '', myNotes: [], familyGrid: [], interventionRecords: [],
            professionalIds: [currentUser.id],
            isPinned: false,
            orderIndex: Date.now(),
            createdBy: currentUser.id,
        };
        try {
            const docRef = await addDoc(collection(db, "cases"), newCaseDataForDb);
            const newCase: Case = { id: docRef.id, ...newCaseDataForDb };
            setCases(prevCases => [newCase, ...prevCases].sort(caseSorter));
            setIsNewCaseModalOpen(false);
            setSelectedCase(newCase);
        } catch (error) {
            console.error("Error adding case to Firestore: ", error);
        }
    };

    const handleUpdateCase = async (updatedCase: Case) => {
        const caseId = updatedCase.id;
        const caseRef = doc(db, "cases", caseId);
        const { id, ...caseToUpdate } = updatedCase;
        // Don't update lastUpdate on pin/reorder to avoid jumping to top
        const isMinorUpdate = Object.keys(caseToUpdate).every(key => ['isPinned', 'orderIndex'].includes(key));
        const finalCaseData = { ...caseToUpdate, lastUpdate: isMinorUpdate ? updatedCase.lastUpdate : new Date().toISOString() };
    
        // Sanitize the data to remove any fields with `undefined` values, which Firestore doesn't support.
        const sanitizedData = Object.fromEntries(Object.entries(finalCaseData).filter(([_, v]) => v !== undefined));

        try {
            await updateDoc(caseRef, sanitizedData);
            
            const fullyUpdatedCaseWithTimestamp = { ...updatedCase, lastUpdate: finalCaseData.lastUpdate };
    
            const newCases = cases.map(c => c.id === caseId ? fullyUpdatedCaseWithTimestamp : c)
                                .sort(caseSorter);
            setCases(newCases);
    
            if (selectedCase?.id === caseId) {
                setSelectedCase(fullyUpdatedCaseWithTimestamp);
            }
            
            if (tasksPanelState.mode === 'single' && tasksPanelState.caseData?.id === caseId) {
                setTasksPanelState({ mode: 'single', caseData: fullyUpdatedCaseWithTimestamp });
            }
    
        } catch (error) {
            console.error("Error updating case in Firestore: ", error);
        }
    };

    const handleDeleteCase = (caseId: string) => {
        const caseToDelete = cases.find(c => c.id === caseId);
        if (!caseToDelete) return;

        const displayName = caseToDelete.nickname ? `${caseToDelete.name} (${caseToDelete.nickname})` : caseToDelete.name;
        requestConfirmation(
            'Eliminar Caso',
            `¿Estás seguro de que quieres eliminar permanentemente el caso de "${displayName}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    await deleteDoc(doc(db, "cases", caseId));
                    setCases(prevCases => prevCases.filter(c => c.id !== caseId));
                    if (selectedCase?.id === caseId) {
                        setSelectedCase(null);
                    }
                } catch (error) {
                    console.error("Error deleting case from Firestore: ", error);
                }
            }
        );
    };
    
    const handleSelectCase = (caseData: Case, view: DashboardView = 'profile') => {
        setStatusFilter(null);
        setSearchQuery('');
        setInitialDashboardView(view);
        setSelectedCase(caseData);
    }
    const handleSelectCaseById = (caseId: string, view: DashboardView = 'profile') => {
        const caseToSelect = cases.find(c => c.id === caseId);
        if (caseToSelect) {
             // Security check: Only allow selection if admin or assigned professional
            if (currentUser && (currentUser.role === 'admin' || caseToSelect.professionalIds?.includes(currentUser.id))) {
                setCurrentView('cases');
                setInitialDashboardView(view);
                setSelectedCase(caseToSelect);
                setTasksPanelState({ mode: 'closed' });
            } else {
                console.warn(`Access denied: User ${currentUser?.id} tried to select case ${caseId}.`);
            }
        }
    };
    const handleBackToCases = () => {
        setSelectedCase(null);
        setInitialDashboardView('profile');
    };

    const handleAddTask = async (caseId: string | null, taskText: string, assignedTo?: string[]) => {
        if (!currentUser) return;
        const newTask: Task = {
            id: `task-${Date.now()}`,
            text: taskText,
            completed: false,
            createdBy: currentUser.id,
            ...(caseId && { assignedTo: assignedTo && assignedTo.length > 0 ? assignedTo : [currentUser.id] }) // Add assignedTo only for case tasks
        };
        if (caseId) {
            const updatedCase = cases.find(c => c.id === caseId);
            if (updatedCase) {
                await handleUpdateCase({ ...updatedCase, tasks: [...updatedCase.tasks, newTask] });
            }
        } else {
            // Add to general tasks
            try {
                const docRef = doc(db, "generalTasks", newTask.id);
                await setDoc(docRef, newTask);
                setGeneralTasks(prevTasks => [...prevTasks, newTask]);
            } catch (error) {
                console.error("Error adding general task:", error);
            }
        }
    };

    const handleUpdateTask = async (caseId: string, updatedTask: Task) => {
        const targetCase = cases.find(c => c.id === caseId);
        if (targetCase) {
            const updatedTasks = targetCase.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
            await handleUpdateCase({ ...targetCase, tasks: updatedTasks });
        }
    };


    const handleOpenQuickNoteModal = (caseData: Case) => {
        setQuickNoteState({ isOpen: true, caseData });
    };

    const handleCloseQuickNoteModal = () => {
        setQuickNoteState({ isOpen: false, caseData: null });
    };

    const handleSaveQuickNote = async (noteContent: string) => {
        if (!quickNoteState.caseData || !currentUser) return;

        const targetCase = cases.find(c => c.id === quickNoteState.caseData!.id);
        if (!targetCase) return;

        const newNote: MyNote = {
            id: `note-${Date.now()}`,
            content: noteContent,
            color: 'yellow', // Default color for quick notes
            createdAt: new Date().toISOString(),
            createdBy: currentUser.id,
        };
        
        const currentNotes = Array.isArray(targetCase.myNotes) ? targetCase.myNotes : [];
        const updatedNotes = [newNote, ...currentNotes];

        await handleUpdateCase({ ...targetCase, myNotes: updatedNotes });

        handleCloseQuickNoteModal();
    };


    const handleToggleTask = (caseId: string, taskId: string) => {
        const updatedCase = cases.find(c => c.id === caseId);
        if (updatedCase) {
            const updatedTasks = updatedCase.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
            handleUpdateCase({ ...updatedCase, tasks: updatedTasks });
        }
    };
    
    const handleDeleteTask = (caseId: string, taskId: string) => {
        const targetCase = cases.find(c => c.id === caseId);
        if (!targetCase) return;
        const taskToDelete = targetCase.tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        requestConfirmation(
            'Eliminar Tarea',
            `¿Estás seguro de que quieres eliminar la tarea "${taskToDelete.text}"? Esta acción no se puede deshacer.`,
            () => {
                const updatedTasks = targetCase.tasks.filter(t => t.id !== taskId);
                handleUpdateCase({ ...targetCase, tasks: updatedTasks });
            }
        );
    };
    
    const handleToggleGeneralTask = async (taskId: string) => {
        const taskToUpdate = generalTasks.find(t => t.id === taskId);
        if (taskToUpdate) {
            const updatedTask = { ...taskToUpdate, completed: !taskToUpdate.completed };
            const taskRef = doc(db, "generalTasks", taskId);
            try {
                await updateDoc(taskRef, { completed: updatedTask.completed });
                setGeneralTasks(generalTasks.map(t => t.id === taskId ? updatedTask : t));
            } catch (error) {
                console.error("Error toggling general task:", error);
            }
        }
    };

    const handleDeleteGeneralTask = (taskId: string) => {
        const taskToDelete = generalTasks.find(t => t.id === taskId);
        if (!taskToDelete) return;
    
        requestConfirmation(
            'Eliminar Tarea General',
            `¿Estás seguro de que quieres eliminar la tarea general "${taskToDelete.text}"? Esta acción no se puede deshacer.`,
            async () => {
                const taskRef = doc(db, "generalTasks", taskId);
                try {
                    await deleteDoc(taskRef);
                    setGeneralTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
                } catch (error) {
                    console.error("Error deleting general task:", error);
                }
            }
        );
    };

    const handleUpdateGeneralTask = async (updatedTask: Task) => {
        const taskRef = doc(db, "generalTasks", updatedTask.id);
        try {
            await updateDoc(taskRef, { text: updatedTask.text });
            setGeneralTasks(generalTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        } catch (error) {
            console.error("Error updating general task:", error);
        }
    };

    const handleSaveTool = async (tool: AdminTool) => {
        const toolRef = doc(db, "adminTools", tool.id);
        try {
            await setDoc(toolRef, tool, { merge: true });
            const toolIndex = adminTools.findIndex(t => t.id === tool.id);
            if (toolIndex > -1) {
                const newTools = [...adminTools];
                newTools[toolIndex] = tool;
                setAdminTools(newTools);
            } else {
                setAdminTools([...adminTools, tool]);
            }
        } catch(error) {
            console.error("Error saving tool to Firestore: ", error);
        }
    };
    
    const handleDeleteTool = async (toolId: string) => {
        requestConfirmation(
            'Eliminar Herramienta',
            '¿Estás seguro de que quieres eliminar esta herramienta? Esta acción no se puede deshacer.',
            async () => {
                try {
                    await deleteDoc(doc(db, "adminTools", toolId));
                    setAdminTools(adminTools.filter(t => t.id !== toolId));
                } catch(error) {
                    console.error("Error deleting tool from Firestore: ", error);
                }
            }
        );
    };

    const handleSaveProfessional = async (professional: Professional) => {
        const profRef = doc(db, "professionals", professional.id);
        try {
            await setDoc(profRef, professional, { merge: true });
            const profIndex = professionals.findIndex(p => p.id === professional.id);
            if (profIndex > -1) {
                const newProfs = [...professionals];
                newProfs[profIndex] = professional;
                setProfessionals(newProfs.sort((a,b) => a.name.localeCompare(b.name)));
            } else {
                setProfessionals([...professionals, professional].sort((a,b) => a.name.localeCompare(b.name)));
            }
        } catch (error) {
            console.error("Error saving professional: ", error);
        }
    };

    const handleDeleteProfessional = (professionalId: string) => {
        const profToDelete = professionals.find(p => p.id === professionalId);
        if (!profToDelete) return;

        requestConfirmation(
            `Eliminar ${profToDelete.role}`,
            `¿Seguro que quieres eliminar a "${profToDelete.name}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    await deleteDoc(doc(db, "professionals", professionalId));
                    setProfessionals(professionals.filter(p => p.id !== professionalId));
                } catch (error) {
                    console.error("Error deleting professional: ", error);
                }
            }
        );
    };

    const handleSaveInterventionRecord = (caseId: string, record: InterventionRecord) => {
         if (!currentUser) return;
         const recordToSave = record.createdBy ? record : { ...record, createdBy: currentUser.id };

         const updatedCase = cases.find(c => c.id === caseId);
         if (updatedCase) {
             const existingRecordIndex = updatedCase.interventionRecords.findIndex(r => r.id === recordToSave.id);
             let newRecords: InterventionRecord[];
             if (existingRecordIndex > -1) {
                 newRecords = [...updatedCase.interventionRecords];
                 newRecords[existingRecordIndex] = recordToSave;
             } else {
                 newRecords = [...updatedCase.interventionRecords, recordToSave];
             }
             handleUpdateCase({ ...updatedCase, interventionRecords: newRecords });
         }
    };

    const handleDeleteInterventionRecord = async (caseId: string, recordId: string) => {
        const updatedCase = cases.find(c => c.id === caseId);
        if (updatedCase) {
            const updatedRecords = updatedCase.interventionRecords.filter(r => r.id !== recordId);
            await handleUpdateCase({ ...updatedCase, interventionRecords: updatedRecords });
        }
    };

    const handleSaveIntervention = async (intervention: Omit<Intervention, 'id'> | Intervention) => {
        if (!currentUser) return;
        const isEditing = 'id' in intervention;
        
        try {
            let finalIntervention: Intervention = isEditing
                ? intervention as Intervention
                : { ...intervention, id: `int-${Date.now()}`, createdBy: currentUser.id, ...(intervention as any) };
            
            finalIntervention = Object.entries(finalIntervention).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    (acc as any)[key] = value;
                }
                return acc;
            }, {} as Intervention);

            const batch = writeBatch(db);

            if (isEditing) {
                const originalCase = cases.find(c => c.interventions.some(i => i.id === finalIntervention.id));
                const wasGeneral = !originalCase && generalInterventions.some(i => i.id === finalIntervention.id);
                
                if (originalCase && originalCase.id !== finalIntervention.caseId) {
                    const updatedInterventions = originalCase.interventions.filter(i => i.id !== finalIntervention.id);
                    batch.update(doc(db, 'cases', originalCase.id), { interventions: updatedInterventions, lastUpdate: new Date().toISOString() });
                } else if (wasGeneral && finalIntervention.caseId) {
                    batch.delete(doc(db, 'generalInterventions', finalIntervention.id));
                }
            }
            
            if (finalIntervention.caseId) {
                const targetCase = cases.find(c => c.id === finalIntervention.caseId);
                if (targetCase) {
                    const updatedInterventions = [...targetCase.interventions.filter(i => i.id !== finalIntervention.id), finalIntervention];
                    batch.update(doc(db, 'cases', targetCase.id), { interventions: updatedInterventions, lastUpdate: new Date().toISOString() });
                }
            } else {
                batch.set(doc(db, 'generalInterventions', finalIntervention.id), finalIntervention);
            }

            await batch.commit();

            let newCases = [...cases];
            let newGeneralInterventions = [...generalInterventions];
            
            if (isEditing) {
                newCases = newCases.map(c => ({...c, interventions: c.interventions.filter(i => i.id !== finalIntervention.id) }));
                newGeneralInterventions = newGeneralInterventions.filter(i => i.id !== finalIntervention.id);
            }
            if (finalIntervention.caseId) {
                const caseIndex = newCases.findIndex(c => c.id === finalIntervention.caseId);
                if (caseIndex > -1) {
                    newCases[caseIndex] = {...newCases[caseIndex], interventions: [...newCases[caseIndex].interventions, finalIntervention], lastUpdate: new Date().toISOString()};
                }
            } else {
                newGeneralInterventions.push(finalIntervention);
            }
            setCases(newCases.sort(caseSorter));
            setGeneralInterventions(newGeneralInterventions);
             if (selectedCase) {
                const updatedSelectedCase = newCases.find(c => c.id === selectedCase.id);
                setSelectedCase(updatedSelectedCase || null);
            }

        } catch (error) {
            console.error("Error saving intervention: ", error);
        }
    };
    
    const handleDeleteIntervention = async (interventionToDelete: Intervention) => {
        try {
            if (interventionToDelete.caseId) {
                const caseRef = doc(db, 'cases', interventionToDelete.caseId);
                const targetCase = cases.find(c => c.id === interventionToDelete.caseId);
                if (targetCase) {
                    const updatedInterventions = targetCase.interventions.filter(i => i.id !== interventionToDelete.id);
                    await updateDoc(caseRef, { interventions: updatedInterventions, lastUpdate: new Date().toISOString() });
                }
            } else {
                await deleteDoc(doc(db, 'generalInterventions', interventionToDelete.id));
            }

            if (interventionToDelete.caseId) {
                const newCases = cases.map(c => c.id === interventionToDelete.caseId ? {...c, interventions: c.interventions.filter(i => i.id !== interventionToDelete.id)} : c);
                setCases(newCases);
                if (selectedCase) {
                    const updatedSelectedCase = newCases.find(c => c.id === selectedCase.id);
                    setSelectedCase(updatedSelectedCase || null);
                }
            } else {
                setGeneralInterventions(prev => prev.filter(i => i.id !== interventionToDelete.id));
            }

        } catch (error) {
            console.error("Error deleting intervention: ", error);
        }
    };
    
    const handleBatchAddInterventions = async (interventionsToAdd: (Omit<Intervention, 'id'>)[]) => {
        if (!currentUser) return;
        const batch = writeBatch(db);
        const newGeneralInterventions: Intervention[] = [];
        const caseUpdates = new Map<string, Intervention[]>();
        const caseNameIdMap = new Map<string, string>(cases.map(c => [c.name.toLowerCase(), c.id]));

        interventionsToAdd.forEach((interventionData, index) => {
            const newId = `int-${Date.now()}-${index}`;
            const finalIntervention: Intervention = { ...interventionData, id: newId, createdBy: currentUser.id } as Intervention;
            
            if (finalIntervention.caseId && !cases.some(c => c.id === finalIntervention.caseId)) {
                const foundId = caseNameIdMap.get(finalIntervention.caseId.toLowerCase());
                finalIntervention.caseId = foundId || null;
            }

            if (finalIntervention.caseId) {
                const updates = caseUpdates.get(finalIntervention.caseId) || [];
                updates.push(finalIntervention);
                caseUpdates.set(finalIntervention.caseId, updates);
            } else {
                const genIntRef = doc(db, "generalInterventions", finalIntervention.id);
                batch.set(genIntRef, finalIntervention);
                newGeneralInterventions.push(finalIntervention);
            }
        });

        caseUpdates.forEach((interventions, caseId) => {
            const caseRef = doc(db, "cases", caseId);
            const targetCase = cases.find(c => c.id === caseId);
            if (targetCase) {
                const updatedInterventions = [...targetCase.interventions, ...interventions];
                batch.update(caseRef, { interventions: updatedInterventions, lastUpdate: new Date().toISOString() });
            }
        });

        await batch.commit();

        setGeneralInterventions(prev => [...prev, ...newGeneralInterventions]);
        
        const newCases = cases.map(c => {
            if (caseUpdates.has(c.id)) {
                return {
                    ...c,
                    interventions: [...c.interventions, ...caseUpdates.get(c.id)!],
                    lastUpdate: new Date().toISOString()
                };
            }
            return c;
        }).sort(caseSorter);

        setCases(newCases);

        if (selectedCase && caseUpdates.has(selectedCase.id)) {
            setSelectedCase(newCases.find(c => c.id === selectedCase.id) || null);
        }
    };

    const handleBatchUpdateInterventions = async (updatedInterventions: Intervention[]) => {
        const batch = writeBatch(db);
        const caseUpdates = new Map<string, Intervention[]>();
        const generalUpdates = new Map<string, Intervention>();
        const movedFromGeneralToCase = new Set<string>();
    
        updatedInterventions.forEach(intervention => {
            const wasGeneral = generalInterventions.some(i => i.id === intervention.id);
            const isNowInCase = !!intervention.caseId;
    
            if (wasGeneral && isNowInCase) {
                movedFromGeneralToCase.add(intervention.id);
                batch.delete(doc(db, 'generalInterventions', intervention.id));
                const caseInterventions = caseUpdates.get(intervention.caseId!) || [];
                caseInterventions.push(intervention);
                caseUpdates.set(intervention.caseId!, caseInterventions);
            } else if (isNowInCase) {
                const caseInterventions = caseUpdates.get(intervention.caseId!) || [];
                caseInterventions.push(intervention);
                caseUpdates.set(intervention.caseId!, caseInterventions);
            } else {
                generalUpdates.set(intervention.id, intervention);
            }
        });
    
        caseUpdates.forEach((interventionsToUpdate, caseId) => {
            const targetCase = cases.find(c => c.id === caseId);
            if (targetCase) {
                const caseRef = doc(db, "cases", caseId);
                const updatedInterventionMap = new Map(interventionsToUpdate.map(i => [i.id, i]));
                
                let newCaseInterventions = targetCase.interventions.map(i => 
                    updatedInterventionMap.get(i.id) || i
                );
    
                interventionsToUpdate.forEach(i => {
                    if (movedFromGeneralToCase.has(i.id) && !targetCase.interventions.some(ci => ci.id === i.id)) {
                        newCaseInterventions.push(i);
                    }
                });
                
                batch.update(caseRef, { interventions: newCaseInterventions, lastUpdate: new Date().toISOString() });
            }
        });
    
        generalUpdates.forEach((intervention, id) => {
            const interventionRef = doc(db, 'generalInterventions', id);
            batch.set(interventionRef, intervention, { merge: true });
        });
    
        await batch.commit();
    
        let newCases = [...cases];
        let newGeneralInterventions = generalInterventions.filter(i => !movedFromGeneralToCase.has(i.id));
    
        caseUpdates.forEach((interventions, caseId) => {
            const caseIndex = newCases.findIndex(c => c.id === caseId);
            if (caseIndex > -1) {
                const targetCase = newCases[caseIndex];
                const updatedInterventionMap = new Map(interventions.map(i => [i.id, i]));
                
                let newCaseInterventions = targetCase.interventions.map(i => 
                    updatedInterventionMap.get(i.id) || i
                );
                
                interventions.forEach(i => {
                    if (movedFromGeneralToCase.has(i.id) && !targetCase.interventions.some(ci => ci.id === i.id)) {
                        newCaseInterventions.push(i);
                    }
                });
                newCases[caseIndex] = { ...targetCase, interventions: newCaseInterventions, lastUpdate: new Date().toISOString() };
            }
        });
    
        newGeneralInterventions = newGeneralInterventions.map(i => generalUpdates.get(i.id) || i);
        
        setCases(newCases.sort(caseSorter));
        setGeneralInterventions(newGeneralInterventions);
    
        if (selectedCase) {
            const updatedSelectedCase = newCases.find(c => c.id === selectedCase.id);
            setSelectedCase(updatedSelectedCase || null);
        }
    };
    
    const handleBatchDeleteInterventions = async (interventionsToDelete: Intervention[]) => {
        const batch = writeBatch(db);
        const caseUpdates = new Map<string, string[]>(); 
        const generalDeletes: string[] = [];
    
        interventionsToDelete.forEach(intervention => {
            if (intervention.caseId) {
                if (!caseUpdates.has(intervention.caseId)) {
                    caseUpdates.set(intervention.caseId, []);
                }
                caseUpdates.get(intervention.caseId)!.push(intervention.id);
            } else {
                generalDeletes.push(intervention.id);
            }
        });
    
        caseUpdates.forEach((interventionIdsToDelete, caseId) => {
            const targetCase = cases.find(c => c.id === caseId);
            if (targetCase) {
                const caseRef = doc(db, "cases", caseId);
                const deleteSet = new Set(interventionIdsToDelete);
                const updatedInterventions = targetCase.interventions.filter(i => !deleteSet.has(i.id));
                batch.update(caseRef, { interventions: updatedInterventions, lastUpdate: new Date().toISOString() });
            }
        });
    
        generalDeletes.forEach(id => {
            const genIntRef = doc(db, "generalInterventions", id);
            batch.delete(genIntRef);
        });
    
        await batch.commit();
    
        let newCases = [...cases];
        caseUpdates.forEach((_, caseId) => {
            const caseIndex = newCases.findIndex(c => c.id === caseId);
            if (caseIndex > -1) {
                const targetCase = newCases[caseIndex];
                const deleteSet = new Set(caseUpdates.get(caseId)!);
                const updatedInterventions = targetCase.interventions.filter(i => !deleteSet.has(i.id));
                newCases[caseIndex] = { ...targetCase, interventions: updatedInterventions, lastUpdate: new Date().toISOString() };
            }
        });
        setCases(newCases.sort(caseSorter));
    
        const generalDeletesSet = new Set(generalDeletes);
        setGeneralInterventions(prev => prev.filter(i => !generalDeletesSet.has(i.id)));
        
        if (selectedCase) {
            const updatedSelectedCase = newCases.find(c => c.id === selectedCase.id);
            setSelectedCase(updatedSelectedCase || null);
        }
    };

    const handleTogglePin = (caseToToggle: Case) => {
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const firstUnpinnedIndex = activeCases.findIndex(c => !c.isPinned);
        
        let newOrderIndex: number;
        const isPinning = !caseToToggle.isPinned;

        if (isPinning) {
            const lastPinnedCase = firstUnpinnedIndex > 0 ? activeCases[firstUnpinnedIndex - 1] : null;
            newOrderIndex = (lastPinnedCase?.orderIndex ?? 0) + 1000;
        } else {
            const firstUnpinnedCase = activeCases.find(c => !c.isPinned && c.id !== caseToToggle.id);
            newOrderIndex = (firstUnpinnedCase?.orderIndex ?? Date.now()) - 1000;
        }

        const updatedCase = { ...caseToToggle, isPinned: isPinning, orderIndex: newOrderIndex };
        handleUpdateCase(updatedCase);
    };

    const handleDrop = (targetItem: Case) => {
        if (!draggedItem || draggedItem.id === targetItem.id || draggedItem.isPinned !== targetItem.isPinned) {
            setDraggedItem(null);
            return;
        }
    
        const listToReorder = cases.filter(c => c.isPinned === draggedItem.isPinned && c.status !== CaseStatus.Closed).sort(caseSorter);
        const otherCases = cases.filter(c => c.isPinned !== draggedItem.isPinned || c.status === CaseStatus.Closed);
    
        const draggedIndex = listToReorder.findIndex(c => c.id === draggedItem.id);
        const targetIndex = listToReorder.findIndex(c => c.id === targetItem.id);
    
        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedItem(null);
            return;
        }
    
        const reorderedList = [...listToReorder];
        const [removed] = reorderedList.splice(draggedIndex, 1);
        reorderedList.splice(targetIndex, 0, removed);
    
        const newIndexInReorderedList = reorderedList.findIndex(c => c.id === draggedItem.id);
        const prevItem = reorderedList[newIndexInReorderedList - 1];
        const nextItem = reorderedList[newIndexInReorderedList + 1];
    
        let newOrderIndex: number;
        if (!prevItem) {
            newOrderIndex = (nextItem?.orderIndex ?? 0) - 1000;
        } else if (!nextItem) {
            newOrderIndex = (prevItem?.orderIndex ?? 0) + 1000;
        } else {
            newOrderIndex = ((prevItem?.orderIndex ?? 0) + (nextItem?.orderIndex ?? 0)) / 2;
        }
    
        const updatedCaseForDb = { ...draggedItem, orderIndex: newOrderIndex };
        
        // Optimistically update local state for a smooth UI response
        const finalReorderedList = reorderedList.map(c => 
            c.id === draggedItem.id ? { ...c, orderIndex: newOrderIndex } : c
        );
        setCases([...finalReorderedList, ...otherCases]);
    
        // Persist the change to Firestore without causing a re-sort in handleUpdateCase
        const caseRef = doc(db, "cases", updatedCaseForDb.id);
        const { id, ...caseToUpdate } = updatedCaseForDb;
        const finalCaseDataForDb = { ...caseToUpdate, lastUpdate: updatedCaseForDb.lastUpdate }; // Keep original lastUpdate
    
        const sanitizedDataForDb = Object.fromEntries(Object.entries(finalCaseDataForDb).filter(([_, v]) => v !== undefined));

        updateDoc(caseRef, sanitizedDataForDb).catch(error => {
            console.error("Error persisting drag-and-drop update:", error);
            // Optional: Revert state if DB update fails by fetching data again or rolling back the change
            setCases(cases); // Simple rollback
        });
        
        setDraggedItem(null);
    };
    

    const renderContent = () => {
        if (!currentUser) return null;
        if (isLoading) {
            return (
                <div className="text-center py-20">
                    <h2 className="text-xl font-semibold text-slate-700">Cargando datos...</h2>
                </div>
            )
        }
        if (selectedCase) {
            return <CaseDashboard 
                        caseData={selectedCase} 
                        onBack={handleBackToCases} 
                        onUpdateCase={handleUpdateCase}
                        onUpdateTask={handleUpdateTask}
                        onDeleteCase={handleDeleteCase}
                        onAddTask={handleAddTask}
                        onToggleTask={handleToggleTask}
                        onDeleteTask={handleDeleteTask}
                        onOpenTasks={() => setTasksPanelState({ mode: 'single', caseData: selectedCase })}
                        adminTools={adminTools}
                        professionals={professionals}
                        onSaveInterventionRecord={handleSaveInterventionRecord}
                        onDeleteInterventionRecord={handleDeleteInterventionRecord}
                        onSaveIntervention={handleSaveIntervention}
                        onDeleteIntervention={handleDeleteIntervention}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
                        requestConfirmation={requestConfirmation}
                        taskToConvert={taskToConvert}
                        onConversionHandled={() => setTaskToConvert(null)}
                        initialView={initialDashboardView}
                        currentUser={currentUser}
                        cases={cases}
                        onSelectCaseById={handleSelectCaseById}
                        onOpenGenogramViewer={handleOpenGenogramViewer}
                    />;
        }

        switch (currentView) {
            case 'admin':
                 if (currentUser?.role !== 'admin') {
                    return (
                        <div className="text-center py-20">
                            <h2 className="text-xl font-semibold text-slate-700">Acceso Denegado</h2>
                            <p className="text-slate-500 mt-2">No tienes permisos para acceder a esta sección.</p>
                        </div>
                    );
                }
                return <AdminDashboard 
                            tools={adminTools} 
                            onSaveTool={handleSaveTool} 
                            onDeleteTool={handleDeleteTool} 
                            professionals={professionals}
                            onSaveProfessional={handleSaveProfessional}
                            onDeleteProfessional={handleDeleteProfessional}
                            cases={cases}
                            onBatchAddInterventions={handleBatchAddInterventions}
                            generalInterventions={generalInterventions}
                            onSaveIntervention={handleSaveIntervention}
                            onBatchUpdateInterventions={handleBatchUpdateInterventions}
                            onDeleteIntervention={handleDeleteIntervention}
                            onBatchDeleteInterventions={handleBatchDeleteInterventions}
                            requestConfirmation={requestConfirmation}
                        />;
            case 'calendar':
                return <CalendarView 
                            cases={visibleCases} 
                            generalInterventions={generalInterventions}
                            onSaveIntervention={handleSaveIntervention}
                            onDeleteIntervention={handleDeleteIntervention}
                            onSelectCaseById={handleSelectCaseById}
                            requestConfirmation={requestConfirmation}
                            currentUser={currentUser}
                        />;
            case 'cases':
            default:
                const activeCases = visibleCases.filter(c => c.status !== CaseStatus.Closed);
                const closedCases = visibleCases.filter(c => c.status === CaseStatus.Closed);

                const searchFilter = (c: Case) => searchQuery
                    ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (c.nickname && c.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
                    : true;
                
                let displayedActiveCases = activeCases.filter(searchFilter);
                let displayedClosedCases = closedCases.filter(searchFilter);

                let showActiveSection = true;
                let showClosedSection = true;

                if (statusFilter) {
                    if (statusFilter === CaseStatus.Closed) {
                        showActiveSection = false;
                        displayedClosedCases = closedCases.filter(c => c.status === statusFilter).filter(searchFilter);
                    } else {
                        showClosedSection = false;
                        displayedActiveCases = activeCases.filter(c => c.status === statusFilter).filter(searchFilter);
                    }
                }
                
                const pinnedCases = displayedActiveCases.filter(c => c.isPinned);
                const unpinnedCases = displayedActiveCases.filter(c => !c.isPinned);

                const totalResults = pinnedCases.length + unpinnedCases.length + displayedClosedCases.length;

                const isDisplayingOnlyClosed = statusFilter === CaseStatus.Closed;

                const getNoResultsMessage = () => {
                    if (searchQuery) return { title: 'No se encontraron casos', message: 'Prueba a modificar los términos de tu búsqueda.' };
                    if (statusFilter) return { title: 'No hay casos con este estado', message: 'Prueba a limpiar el filtro o selecciona otro estado.' };
                    if (currentUser.role === 'admin') {
                        return { title: 'No hay casos todavía', message: 'Crea un nuevo caso para empezar a trabajar.' };
                    }
                    return { title: 'No tienes casos asignados', message: 'Crea un nuevo caso para empezar o contacta a un administrador.' };
                };
                
                const renderCaseList = (caseList: Case[]) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {caseList.map((caseData, index) => (
                            <AnimatedSection key={caseData.id} delay={index * 50}>
                                <div 
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => handleDrop(caseData)}
                                    className="h-full"
                                >
                                    <CaseCard 
                                        caseData={caseData}
                                        professionals={professionals}
                                        onSelect={handleSelectCase} 
                                        onOpenTasks={(caseData) => setTasksPanelState({ mode: 'single', caseData })}
                                        onSetStatusFilter={setStatusFilter}
                                        onTogglePin={() => handleTogglePin(caseData)}
                                        onAddQuickNote={handleOpenQuickNoteModal}
                                        draggable={true}
                                        onDragStart={() => setDraggedItem(caseData)}
                                        onDragEnd={() => setDraggedItem(null)}
                                        isDragging={draggedItem?.id === caseData.id}
                                    />
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                );
                
                return (
                    <div className="container mx-auto px-4 py-8">
                        <h2 className="text-3xl font-bold text-slate-800 mb-6">Mesa de Trabajo</h2>
                        
                        <div className="relative mb-8">
                            <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
                            <input
                                type="text"
                                placeholder="Buscar caso por nombre o apodo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-white text-slate-900 placeholder:text-slate-500 border-slate-300 focus:ring-teal-500 shadow-sm"
                            />
                        </div>
                        
                        {!statusFilter && !searchQuery && visibleCases.length > 0 && (
                            <div className="mb-12">
                                <CaseStatsDashboard 
                                    cases={visibleCases} 
                                    professionals={professionals}
                                    generalInterventions={generalInterventions}
                                    generalTasks={currentUserGeneralTasks}
                                    onSelectCaseById={handleSelectCaseById} 
                                    onSetStatusFilter={setStatusFilter}
                                    onOpenAllTasks={() => setTasksPanelState({ mode: 'all' })}
                                    onSaveIntervention={handleSaveIntervention}
                                    onDeleteIntervention={handleDeleteIntervention}
                                    requestConfirmation={requestConfirmation}
                                    currentUser={currentUser}
                                />
                            </div>
                        )}
                        {(statusFilter || searchQuery) && (
                            <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                                <h3 className="font-semibold text-teal-800">
                                    {totalResults} {totalResults === 1 ? 'resultado' : 'resultados'} para los filtros activos.
                                </h3>
                                <button
                                    onClick={handleClearFilters}
                                    className="flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
                                >
                                    <IoCloseCircleOutline className="text-xl" />
                                    Limpiar Filtros
                                </button>
                            </div>
                        )}
                        {displayedActiveCases.length > 0 || displayedClosedCases.length > 0 ? (
                            <div className="space-y-12">
                                {showActiveSection && (
                                     <div>
                                        {pinnedCases.length > 0 && (
                                            <div className="mb-12">
                                                <h2 className="text-2xl font-bold text-slate-700 mb-6 pb-4 border-b border-slate-200 flex items-center gap-2"><BsPinAngleFill className="text-teal-600"/> Casos Fijados</h2>
                                                {renderCaseList(pinnedCases)}
                                            </div>
                                        )}
                                        <h2 className="text-2xl font-bold text-slate-700 mb-6 pb-4 border-b border-slate-200">Mis Casos</h2>
                                        {unpinnedCases.length > 0 ? (
                                            renderCaseList(unpinnedCases)
                                        ) : (
                                            <p className="text-slate-500 italic">No hay casos activos que coincidan con la búsqueda.</p>
                                        )}
                                     </div>
                                )}
                                
                                {showClosedSection && displayedClosedCases.length > 0 && (
                                    <div>
                                        <button
                                            onClick={() => !isDisplayingOnlyClosed && setIsClosedCasesVisible(prev => !prev)}
                                            className="w-full flex justify-between items-center text-left text-2xl font-bold text-slate-700 mb-6 pb-4 border-b border-slate-200 group disabled:cursor-default"
                                            disabled={isDisplayingOnlyClosed}
                                        >
                                            <span>Casos Cerrados ({displayedClosedCases.length})</span>
                                            {!isDisplayingOnlyClosed && (
                                                <IoChevronDownOutline className={`text-2xl text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${isClosedCasesVisible ? 'rotate-180' : ''}`} />
                                            )}
                                        </button>
                                        {(isClosedCasesVisible || isDisplayingOnlyClosed) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {displayedClosedCases.map((caseData, index) => (
                                                    <AnimatedSection key={caseData.id} delay={index * 50}>
                                                        <CaseCard 
                                                            caseData={caseData}
                                                            professionals={professionals}
                                                            onSelect={handleSelectCase} 
                                                            onOpenTasks={(caseData) => setTasksPanelState({ mode: 'single', caseData })}
                                                            onSetStatusFilter={setStatusFilter}
                                                            onTogglePin={() => handleTogglePin(caseData)}
                                                            onAddQuickNote={handleOpenQuickNoteModal}
                                                            draggable={false}
                                                        />
                                                    </AnimatedSection>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-20 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200">
                                <h2 className="text-xl font-semibold text-slate-700">{getNoResultsMessage().title}</h2>
                                <p className="text-slate-500 mt-2">{getNoResultsMessage().message}</p>
                                <button
                                    onClick={() => setIsNewCaseModalOpen(true)}
                                    className="mt-6 inline-flex items-center justify-center bg-teal-600 text-white w-14 h-14 rounded-full hover:bg-teal-700 font-semibold shadow-lg transition-transform hover:scale-105"
                                    title="Crear Nuevo Caso"
                                >
                                    <IoAddOutline className="text-3xl" />
                                </button>
                            </div>
                        )}
                    </div>
                );
        }
    };

    if (!currentUser) {
        const systemUsers = professionals.filter(p => p.isSystemUser);
        return <Login professionals={systemUsers} onLogin={handleLogin} />;
    }

    if (viewingGenogramUrl) {
        return <GenogramViewer imageUrl={viewingGenogramUrl} onClose={handleCloseGenogramViewer} />;
    }

    const BANNER_HEIGHT = '3.5rem';

    return (
        <div className="bg-slate-50 min-h-screen">
            <Header 
                onNewCase={() => setIsNewCaseModalOpen(true)} 
                onNewTask={() => setIsNewTaskModalOpen(true)}
                currentView={currentView} 
                onSetView={handleSetView}
                isCaseView={!!selectedCase}
                isSidebarCollapsed={isSidebarCollapsed}
                currentUser={currentUserProfessional}
                onLogout={handleLogout}
                onOpenProfile={() => setIsProfileModalOpen(true)}
            />
             {authError && (
                <div 
                    className="fixed left-0 right-0 bg-amber-100 border-b border-amber-300 text-amber-900 p-3 text-center text-sm z-20 flex justify-center items-center gap-4"
                    style={{ top: '4rem', height: BANNER_HEIGHT }}
                >
                    <IoWarningOutline className="text-2xl text-amber-600 flex-shrink-0" />
                    <span className="flex-grow text-left font-medium">{authError}</span>
                    <button onClick={() => setAuthError(null)} className="p-1 rounded-full hover:bg-amber-200">
                        <IoCloseOutline className="text-2xl text-amber-700" />
                    </button>
                </div>
            )}
            <main className={authError ? "pt-[calc(7.5rem+env(safe-area-inset-top))]" : "pt-[calc(4rem+env(safe-area-inset-top))]"}>
                {renderContent()}
            </main>
            <NewCaseModal 
                isOpen={isNewCaseModalOpen} 
                onClose={() => setIsNewCaseModalOpen(false)} 
                onAddCase={handleAddCase} 
            />
            <NewTaskModal
                isOpen={isNewTaskModalOpen}
                onClose={() => setIsNewTaskModalOpen(false)}
                onAddTask={handleAddTask}
                cases={visibleCases}
                professionals={professionals}
                currentUser={currentUser}
            />
            <TasksSidePanel
                mode={tasksPanelState.mode}
                caseData={tasksPanelState.caseData}
                allCases={visibleCases}
                generalTasks={currentUserGeneralTasks}
                professionals={professionals}
                onClose={() => setTasksPanelState({ mode: 'closed' })}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                onToggleGeneralTask={handleToggleGeneralTask}
                onDeleteGeneralTask={handleDeleteGeneralTask}
                onUpdateGeneralTask={handleUpdateGeneralTask}
                onTaskToEntry={setTaskToConvert}
                onSelectCaseById={handleSelectCaseById}
                currentUser={currentUser}
            />
             <ConfirmationModal
                isOpen={!!confirmationState?.isOpen}
                onClose={handleCloseConfirmation}
                onConfirm={confirmationState?.onConfirm || (() => {})}
                title={confirmationState?.title || ''}
                message={confirmationState?.message || ''}
            />
            <QuickNoteModal
                isOpen={quickNoteState.isOpen}
                onClose={handleCloseQuickNoteModal}
                onSave={handleSaveQuickNote}
                caseName={quickNoteState.caseData?.nickname ? `${quickNoteState.caseData?.name} (${quickNoteState.caseData?.nickname})` : quickNoteState.caseData?.name || ''}
            />
            {currentUserProfessional && (
                 <ProfileEditorModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSave={handleSaveProfessional}
                    currentUser={currentUserProfessional}
                />
            )}
        </div>
    );
};

export default App;