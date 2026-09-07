import { collection, onSnapshot, getDocs, query, Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { Case, Professional, Intervention, Task, MyNote, AdminTool, ProfessionalRole } from "../types";

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export interface SyncEngineCallbacks {
    onCasesUpdated: (cases: Case[]) => void;
    onProfessionalsUpdated: (professionals: Professional[]) => void;
    onGeneralInterventionsUpdated: (interventions: Intervention[]) => void;
    onGeneralTasksUpdated: (tasks: Task[]) => void;
    onGeneralNotesUpdated: (notes: MyNote[]) => void;
    onAdminToolsUpdated: (tools: AdminTool[]) => void;
    onStatusChange: (status: SyncStatus, lastSyncedAt: Date) => void;
    onError: (error: any) => void;
}

/**
 * Normaliza y migra datos de profesionales
 */
export function normalizeProfessionals(docs: { id: string; data: () => any }[]): Professional[] {
    return docs.map(doc => {
        const data = doc.data();
        const prof: Professional = { id: doc.id, ...data } as Professional;

        if (prof.role === ProfessionalRole.EdisTechnician) {
            if (prof.isSystemUser === undefined) {
                prof.isSystemUser = true;
            }
            if (prof.isSystemUser && !prof.systemRole) {
                prof.systemRole = prof.name === 'Lisho' ? 'admin' : 'tecnico';
            }
        } else {
            if (prof.isSystemUser === undefined) {
                prof.isSystemUser = false;
            }
        }

        if (prof.systemRole === 'admin' && !prof.password) {
            prof.password = 'admin';
        }

        return prof;
    }).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Normaliza y migra datos de casos (intervenciones, notas, tareas)
 */
export function normalizeCases(docs: { id: string; data: () => any }[], lishoId?: string): Case[] {
    return docs.map(doc => {
        const rawData = doc.data();
        const caseData = { id: doc.id, ...rawData } as Case;

        let processedInterventions: Intervention[] = [];
        if (Array.isArray(caseData.interventions)) {
            const seenIntIds = new Set<string>();
            processedInterventions = caseData.interventions.filter(i => {
                if (!i || !i.id) return false;
                if (seenIntIds.has(i.id)) return false;
                seenIntIds.add(i.id);
                return true;
            });
        }
        caseData.interventions = processedInterventions;
        if (!caseData.tasks) caseData.tasks = [];
        if (!caseData.interventionRecords) caseData.interventionRecords = [];
        if (!caseData.familyGrid) caseData.familyGrid = [];

        if (lishoId) {
            caseData.interventions = caseData.interventions.map(i => ({
                ...i,
                createdBy: i.createdBy || lishoId
            }));

            caseData.tasks = caseData.tasks.map(t => {
                const migratedTask = { ...t, createdBy: t.createdBy || lishoId };
                if (typeof migratedTask.assignedTo === 'string') {
                    // @ts-ignore
                    migratedTask.assignedTo = [migratedTask.assignedTo];
                }
                return migratedTask;
            });

            let processedNotes: MyNote[] = [];
            if (Array.isArray(caseData.myNotes)) {
                const seenNoteIds = new Set<string>();
                processedNotes = caseData.myNotes
                    .filter(n => {
                        if (!n || !n.id) return false;
                        if (seenNoteIds.has(n.id)) return false;
                        seenNoteIds.add(n.id);
                        return true;
                    })
                    .map(n => ({ ...n, createdBy: n.createdBy || lishoId }));
            } else if (typeof caseData.myNotes === 'string' && (caseData.myNotes as string).trim() !== '') {
                processedNotes = [{
                    id: `note-${doc.id}-${Date.now()}`,
                    content: caseData.myNotes as string,
                    color: 'yellow',
                    createdAt: new Date().toISOString(),
                    createdBy: lishoId
                }];
            }
            caseData.myNotes = processedNotes;

            caseData.interventionRecords = caseData.interventionRecords.map(r => ({
                ...r,
                createdBy: r.createdBy || lishoId
            }));
        }

        return caseData;
    });
}

/**
 * Motor de sincronización en tiempo real desacoplado y reactivo.
 * Se conecta a la base de datos y escucha cambios automáticos de otros técnicos.
 * Listo para ser reemplazado fácilmente si se migra a backend SQL/REST/WebSockets.
 */
export function setupRealtimeSync(callbacks: SyncEngineCallbacks): () => void {
    const unsubscribers: Unsubscribe[] = [];
    let currentLishoId: string | undefined = undefined;

    const reportStatus = (status: SyncStatus) => {
        callbacks.onStatusChange(status, new Date());
    };

    reportStatus('syncing');

    // 1. Suscripción en tiempo real a Profesionales
    try {
        const unsubProfs = onSnapshot(
            collection(db, "professionals"),
            (snapshot) => {
                const profs = normalizeProfessionals(snapshot.docs);
                const lisho = profs.find(p => p.name === 'Lisho');
                currentLishoId = lisho?.id;
                callbacks.onProfessionalsUpdated(profs);
                reportStatus('connected');
            },
            (error) => {
                console.error("Error en sincronización en tiempo real de profesionales:", error);
                callbacks.onError(error);
                reportStatus('error');
            }
        );
        unsubscribers.push(unsubProfs);
    } catch (e) {
        console.error("Error al iniciar listener de profesionales:", e);
    }

    // 2. Suscripción en tiempo real a Casos
    try {
        const unsubCases = onSnapshot(
            query(collection(db, "cases")),
            (snapshot) => {
                const cases = normalizeCases(snapshot.docs, currentLishoId);
                callbacks.onCasesUpdated(cases);
                reportStatus('connected');
            },
            (error) => {
                console.error("Error en sincronización en tiempo real de casos:", error);
                callbacks.onError(error);
                reportStatus('error');
            }
        );
        unsubscribers.push(unsubCases);
    } catch (e) {
        console.error("Error al iniciar listener de casos:", e);
    }

    // 3. Suscripción en tiempo real a Herramientas de administración
    try {
        const unsubTools = onSnapshot(
            collection(db, "adminTools"),
            (snapshot) => {
                const tools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminTool[];
                callbacks.onAdminToolsUpdated(tools);
            },
            (error) => {
                console.error("Error en sincronización de herramientas:", error);
            }
        );
        unsubscribers.push(unsubTools);
    } catch (e) {
        console.error("Error al iniciar listener de herramientas:", e);
    }

    // 4. Suscripción en tiempo real a Intervenciones generales
    try {
        const unsubGenInt = onSnapshot(
            collection(db, "generalInterventions"),
            (snapshot) => {
                const seenGenIds = new Set<string>();
                const genInterventions = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdBy: doc.data().createdBy || currentLishoId,
                    }))
                    .filter(i => {
                        if (!i || !i.id) return false;
                        if (seenGenIds.has(i.id)) return false;
                        seenGenIds.add(i.id);
                        return true;
                    }) as Intervention[];
                callbacks.onGeneralInterventionsUpdated(genInterventions);
            },
            (error) => {
                console.error("Error en sincronización de intervenciones generales:", error);
            }
        );
        unsubscribers.push(unsubGenInt);
    } catch (e) {
        console.error("Error al iniciar listener de intervenciones generales:", e);
    }

    // 5. Suscripción en tiempo real a Tareas generales
    try {
        const unsubGenTasks = onSnapshot(
            collection(db, "generalTasks"),
            (snapshot) => {
                const genTasks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdBy: doc.data().createdBy || currentLishoId,
                })) as Task[];
                callbacks.onGeneralTasksUpdated(genTasks);
            },
            (error) => {
                console.error("Error en sincronización de tareas generales:", error);
            }
        );
        unsubscribers.push(unsubGenTasks);
    } catch (e) {
        console.error("Error al iniciar listener de tareas generales:", e);
    }

    // 6. Suscripción en tiempo real a Notas generales
    try {
        const unsubGenNotes = onSnapshot(
            collection(db, "generalNotes"),
            (snapshot) => {
                const genNotes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdBy: doc.data().createdBy || currentLishoId,
                })) as MyNote[];
                callbacks.onGeneralNotesUpdated(genNotes);
            },
            (error) => {
                console.error("Error en sincronización de notas generales:", error);
            }
        );
        unsubscribers.push(unsubGenNotes);
    } catch (e) {
        console.error("Error al iniciar listener de notas generales:", e);
    }

    // 7. Manejo automático de recuperación de foco de ventana y estado de red
    const handleFocusOrOnline = () => {
        if (navigator.onLine) {
            reportStatus('connected');
        } else {
            reportStatus('offline');
        }
    };

    const handleOffline = () => {
        reportStatus('offline');
    };

    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);
    window.addEventListener('offline', handleOffline);

    // Función de limpieza completa
    return () => {
        unsubscribers.forEach(unsub => {
            try {
                unsub();
            } catch (err) {
                // ignore clean up error
            }
        });
        window.removeEventListener('focus', handleFocusOrOnline);
        window.removeEventListener('online', handleFocusOrOnline);
        window.removeEventListener('offline', handleOffline);
    };
}
