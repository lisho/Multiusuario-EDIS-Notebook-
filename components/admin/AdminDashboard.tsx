import React, { useState, useMemo } from 'react';
import { AdminTool, InterventionMoment, Professional, ProfessionalRole, Case, Intervention } from '../../types';
import TemplateEditor from './TemplateEditor';
import ProfessionalEditorModal from './ProfessionalEditorModal';
import CsvImportModal from './CsvImportModal';
import InterventionManager from './InterventionManager';
import NewEventModal from '../NewEventModal';
import AdminStatsDashboard from './AdminStatsDashboard';
import { IoAddOutline, IoPencilOutline, IoTrashOutline, IoPeopleOutline, IoConstructOutline, IoBriefcaseOutline, IoChevronDownOutline, IoCloudUploadOutline, IoCalendarOutline, IoBarChartOutline } from 'react-icons/io5';

interface AdminDashboardProps {
  tools: AdminTool[];
  onSaveTool: (tool: AdminTool) => void;
  onDeleteTool: (toolId: string) => void;
  professionals: Professional[];
  onSaveProfessional: (professional: Professional) => void;
  onDeleteProfessional: (professionalId: string) => void;
  cases: Case[];
  onBatchAddInterventions: (interventions: (Omit<Intervention, 'id'>)[]) => Promise<void>;
  generalInterventions: Intervention[];
  onSaveIntervention: (intervention: Omit<Intervention, 'id'> | Intervention) => void;
  onBatchUpdateInterventions: (interventions: Intervention[]) => Promise<void>;
  onDeleteIntervention: (intervention: Intervention) => void;
  onBatchDeleteInterventions: (interventions: Intervention[]) => Promise<void>;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
}

type AdminTab = 'tools' | 'professionals' | 'interventions' | 'stats';

const momentConfig = {
    [InterventionMoment.Referral]: { title: 'Derivación', description: 'Herramientas para registrar la derivación del caso.' },
    [InterventionMoment.Welcome]: { title: 'Acogida', description: 'Herramientas para la primera toma de contacto.' },
    [InterventionMoment.Diagnosis]: { title: 'Diagnóstico', description: 'Instrumentos para evaluar la situación.' },
    [InterventionMoment.Planning]: { title: 'Planificación', description: 'Plantillas para definir objetivos y acciones.' },
    [InterventionMoment.Accompaniment]: { title: 'Acompañamiento', description: 'Recursos para el seguimiento continuo.' },
};

