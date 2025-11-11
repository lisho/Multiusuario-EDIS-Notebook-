import React from 'react';

export interface User {
    id: string; // Corresponds to the Professional ID
    name: string;
    role: 'admin' | 'tecnico';
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
}

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
}

export interface AdminTool {
    id: string;
    name: string;
    description: string;
    moment: InterventionMoment;
    fields: ToolField[];
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
    caseId: string | null; // null if it's a general intervention
    status: InterventionStatus;
    cancellationTime?: string; // ISO string
    createdBy?: string;
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
    isPinned?: boolean;
    orderIndex?: number;
    createdBy?: string;
    genogramImage?: string; // URL to image in Cloudinary
    genogramImageDeleteToken?: string; // Token to delete image from Cloudinary
}

export type DashboardView = 'profile' | 'referral' | 'welcome' | 'tasks' | 'diagnosis' | 'planning' | 'accompaniment' | 'reports' | 'notebook' | 'professionals' | 'myNotes';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}