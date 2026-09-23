
import React from 'react';

export interface User {
    id: string; // Corresponds to the Professional ID
    name: string;
    role: 'admin' | 'tecnico';
    avatar?: string;
}

export enum CaseStatus {
    PendingReferral = 'Derivación Pendiente',
    Welcome = 'Acogida',
    CoDiagnosis = 'Co-Diagnóstico',
    SharedPlanning = 'Planificación Compartida',
    Accompaniment = 'Acompañamiento',
    FollowUp = 'Seguimiento',
    Closed = 'Cerrado',
}

export enum InterventionMoment {
    Referral = 'Derivación',
    Welcome = 'Acogida',
    Diagnosis = 'Diagnóstico',
    Planning = 'Planificación',
    Accompaniment = 'Acompañamiento',
}

export enum FieldType {
    Text = 'Texto Corto',
    Textarea = 'Texto Largo',
    Date = 'Fecha',
    Checkbox = 'Checkbox',
    Select = 'Selección',
}

export type AutoFillSource = 'name' | 'nickname' | 'dni' | 'phone' | 'email' | 'address';

export enum InterventionType {
    // Case-specific types
    HomeVisit = 'Visita Domiciliaria',
    PhoneCall = 'Llamada Telefónica',
    Meeting = 'Entrevista', // Renamed from "Reunión" to avoid conflict, used as specific interview
    Workshop = 'Taller',
    Administrative = 'Gestión Administrativa',
    Coordination = 'Coordinación',
    PsychologicalSupport = 'Apoyo Psicológico',
    GroupSession = 'Sesión Grupal',
    Accompaniment = 'Acompañamiento Externo',
    Other = 'Otro',

    // General types
    Reunion = 'Reunión',
    AssessmentInterview = 'Entrevista de Valoración',
    ElaborarMemoria = 'Elaborar Memoria',
    ElaborarDocumento = 'Elaborar Documento',
    Fiesta = 'Fiesta',
    Vacaciones = 'Vacaciones',
    Viaje = 'Viaje',
    CursoFormacion = 'Curso de Formación',
}


export enum InterventionStatus {
    Planned = 'Planificada',
    Completed = 'Completada',
    Cancelled = 'Anulada',
}

export enum ProfessionalRole {
    SocialWorker = 'Trabajador/a Social',
    EdisTechnician = 'Técnico/a EDIS',
    Edis1 = 'Técnico/a EDIS 1',
    Edis2 = 'Técnico/a EDIS 2',
    Administrator = 'Administrador/a',
}

/**
 * Comprueba si un rol corresponde a un técnico del equipo EDIS (EDIS 1, EDIS 2 o EDIS General)
 */
export const isEdisTechnicianRole = (role?: ProfessionalRole | string | null): boolean => {
    if (!role) return false;
    return role === ProfessionalRole.EdisTechnician || 
           role === ProfessionalRole.Edis1 || 
           role === ProfessionalRole.Edis2 ||
           role === 'Técnico/a EDIS' ||
           role === 'Técnico/a EDIS 1' ||
           role === 'Técnico/a EDIS 2' ||
           role === 'EDIS 1' ||
           role === 'EDIS 2' ||
           role === 'EDIS';
};

/**
 * Comprueba si un profesional forma parte activa del equipo técnico EDIS (excluye Administradores puros y Trabajadores Sociales)
 */
export const isEdisProfessional = (p?: Professional | { role: ProfessionalRole | string; isSystemUser?: boolean } | null): boolean => {
    if (!p) return false;
    if (p.role === ProfessionalRole.SocialWorker || p.role === ProfessionalRole.Administrator || p.role === 'Administrador/a' || p.role === 'Trabajador/a Social') {
        return false;
    }
    return isEdisTechnicianRole(p.role) || (p.isSystemUser === true && p.role !== ProfessionalRole.Administrator);
};

/**
 * Obtiene el subequipo EDIS de un profesional ('EDIS 1', 'EDIS 2', 'EDIS General' o null)
 */
export const getProfessionalEdisSubteam = (p?: Professional | { role?: ProfessionalRole | string } | null): 'EDIS 1' | 'EDIS 2' | 'EDIS General' | null => {
    if (!p || !p.role) return null;
    if (p.role === ProfessionalRole.Edis1 || p.role === 'Técnico/a EDIS 1' || p.role === 'EDIS 1') return 'EDIS 1';
    if (p.role === ProfessionalRole.Edis2 || p.role === 'Técnico/a EDIS 2' || p.role === 'EDIS 2') return 'EDIS 2';
    if (isEdisTechnicianRole(p.role)) return 'EDIS General';
    return null;
};

export interface Professional {
    id: string;
    name: string;
    role: ProfessionalRole;
    ceas?: string;
    phone?: string;
    email?: string;
    isSystemUser?: boolean; // Can this professional log in?
    systemRole?: 'admin' | 'tecnico'; // If they can log in, what is their role?
    avatar?: string; // Base64 encoded image
    password?: string; // User's login password
}

export interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdBy?: string;
    assignedTo?: string[]; // IDs of the professionals it's assigned to
}

export interface ToolField {
    id: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    options?: string[];
    autoFillSource?: AutoFillSource;
}

export interface AdminTool {
    id: string;
    name: string;
    description: string;
    moment: InterventionMoment;
    fields: ToolField[];
    documentTemplate?: string;
}

export interface Intervention {
    id: string;
    title: string;
    interventionType: InterventionType;
    start: string; // ISO string
    end: string; // ISO string
    isAllDay: boolean;
    notes: string;
    isRegistered: boolean; // if it should appear in the notebook
    isShared?: boolean; // If true (default), visible to teammates. If false, teammates only see 'Ocupado'
    caseId: string | null; // null if it's a general intervention
    status: InterventionStatus;
    cancellationTime?: string; // ISO string
    createdBy?: string;
    assignedTo?: string[];
    createdAt?: string; // ISO string
    updatedAt?: string; // ISO string
    updatedBy?: string; // ID of technician who created or last modified
}

export interface InterventionRecord {
    id: string;
    toolId: string;
    toolName: string;
    moment: InterventionMoment;
    date: string; // ISO string
    answers: Record<string, any>;
    createdBy?: string;
}

export interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    birthDate: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    isFamily: boolean;
    isConflictual: boolean;
    caseIdLink?: string;
}

export interface MyNote {
    id: string;
    content: string;
    color: 'yellow' | 'pink' | 'blue' | 'green';
    createdAt: string; // ISO string
    createdBy?: string;
    assignedTo?: string[]; // IDs of professionals to whom the note is directed or assigned
}

export interface Case {
    id: string;
    name: string;
    status: CaseStatus;
    lastUpdate: string; // ISO string
    interventions: Intervention[];
    tasks: Task[];
    nickname?: string;
    dni: string;
    phone: string;
    email: string;
    address: string;
    profileNotes: string;
    myNotes?: MyNote[];
    familyGrid: FamilyMember[];
    interventionRecords: InterventionRecord[];
    professionalIds?: string[];
    isPinned?: boolean; // Deprecated legacy boolean
    pinnedBy?: string[]; // Professional IDs of technicians who pinned this case
    orderIndex?: number;
    createdBy?: string;
    genogramImage?: string; // URL to image in Cloudinary
    genogramImageDeleteToken?: string; // Token for deleting image from Cloudinary
}

export type DashboardView = 'profile' | 'referral' | 'welcome' | 'tasks' | 'diagnosis' | 'planning' | 'accompaniment' | 'reports' | 'notebook' | 'professionals' | 'myNotes';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}