const ProfessionalSection: React.FC<{
    title: string;
    professionals: Professional[];
    isUserSection?: boolean;
    onAdd: () => void;
    onEdit: (prof: Professional) => void;
    onDelete: (id: string) => void;
}> = ({ title, professionals, isUserSection = false, onAdd, onEdit, onDelete }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <button
                onClick={onAdd}
                className="bg-teal-50 text-teal-700 w-10 h-10 rounded-lg hover:bg-teal-100 font-semibold flex items-center justify-center gap-2 transition-colors border border-teal-200"
                title={`Añadir ${title}`}
            >
                <IoAddOutline className="text-2xl" />
            </button>
        </div>
        <div className="space-y-3 pt-4 border-t border-slate-200">
            {professionals.length > 0 ? (
                professionals.map(prof => (
                    <div key={prof.id} className="bg-slate-50 p-3 rounded-md border border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <IoPeopleOutline className="text-slate-500 text-2xl"/>
                            <div>
                                <h3 className="font-semibold text-slate-700">
                                    {prof.name}
                                    {isUserSection && prof.systemRole === 'admin' && (
                                        <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Admin</span>
                                    )}
                                </h3>
                                {prof.role === ProfessionalRole.SocialWorker && prof.ceas && (
                                    <p className="text-xs text-slate-500">{prof.ceas}</p>
                                )}
                                 {isUserSection && !prof.isSystemUser && (
                                    <p className="text-xs font-semibold text-red-600">Acceso deshabilitado</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(prof)} className="text-slate-500 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors" title="Editar"><IoPencilOutline className="text-md" /></button>
                            <button onClick={() => onDelete(prof.id)} className="text-slate-500 hover:text-red-600 p-1.5 rounded-full hover:bg-red-100 transition-colors" title="Eliminar"><IoTrashOutline className="text-md" /></button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-sm text-slate-500 py-4">No hay profesionales de este tipo.</p>
            )}
        </div>
    </div>
);

// FIX: Changed to a named export to resolve the "Module has no default export" error.
export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { tools, onSaveTool, onDeleteTool, professionals, onSaveProfessional, onDeleteProfessional, cases, onBatchAddInterventions, generalInterventions, onSaveIntervention, onBatchUpdateInterventions, onDeleteIntervention, onBatchDeleteInterventions, requestConfirmation } = props;
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<AdminTool | null>(null);
  const [defaultMoment, setDefaultMoment] = useState<InterventionMoment>(InterventionMoment.Welcome);

  const [isProfEditorOpen, setIsProfEditorOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [defaultRole, setDefaultRole] = useState<ProfessionalRole>(ProfessionalRole.SocialWorker);
  
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  
  const [expandedCeas, setExpandedCeas] = useState<Record<string, boolean>>({});
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);

  const allInterventions = useMemo(() => {
    const caseInterventions = cases.flatMap(c => c.interventions);
    return [...caseInterventions, ...generalInterventions];
  }, [cases, generalInterventions]);

  const categorizedTools = useMemo(() => {
    return tools.reduce((acc, tool) => {
      (acc[tool.moment] = acc[tool.moment] || []).push(tool);
      return acc;
    }, {} as Record<InterventionMoment, AdminTool[]>);
  }, [tools]);

  const socialWorkers = useMemo(() => professionals.filter(p => p.role === ProfessionalRole.SocialWorker), [professionals]);
  const edisTechnicians = useMemo(() => professionals.filter(p => p.role === ProfessionalRole.EdisTechnician), [professionals]);

  const socialWorkersByCeas = useMemo(() => {
    const grouped: Record<string, Professional[]> = {};
    socialWorkers.forEach(prof => {
        const ceas = prof.ceas || 'Sin CEAS Asignado';
        if (!grouped[ceas]) {
            grouped[ceas] = [];
        }
        grouped[ceas].push(prof);
    });
    // Sort by CEAS name, putting "Sin CEAS Asignado" at the end
    return Object.entries(grouped).sort(([ceasA], [ceasB]) => {
         if (ceasA === 'Sin CEAS Asignado') return 1;
         if (ceasB === 'Sin CEAS Asignado') return -1;
         return ceasA.localeCompare(ceasB);
    });
  }, [socialWorkers]);

  const handleOpenEditor = (tool: AdminTool | null, moment: InterventionMoment) => {
    setEditingTool(tool);
    setDefaultMoment(moment);
    setIsEditorOpen(true);
  };
  
  const handleSaveAndClose = (tool: AdminTool) => {
    onSaveTool(tool);
    setIsEditorOpen(false);
  }

  const handleOpenProfEditor = (professional: Professional | null, role: ProfessionalRole) => {
    setEditingProfessional(professional);
    setDefaultRole(role);
    setIsProfEditorOpen(true);
  };

  const handleSaveProfAndClose = (professional: Professional) => {
      onSaveProfessional(professional);
      setIsProfEditorOpen(false);
  }

  const toggleCeas = (ceas: string) => {
    setExpandedCeas(prev => ({
        ...prev,
        [ceas]: !(prev[ceas] ?? true) // Default to true (expanded)
    }));
  };
  
    const handleOpenEditIntervention = (intervention: Intervention) => {
        setEditingIntervention(intervention);
    };

    const handleCloseEditInterventionModal = () => {
        setEditingIntervention(null);
    };

  const TabButton: React.FC<{ tab: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = ({ tab, label, icon: Icon }) => {
    const isActive = activeTab === tab;
    return (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                isActive 
                ? 'border-teal-500 text-teal-600' 
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
        >
            <Icon className="text-xl" />
            {label}
        </button>
    )
  }

  return (
    <>
        <div className="container mx-auto px-4 py-8">
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex gap-6">
                    <TabButton tab="stats" label="Estadísticas" icon={IoBarChartOutline} />
                    <TabButton tab="tools" label="Caja de Herramientas" icon={IoConstructOutline} />
                    <TabButton tab="professionals" label="Gestor de Profesionales" icon={IoBriefcaseOutline} />
                    <TabButton tab="interventions" label="Intervenciones" icon={IoCalendarOutline} />
                </nav>
            </div>
        
            <div className="mt-8">
                {activeTab === 'stats' && (
                    <AdminStatsDashboard 
                        cases={cases}
                        professionals={professionals}
                        allInterventions={allInterventions}
                    />
                )}

                {activeTab === 'tools' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                                <h2 className="text-xl font-bold text-slate-800">Herramientas de Intervención</h2>
                                <p className="text-sm text-slate-600 mt-1">Define plantillas para los distintos momentos del proceso de intervención.</p>
                            </div>
                            {(Object.keys(momentConfig) as InterventionMoment[]).map(moment => (
                            <div key={moment} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-3">
                                <h3 className="text-lg font-semibold text-slate-800">{momentConfig[moment].title}</h3>
                                <div className="space-y-2">
                                    {(categorizedTools[moment] || []).map(tool => (
                                        <div key={tool.id} className="bg-slate-50 p-2 rounded-md border border-slate-200 flex justify-between items-center">
                                            <span className="font-medium text-sm text-slate-700">{tool.name}</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleOpenEditor(tool, moment)} className="text-slate-500 hover:text-teal-600 p-1 rounded-full hover:bg-slate-200 transition-colors" title="Editar"><IoPencilOutline/></button>
                                                <button onClick={() => onDeleteTool(tool.id)} className="text-slate-500 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors" title="Eliminar"><IoTrashOutline /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleOpenEditor(null, moment)} className="w-full bg-slate-100 text-slate-700 h-9 rounded-md hover:bg-slate-200 font-semibold flex items-center justify-center gap-2 transition-colors text-sm">
                                    <IoAddOutline /> Añadir
                                </button>
                            </div>
                            ))}
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <IoCloudUploadOutline />
                                    Importación Masiva
                                </h2>
                                <p className="text-sm text-slate-600 mt-1">Carga eventos en el calendario de forma masiva desde un archivo CSV con ayuda de la IA.</p>
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <button
                                        onClick={() => setIsCsvImportModalOpen(true)}
                                        className="w-full bg-teal-50 text-teal-700 h-10 rounded-lg hover:bg-teal-100 font-semibold flex items-center justify-center gap-2 transition-colors border border-teal-200"
                                    >
                                        Importar Eventos desde CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'professionals' && (
                    <div className="space-y-8">
                        <ProfessionalSection
                            title="Usuarios del Sistema (Técnicos EDIS)"
                            professionals={edisTechnicians}
                            isUserSection={true}
                            onAdd={() => handleOpenProfEditor(null, ProfessionalRole.EdisTechnician)}
                            onEdit={(prof) => handleOpenProfEditor(prof, ProfessionalRole.EdisTechnician)}
                            onDelete={onDeleteProfessional}
                        />
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Trabajadores/as Sociales (Contactos)</h2>
                                <button
                                    onClick={() => handleOpenProfEditor(null, ProfessionalRole.SocialWorker)}
                                    className="bg-teal-50 text-teal-700 w-10 h-10 rounded-lg hover:bg-teal-100 font-semibold flex items-center justify-center gap-2 transition-colors border border-teal-200"
                                    title="Añadir Trabajador/a Social"
                                >
                                    <IoAddOutline className="text-2xl" />
                                </button>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-slate-200">
                                {socialWorkersByCeas.length > 0 ? (
                                    socialWorkersByCeas.map(([ceas, profs]) => {
                                        const isExpanded = expandedCeas[ceas] ?? true;
                                        return (
                                            <div key={ceas} className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                                                <button
                                                    onClick={() => toggleCeas(ceas)}
                                                    className="w-full flex justify-between items-center text-left"
                                                    aria-expanded={isExpanded}
                                                >
                                                    <h3 className="font-semibold text-teal-700 text-md">{ceas} ({profs.length})</h3>
                                                    <IoChevronDownOutline className={`text-xl text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isExpanded && (
                                                    <div className="mt-3 space-y-3 pt-3 border-t border-slate-200">
                                                        {profs.map(prof => (
                                                            <div key={prof.id} className="bg-white p-3 rounded-md border border-slate-200 flex justify-between items-center">
                                                                <div className="flex items-center gap-3">
                                                                    <IoPeopleOutline className="text-slate-500 text-2xl"/>
                                                                    <div>
                                                                        <h3 className="font-semibold text-slate-700">{prof.name}</h3>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleOpenProfEditor(prof, prof.role)} className="text-slate-500 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors" title="Editar"><IoPencilOutline className="text-md" /></button>
                                                                    <button onClick={() => onDeleteProfessional(prof.id)} className="text-slate-500 hover:text-red-600 p-1.5 rounded-full hover:bg-red-100 transition-colors" title="Eliminar"><IoTrashOutline className="text-md" /></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="text-center text-sm text-slate-500 py-4">No hay Trabajadores/as Sociales. Añade uno para empezar.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'interventions' && (
                    <InterventionManager
                        allInterventions={allInterventions}
                        cases={cases}
                        onSaveIntervention={onSaveIntervention as (intervention: Intervention) => void}
                        onBatchUpdateInterventions={onBatchUpdateInterventions as (interventions: Intervention[]) => void}
                        onBatchDeleteInterventions={onBatchDeleteInterventions as (interventions: Intervention[]) => void}
                        onEditIntervention={handleOpenEditIntervention}
                        requestConfirmation={requestConfirmation}
                    />
                )}
            </div>
        
            <TemplateEditor 
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveAndClose}
                initialData={editingTool}
                defaultMoment={defaultMoment}
            />
            <ProfessionalEditorModal 
                isOpen={isProfEditorOpen}
                onClose={() => setIsProfEditorOpen(false)}
                onSave={handleSaveProfAndClose}
                initialData={editingProfessional}
                defaultRole={defaultRole}
            />
            <CsvImportModal
                isOpen={isCsvImportModalOpen}
                onClose={() => setIsCsvImportModalOpen(false)}
                onImport={onBatchAddInterventions}
                cases={cases}
            />
            <NewEventModal
                isOpen={!!editingIntervention}
                onClose={handleCloseEditInterventionModal}
                itemData={editingIntervention}
                cases={cases}
                onSaveIntervention={onSaveIntervention}
                onDeleteIntervention={onDeleteIntervention}
                requestConfirmation={requestConfirmation}
            />
        </>
    );
};