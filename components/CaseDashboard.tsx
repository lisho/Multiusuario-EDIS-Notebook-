import React, { useState, useCallback, useEffect } from 'react';
import { Intervention, Case, CaseStatus, Task, InterventionType, AdminTool, InterventionMoment, InterventionRecord, InterventionStatus, Professional, DashboardView, User } from '../types';
import NewEventModal from './NewEventModal';
import AiInsightModal from './AiInsightModal';
import ProfileView from './ProfileView';
import TasksView from './TasksView';
import TimelineNotebookView from './TimelineNotebookView';
import MyNotesView from './MyNotesView';
import RelationalEnvView from './RelationalEnvView';
import InterventionMomentView from './InterventionMomentView';
import ProfessionalTeamView from './ProfessionalTeamView';
import ToolRunnerModal from './ToolRunnerModal';
import AiExplorationSidePanel from './AiExplorationSidePanel';
import { 
    IoAppsOutline, 
    IoPersonCircleOutline, 
    IoHomeOutline, 
    IoBeakerOutline, 
    IoMapOutline,
    IoBriefcaseOutline,
    IoBookOutline, 
    IoCheckboxOutline, 
    IoStatsChartOutline, 
    IoChevronForwardCircleOutline, 
    IoChevronBackCircleOutline, 
    IoMenuOutline, 
    IoChatbubblesOutline, 
    IoSparklesOutline, 
    IoAddOutline,
    IoWalkOutline,
    IoJournalOutline,
    IoFileTrayFullOutline
} from 'react-icons/io5';

type DiagnosisTab = 'tools' | 'relational';

