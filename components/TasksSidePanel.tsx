import React, { useState, useMemo } from 'react';
import { Case, Task, Professional, DashboardView, User } from '../types';
import { IoCloseOutline, IoAddOutline, IoTrashOutline, IoArrowRedoOutline, IoChevronForwardCircleOutline } from 'react-icons/io5';

interface TaskItemProps {
    task: Task;
    onToggle: () => void;
    onDelete: () => void;
    onConvertToEntry: () => void;
    professionals: Professional[];
    caseName?: string;
    onSelectCase?: () => void;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onConvertToEntry, professionals, caseName, onSelectCase }) => {
    const assignedProfs = (task.assignedTo || [])
        .map(id => professionals.find(p => p.id === id))
        .filter(Boolean) as Professional[];

    return (
        <div className="flex items-start gap-3 p-2.5 bg-white rounded-lg border border-slate-200 group">
            <input
                type="checkbox"
                checked={task.completed}
                onChange={onToggle}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0"
            />
            <div className="flex-grow">
                <p className={`text-sm text-slate-800 ${task.completed ? 'line-through text-slate-500' : ''}`}>{task.text}</p>
                {caseName && (
                     <button onClick={onSelectCase} className="text-xs font-semibold text-teal-700 hover:underline">{caseName}</button>
                )}
                <div className="flex items-center gap-1 mt-1 -space-x-1">
                     {assignedProfs.map(p => (
                         <div key={p.id} className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[10px] border border-white overflow-hidden transition-transform duration-200 hover:scale-150 hover:z-10" title={p.name}>
                            {p.avatar ? (
                                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{getInitials(p.name)}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {!task.completed && (
                    <button onClick={onConvertToEntry} className="p-1 text-slate-400 hover:text-teal-600 rounded-full hover:bg-slate-100" title="Convertir en Entrada">
                        <IoArrowRedoOutline />
                    </button>
                )}
                <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100" title="Eliminar Tarea">
                    <IoTrashOutline />
                </button>
            </div>
        </div>
    );
};


interface TasksSidePanelProps {
    mode: 'closed' | 'single' | 'all';
    caseData?: Case;
    allCases: Case[];
    generalTasks: Task[];
    professionals: Professional[];
    onClose: () => void;
    onAddTask: (caseId: string | null, taskText: string, assignedTo?: string[]) => void;
    onToggleTask: (caseId: string, taskId: string) => void;
    onDeleteTask: (caseId: string, taskId: string) => void;
    onToggleGeneralTask: (taskId: string) => void;
    onDeleteGeneralTask: (taskId: string) => void;
    onTaskToEntry: (task: Task) => void;
    onSelectCaseById: (caseId: string, view: DashboardView) => void;
    currentUser: User | null;
}

const TasksSidePanel: React.FC<TasksSidePanelProps> = (props) => {
    const { mode, caseData, allCases, generalTasks, professionals, onClose, onAddTask, onToggleTask, onDeleteTask, onToggleGeneralTask, onDeleteGeneralTask, onTaskToEntry, onSelectCaseById, currentUser } = props;
    
    const [newTaskText, setNewTaskText] = useState('');
    const isOpen = mode !== 'closed';

    const tasksByCase = useMemo(() => {
        if (mode !== 'all') return {};
        const grouped: { [caseId: string]: Task[] } = {};
        allCases.forEach(c => {
            if (c.tasks && c.tasks.length > 0) {
                grouped[c.id] = c.tasks;
            }
        });
        return grouped;
    }, [allCases, mode]);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            const caseId = mode === 'single' ? caseData!.id : null;
            const assignedTo = mode === 'single' && currentUser ? [currentUser.id] : undefined;
            onAddTask(caseId, newTaskText.trim(), assignedTo);
            setNewTaskText('');
        }
    };

    if (!isOpen) return null;

    const title = mode === 'single' ? `Tareas de ${caseData?.name}` : 'Todas las Tareas';

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-50 shadow-xl flex flex-col z-50">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <IoCloseOutline className="text-3xl" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {mode === 'all' && (
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Tareas Generales</h4>
                            <div className="space-y-2">
                                {generalTasks.map(task => (
                                    <TaskItem key={task.id} task={task} onToggle={() => onToggleGeneralTask(task.id)} onDelete={() => onDeleteGeneralTask(task.id)} onConvertToEntry={() => {}} professionals={[]} />
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === 'single' && caseData && caseData.tasks.map(task => (
                        <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(caseData.id, task.id)} onDelete={() => onDeleteTask(caseData.id, task.id)} onConvertToEntry={() => { onTaskToEntry(task); onClose(); }} professionals={professionals} />
                    ))}
                    
                    {mode === 'all' && Object.entries(tasksByCase).map(([caseId, tasks]) => {
                        const currentCase = allCases.find(c => c.id === caseId);
                        if (!currentCase) return null;
                        return (
                            <div key={caseId}>
                                <h4 className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                                    <span>{currentCase.name}</span>
                                    <button onClick={() => { onSelectCaseById(caseId, 'tasks'); onClose(); }} className="text-xs flex items-center gap-1 text-teal-700 hover:underline">
                                        Ir al caso <IoChevronForwardCircleOutline />
                                    </button>
                                </h4>
                                <div className="space-y-2">
                                    {tasks.map(task => (
                                         <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(caseId, task.id)} onDelete={() => onDeleteTask(caseId, task.id)} onConvertToEntry={() => { onSelectCaseById(caseId, 'tasks'); onTaskToEntry(task); }} professionals={professionals} />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
                
                <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                    <form onSubmit={handleAddTask} className="flex gap-2">
                        <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            placeholder={mode === 'single' ? 'Añadir tarea a este caso...' : 'Añadir tarea general...'}
                            className="flex-grow px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 border-slate-300 focus:ring-teal-500"
                        />
                        <button type="submit" className="bg-teal-600 text-white w-9 h-9 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors flex-shrink-0" title="Añadir Tarea">
                            <IoAddOutline className="text-lg" />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default TasksSidePanel;