const getStatusStyles = (status: CaseStatus): string => {
    switch (status) {
        case CaseStatus.PendingReferral: return 'bg-slate-200 text-slate-800 border-slate-300';
        case CaseStatus.Welcome: return 'bg-teal-100 text-teal-800 border-teal-200';
        case CaseStatus.CoDiagnosis: return 'bg-sky-100 text-sky-800 border-sky-200';
        case CaseStatus.SharedPlanning: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case CaseStatus.Accompaniment: return 'bg-teal-200 text-teal-900 border-teal-300';
        case CaseStatus.FollowUp: return 'bg-cyan-100 text-cyan-800 border-cyan-200';
        case CaseStatus.Closed: return 'bg-zinc-200 text-zinc-800 border-zinc-300';
        default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
};

interface CaseDashboardProps {
    caseData: Case;
    onBack: () => void;
    onUpdateCase: (updatedCase: Case) => void;
    onUpdateTask: (caseId: string, updatedTask: Task) => void;
    onDeleteCase: (caseId: string) => void;
    onAddTask: (caseId: string, taskText: string, assignedTo?: string[]) => void;
    onToggleTask: (caseId: string, taskId: string) => void;
    onDeleteTask: (caseId: string, taskId: string) => void;
    onOpenTasks: () => void;
    adminTools: AdminTool[];
    professionals: Professional[];
    onSaveInterventionRecord: (caseId: string, record: InterventionRecord) => void;
    onDeleteInterventionRecord: (caseId: string, recordId: string) => void;
    onSaveIntervention: (intervention: Omit<Intervention, 'id'> | Intervention) => void;
    onDeleteIntervention: (intervention: Intervention) => void;
    isSidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
    taskToConvert?: Task | null;
    onConversionHandled?: () => void;
    initialView: DashboardView;
    currentUser: User;
    cases: Case[];
    onSelectCaseById: (caseId: string, view: DashboardView) => void;
    onOpenGenogramViewer: (url: string) => void;
}

const CaseDashboard: React.FC<CaseDashboardProps> = (props) => {
    const { caseData, onBack, onUpdateCase, onUpdateTask, onDeleteCase, adminTools, onSaveInterventionRecord, onDeleteInterventionRecord, onOpenTasks, isSidebarCollapsed, onToggleSidebar, requestConfirmation, taskToConvert, onConversionHandled, initialView, currentUser, cases, onSelectCaseById, onOpenGenogramViewer } = props;
    const [activeView, setActiveView] = useState<DashboardView>(initialView);
    const [diagnosisTab, setDiagnosisTab] = useState<DiagnosisTab>('relational');
    
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventModalState, setEventModalState] = useState<{
        item: Intervention | null;
        initialValues?: Partial<Intervention>;
    }>({ item: null, initialValues: undefined });
    
    const [isAiInsightModalOpen, setIsAiInsightModalOpen] = useState(false);
    const [toolRunnerState, setToolRunnerState] = useState<{ tool: AdminTool; recordToEdit?: InterventionRecord } | null>(null);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    useEffect(() => {
        setActiveView(initialView);
    }, [initialView, caseData.id]);

    const momentMap: Partial<Record<DashboardView, InterventionMoment>> = {
        'referral': InterventionMoment.Referral,
        'welcome': InterventionMoment.Welcome,
        'diagnosis': InterventionMoment.Diagnosis,
        'planning': InterventionMoment.Planning,
        'accompaniment': InterventionMoment.Accompaniment,
    };
    const currentMoment = momentMap[activeView];

    const handleStatusChange = (newStatus: CaseStatus) => {
        const updatedCase = { ...caseData, status: newStatus };
        onUpdateCase(updatedCase);
    };
    
    const handleCloseEventModal = () => {
        setIsEventModalOpen(false);
        setEventModalState({item: null, initialValues: undefined});
    };
    
    const handleOpenNewEventModal = () => {
        setEventModalState({ item: null, initialValues: undefined });
        setIsEventModalOpen(true);
    };
    
    const handleOpenEditIntervention = (intervention: Intervention) => {
        setEventModalState({ item: intervention, initialValues: undefined });
        setIsEventModalOpen(true);
    };

    const handleTaskToEntry = useCallback((task: Task) => {
        setEventModalState({
            item: null, 
            initialValues: {
                title: `Tarea: ${task.text}`,
                interventionType: InterventionType.Accompaniment,
                notes: `Se ha trabajado sobre la tarea: "${task.text}".\n\n(Añade aquí más detalles sobre la intervención realizada)`,
                isRegistered: true,
                status: InterventionStatus.Completed,
                caseId: caseData.id,
            }
        });
        setIsEventModalOpen(true);
    }, [caseData.id]);
    
    useEffect(() => {
        if (taskToConvert && onConversionHandled) {
            handleTaskToEntry(taskToConvert);
            onConversionHandled();
        }
    }, [taskToConvert, onConversionHandled, handleTaskToEntry]);

    const handleRunTool = (tool: AdminTool, recordToEdit?: InterventionRecord) => {
        setToolRunnerState({ tool, recordToEdit });
    };

    const handleSaveRecord = (answers: Record<string, any>) => {
        if (!toolRunnerState) return;

        const { tool, recordToEdit } = toolRunnerState;

        if (recordToEdit) {
            const updatedRecord = { ...recordToEdit, answers, date: new Date().toISOString() };
            onSaveInterventionRecord(caseData.id, updatedRecord);
        } else {
            const newRecord: InterventionRecord = {
                id: `rec-${Date.now()}`,
                toolId: tool.id,
                toolName: tool.name,
                moment: tool.moment,
                date: new Date().toISOString(),
                answers,
                createdBy: currentUser.id,
            };
            onSaveInterventionRecord(caseData.id, newRecord);
        }
        setToolRunnerState(null);
    };
    
    const handleViewChange = (view: DashboardView) => {
        if (view === 'diagnosis' && activeView !== 'diagnosis') {
            setDiagnosisTab('relational');
        }
        setActiveView(view);
        setIsMobileSidebarOpen(false);
    };

    const NavItem: React.FC<{ view: DashboardView; label: string; icon: React.ComponentType<{ className?: string }>; isCollapsed: boolean }> = ({ view, label, icon: Icon, isCollapsed }) => (
        <button
            onClick={() => handleViewChange(view)}
            className={`w-full flex items-center gap-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeView === view
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            } ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
            title={isCollapsed ? label : ''}
        >
            <Icon className="text-xl w-6 h-6 flex-shrink-0" />
            {!isCollapsed && <span>{label}</span>}
        </button>
    );
    
    const NavHeader: React.FC<{title: string, isCollapsed: boolean}> = ({ title, isCollapsed }) => {
        if (isCollapsed) {
            return <hr className="border-t border-slate-700 my-2" />;
        }
        return <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400 tracking-wider px-4">{title}</h3>
    }

    const renderContent = () => {
        const interventionRecords = caseData.interventionRecords || [];
        switch (activeView) {
            case 'profile':
                return <ProfileView caseData={caseData} onUpdateCase={onUpdateCase} onDeleteCase={onDeleteCase} onOpenGenogramViewer={onOpenGenogramViewer} requestConfirmation={requestConfirmation} />;
            case 'referral':
                return <InterventionMomentView 
                            moment={InterventionMoment.Referral}
                            availableTools={adminTools.filter(t => t.moment === InterventionMoment.Referral)}
                            records={interventionRecords.filter(r => r.moment === InterventionMoment.Referral)}
                            onRunTool={handleRunTool}
                            onDeleteRecord={(recordId) => onDeleteInterventionRecord(caseData.id, recordId)}
                            requestConfirmation={requestConfirmation}
                        />;
            case 'welcome':
                return <InterventionMomentView 
                            moment={InterventionMoment.Welcome}
                            availableTools={adminTools.filter(t => t.moment === InterventionMoment.Welcome)}
                            records={interventionRecords.filter(r => r.moment === InterventionMoment.Welcome)}
                            onRunTool={handleRunTool}
                            onDeleteRecord={(recordId) => onDeleteInterventionRecord(caseData.id, recordId)}
                            requestConfirmation={requestConfirmation}
                        />
            case 'diagnosis':
                const TabButton: React.FC<{ tab: DiagnosisTab, label: string }> = ({ tab, label }) => {
                    const isActive = diagnosisTab === tab;
                    return (
                        <button
                            onClick={() => setDiagnosisTab(tab)}
                            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                                isActive 
                                ? 'border-teal-500 text-teal-600' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            {label}
                        </button>
                    )
                }

                return (
                    <div>
                        <div className="border-b border-slate-200">
                            <nav className="-mb-px flex gap-6">
                                <TabButton tab="relational" label="Ámbito Relacional" />
                                <TabButton tab="tools" label="Herramientas" />
                            </nav>
                        </div>
                        <div className="mt-6">
                        {diagnosisTab === 'tools' ? (
                            <InterventionMomentView 
                                moment={InterventionMoment.Diagnosis}
                                availableTools={adminTools.filter(t => t.moment === InterventionMoment.Diagnosis)}
                                records={interventionRecords.filter(r => r.moment === InterventionMoment.Diagnosis)}
                                onRunTool={handleRunTool}
                                onDeleteRecord={(recordId) => onDeleteInterventionRecord(caseData.id, recordId)}
                                requestConfirmation={requestConfirmation}
                            />
                        ) : (
                            <RelationalEnvView
                                caseData={caseData}
                                onUpdateCase={onUpdateCase}
                                requestConfirmation={requestConfirmation}
                                cases={cases}
                                onSelectCaseById={onSelectCaseById}
                            />
                        )}
                        </div>
                    </div>
                );
            case 'planning':
                 return <InterventionMomentView 
                            moment={InterventionMoment.Planning}
                            availableTools={adminTools.filter(t => t.moment === InterventionMoment.Planning)}
                            records={interventionRecords.filter(r => r.moment === InterventionMoment.Planning)}
                            onRunTool={handleRunTool}
                            onDeleteRecord={(recordId) => onDeleteInterventionRecord(caseData.id, recordId)}
                            requestConfirmation={requestConfirmation}
                        />
            case 'accompaniment':
                 return <InterventionMomentView 
                            moment={InterventionMoment.Accompaniment}
                            availableTools={adminTools.filter(t => t.moment === InterventionMoment.Accompaniment)}
                            records={interventionRecords.filter(r => r.moment === InterventionMoment.Accompaniment)}
                            onRunTool={handleRunTool}
                            onDeleteRecord={(recordId) => onDeleteInterventionRecord(caseData.id, recordId)}
                            requestConfirmation={requestConfirmation}
                        />
            case 'professionals':
                return <ProfessionalTeamView
                            caseData={caseData}
                            professionals={props.professionals}
                            onUpdateCase={onUpdateCase}
                        />;
            case 'tasks':
                return <TasksView 
                    tasks={caseData.tasks}
                    onAddTask={(taskText, assignedTo) => props.onAddTask(caseData.id, taskText, assignedTo)}
                    onToggleTask={(taskId) => props.onToggleTask(caseData.id, taskId)}
                    onDeleteTask={(taskId) => props.onDeleteTask(caseData.id, taskId)}
                    onTaskToEntry={handleTaskToEntry}
                    professionals={props.professionals}
                    caseData={caseData}
                    onUpdateTask={(updatedTask) => onUpdateTask(caseData.id, updatedTask)}
                    currentUser={currentUser}
                />;
            case 'notebook':
                return <TimelineNotebookView 
                            interventions={caseData.interventions} 
                            onEditIntervention={handleOpenEditIntervention} 
                            onDeleteIntervention={props.onDeleteIntervention}
                            requestConfirmation={requestConfirmation}
                        />;
            case 'myNotes':
                return <MyNotesView caseData={caseData} onUpdateCase={onUpdateCase} requestConfirmation={requestConfirmation} currentUser={currentUser} />;
            case 'reports':
                 return (
                    <div className="p-8 bg-white rounded-lg shadow">
                      <h2 className="text-2xl font-bold text-slate-800 mb-4">Informes</h2>
                      <p className="text-slate-500">Esta sección estará disponible próximamente.</p>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <>
            {isMobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
                    onClick={() => setIsMobileSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
            )}
            <aside className={`bg-slate-800 text-white flex flex-col transition-transform duration-300 ease-in-out fixed top-0 bottom-0 left-0 z-50 ${isSidebarCollapsed ? 'w-20' : 'w-64'} ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className={`h-16 flex-shrink-0 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-4'}`}>
                    <button 
                        onClick={onBack} 
                        className={`flex items-center gap-2 text-sm text-slate-300 hover:text-white font-semibold transition-colors w-full text-left ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        title={isSidebarCollapsed ? 'Todos los casos' : ''}
                    >
                        <IoAppsOutline className="text-lg" />
                        {!isSidebarCollapsed && <span>Todos los casos</span>}
                    </button>
                </div>
                
                <div className="flex-grow flex flex-col overflow-y-auto">
                    <nav className="flex flex-col flex-grow gap-4 p-2">
                        <NavItem view="profile" label="Perfil de la Persona" icon={IoPersonCircleOutline} isCollapsed={isSidebarCollapsed}/>
                        <NavItem view="professionals" label="Equipo Profesional" icon={IoBriefcaseOutline} isCollapsed={isSidebarCollapsed}/>
                        
                        <div>
                            <NavHeader title="Momentos de la intervención" isCollapsed={isSidebarCollapsed} />
                            <div className="flex flex-col gap-2">
                                <NavItem view="referral" label="Derivación" icon={IoFileTrayFullOutline} isCollapsed={isSidebarCollapsed}/>
                                <NavItem view="welcome" label="Acogida" icon={IoHomeOutline} isCollapsed={isSidebarCollapsed}/>
                                <NavItem view="diagnosis" label="Diagnóstico" icon={IoBeakerOutline} isCollapsed={isSidebarCollapsed}/>
                                <NavItem view="planning" label="Planificación" icon={IoMapOutline} isCollapsed={isSidebarCollapsed}/>
                                <NavItem view="accompaniment" label="Acompañamiento" icon={IoWalkOutline} isCollapsed={isSidebarCollapsed}/>
                            </div>
                        </div>
                            
                        <div className="mt-auto pt-4">
                            <NavHeader title="Herramientas" isCollapsed={isSidebarCollapsed} />
                            <div className="flex flex-col gap-2">
                                <NavItem view="notebook" label="Cuaderno de Campo" icon={IoBookOutline} isCollapsed={isSidebarCollapsed}/>
                                <NavItem view="myNotes" label="Mis Notas" icon={IoJournalOutline} isCollapsed={isSidebarCollapsed}/>
                                <NavItem view="tasks" label="Tareas" icon={IoCheckboxOutline} isCollapsed={isSidebarCollapsed}/>
                                <NavItem view="reports" label="Informes" icon={IoStatsChartOutline} isCollapsed={isSidebarCollapsed}/>
                            </div>
                        </div>
                    </nav>
                    <div className="mt-4 p-2 pt-4 border-t border-slate-700">
                        <button 
                            onClick={onToggleSidebar} 
                            className={`w-full flex items-center gap-3 py-2.5 text-sm font-medium rounded-md transition-colors text-slate-300 hover:bg-slate-700/50 hover:text-white ${isSidebarCollapsed ? 'justify-center' : ''} hidden md:flex`}
                            title={isSidebarCollapsed ? 'Expandir' : 'Colapsar'}
                        >
                            {isSidebarCollapsed ? 
                                <IoChevronForwardCircleOutline className={`text-2xl transition-transform duration-300`} /> : 
                                <IoChevronBackCircleOutline className={`text-2xl transition-transform duration-300`} />
                            }
                            {!isSidebarCollapsed && <span>Colapsar</span>}
                        </button>
                    </div>
                </div>
            </aside>

            <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
                <div className="p-4 sm:p-8">
                    <header className="flex flex-col md:flex-row justify-between items-start mb-8">
                        <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                            <button 
                                className="md:hidden p-2 text-slate-700 bg-slate-100 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
                                onClick={() => setIsMobileSidebarOpen(true)}
                                aria-label="Abrir menú"
                            >
                                <IoMenuOutline className="text-2xl" />
                            </button>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                                    {caseData.name}
                                    {caseData.nickname && <strong className="ml-3 text-slate-600">({caseData.nickname})</strong>}
                                </h2>
                                <div className="mt-2">
                                    <select
                                        value={caseData.status}
                                        onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                                        className={`text-sm font-semibold border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${getStatusStyles(caseData.status)}`}
                                    >
                                        {Object.values(CaseStatus).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-start md:justify-end gap-2 w-full md:w-auto">
                            {currentMoment && (
                                <button 
                                    onClick={() => setIsAiPanelOpen(true)}
                                    className="bg-white text-teal-600 border border-teal-300 w-10 h-10 rounded-lg hover:bg-teal-50 font-medium flex items-center justify-center transition-colors"
                                    title="Exploración IA"
                                >
                                    <IoChatbubblesOutline className="text-xl" />
                                </button>
                            )}
                            <button 
                                onClick={() => setIsAiInsightModalOpen(true)}
                                className="bg-teal-50 text-teal-600 border border-teal-300 w-10 h-10 rounded-lg hover:bg-teal-100 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                disabled={caseData.interventions.filter(i => i.isRegistered).length === 0}
                                title="Análisis IA"
                            >
                                <IoSparklesOutline className="text-xl" />
                            </button>
                            <button
                                onClick={onOpenTasks}
                                className="bg-white text-teal-600 border border-teal-300 w-10 h-10 rounded-lg hover:bg-teal-50 font-medium flex items-center justify-center transition-colors"
                                title="Mostrar Tareas"
                            >
                                <IoCheckboxOutline className="text-xl" />
                            </button>
                            <button
                                onClick={handleOpenNewEventModal}
                                className="bg-teal-600 text-white w-10 h-10 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors"
                                title="Nueva Entrada"
                            >
                                <IoAddOutline className="text-2xl" />
                            </button>
                        </div>
                    </header>
                    
                    {renderContent()}
                </div>
            </div>

            <NewEventModal
                isOpen={isEventModalOpen}
                onClose={handleCloseEventModal}
                itemData={eventModalState.item || eventModalState.initialValues}
                cases={[caseData]}
                onSaveIntervention={props.onSaveIntervention}
                onDeleteIntervention={props.onDeleteIntervention}
                requestConfirmation={requestConfirmation}
            />

            <AiInsightModal
                isOpen={isAiInsightModalOpen}
                onClose={() => setIsAiInsightModalOpen(false)}
                interventions={caseData.interventions.filter(i => i.isRegistered)}
            />
            {toolRunnerState && (
                <ToolRunnerModal 
                    isOpen={!!toolRunnerState}
                    onClose={() => setToolRunnerState(null)}
                    onSave={handleSaveRecord}
                    tool={toolRunnerState.tool}
                    initialAnswers={toolRunnerState.recordToEdit?.answers}
                />
            )}
             <AiExplorationSidePanel 
                isOpen={isAiPanelOpen}
                onClose={() => setIsAiPanelOpen(false)}
                caseData={caseData}
                moment={currentMoment}
            />
        </>
    );
};

export default CaseDashboard;