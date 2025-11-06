import React, { useState, useEffect, useMemo } from 'react';
import { Case, Task, DashboardView } from '../types';
import { IoCheckboxOutline, IoCloseOutline, IoTrashOutline, IoAddOutline, IoBookOutline } from 'react-icons/io5';

interface TasksSidePanelProps {
    mode: 'closed' | 'single' | 'all';
    caseData?: Case;
    allCases?: Case[];
    generalTasks?: Task[];
    onClose: () => void;
    onAddTask: (caseId: string | null, text: string) => void;
    onToggleTask: (caseId: string, id: string) => void;
    onDeleteTask: (caseId: string, id: string) => void;
    onToggleGeneralTask: (taskId: string) => void;
    onDeleteGeneralTask: (taskId: string) => void;
    onTaskToEntry: (task: Task) => void;
    onSelectCaseById: (caseId: string, view: DashboardView) => void;
}

const TasksSidePanel: React.FC<TasksSidePanelProps> = ({ mode, caseData, allCases, generalTasks, onClose, onAddTask, onToggleTask, onDeleteTask, onToggleGeneralTask, onDeleteGeneralTask, onTaskToEntry, onSelectCaseById }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const isOpen = mode !== 'closed';

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewTaskText(e.target.value);
        if (error) {
            setError(null);
        }
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim() && caseData) {
            onAddTask(caseData.id, newTaskText.trim());
            setNewTaskText('');
            setError(null);
        } else {
            setError('La tarea no puede estar vacía.');
        }
    };
    
    const tasksByCase = useMemo(() => {
        if (mode !== 'all' || !allCases) return [];
        return allCases
            .map(c => ({
                caseId: c.id,
                caseName: c.name,
                caseNickname: c.nickname,
                tasks: c.tasks.filter(t => !t.completed)
            }))
            .filter(group => group.tasks.length > 0);
    }, [allCases, mode]);
    
    const pendingGeneralTasks = useMemo(() => {
        if (mode !== 'all' || !generalTasks) return [];
        return generalTasks.filter(t => !t.completed);
    }, [generalTasks, mode]);


    const TaskItem: React.FC<{task: Task, caseId: string | null}> = ({ task, caseId }) => {
        const handleToggle = () => {
            if (caseId) {
                onToggleTask(caseId, task.id);
            } else {
                onToggleGeneralTask(task.id);
            }
        };
        const handleDelete = () => {
             if (caseId) {
                onDeleteTask(caseId, task.id);
            } else {
                onDeleteGeneralTask(task.id);
            }
        };
        
        return (
            <li className="flex items-center justify-between p-3 rounded-md bg-slate-100 hover:bg-slate-200/60 transition-colors">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={handleToggle}
                        className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className={`text-slate-800 ${task.completed ? 'line-through text-slate-500' : ''}`}>{task.text}</span>
                </div>
                <div className="flex items-center gap-3">
                    {task.completed && caseId && (
                        <button onClick={() => onTaskToEntry(task)} className="text-slate-400 hover:text-teal-600 transition-colors p-1" title="Añadir al cuaderno">
                            <IoBookOutline className="text-xl" />
                        </button>
                    )}
                    <button onClick={handleDelete} className="text-slate-400 hover:text-red-600 transition-colors" title="Eliminar tarea">
                        <IoTrashOutline className="text-xl" />
                    </button>
                </div>
            </li>
        );
    };

    const renderSingleCaseView = () => {
        if (!caseData) return null;
        const pendingTasks = caseData.tasks.filter(task => !task.completed);
        const completedTasks = caseData.tasks.filter(task => task.completed);
        
        return (
            <>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Pendientes ({pendingTasks.length})</h3>
                    {pendingTasks.length > 0 ? (
                        <ul className="space-y-2">
                            {pendingTasks.map(task => <TaskItem key={task.id} task={task} caseId={caseData.id} />)}
                        </ul>
                        ) : (
                        <p className="text-slate-500 text-sm italic">No hay tareas pendientes.</p>
                    )}
                </div>

                {completedTasks.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">Completadas ({completedTasks.length})</h3>
                        <ul className="space-y-2">
                            {completedTasks.map(task => <TaskItem key={task.id} task={task} caseId={caseData.id} />)}
                        </ul>
                    </div>
                )}
            </>
        );
    };

    const renderAllCasesView = () => (
        <div className="space-y-6">
            {tasksByCase.map(group => (
                <div key={group.caseId}>
                    <button 
                        onClick={() => onSelectCaseById(group.caseId, 'tasks')} 
                        className="font-semibold text-teal-700 hover:underline text-lg"
                        title={`Ir al caso de ${group.caseName}`}
                    >
                        {group.caseName}
                        {group.caseNickname && (
                            <strong className="ml-2 font-bold text-slate-600">({group.caseNickname})</strong>
                        )}
                    </button>
                    <ul className="space-y-2 mt-2">
                        {group.tasks.map(task => (
                            <TaskItem key={task.id} task={task} caseId={group.caseId} />
                        ))}
                    </ul>
                </div>
            ))}
            
            {pendingGeneralTasks.length > 0 && (
                <div>
                    <h3 className="font-semibold text-teal-700 text-lg">Tareas Generales</h3>
                    <ul className="space-y-2 mt-2">
                        {pendingGeneralTasks.map(task => (
                            <TaskItem key={task.id} task={task} caseId={null} />
                        ))}
                    </ul>
                </div>
            )}

            {tasksByCase.length === 0 && pendingGeneralTasks.length === 0 && (
                <p className="text-slate-500 text-sm italic text-center py-8">¡Felicidades! No hay tareas pendientes en ningún caso.</p>
            )}
        </div>
    );
    
    if (mode === 'closed') return null;

    return (
        <div 
            className={`fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="absolute inset-0 bg-black bg-opacity-50" 
                onClick={handleClose} 
                aria-hidden="true"
            />
            
            <div 
                className={`absolute top-0 right-0 h-full w-full max-w-md bg-slate-50 shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <IoCheckboxOutline className="text-2xl text-teal-600" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {mode === 'single' ? 'Tareas' : 'Todas las Tareas Pendientes'}
                            </h2>
                            {mode === 'single' && caseData && <p className="text-base font-medium text-slate-600">
                                {caseData.name}
                                {caseData.nickname && <strong className="ml-2 font-bold">({caseData.nickname})</strong>}
                            </p>}
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-slate-500 hover:text-slate-800" aria-label="Cerrar panel de tareas">
                        <IoCloseOutline className="text-3xl" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {mode === 'single' ? renderSingleCaseView() : renderAllCasesView()}
                </div>

                {mode === 'single' && (
                    <div className="p-4 bg-white border-t border-slate-200">
                        <form onSubmit={handleAddTask}>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTaskText}
                                    onChange={handleInputChange}
                                    placeholder="Añadir nueva tarea..."
                                    className={`flex-grow px-3 py-2 text-sm text-slate-900 border rounded-md focus:outline-none focus:ring-1 bg-white ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`}
                                />
                                <button type="submit" className="bg-teal-600 text-white w-10 h-10 rounded-md hover:bg-teal-700 flex items-center justify-center transition-colors disabled:bg-slate-400" disabled={!newTaskText.trim()}>
                                    <IoAddOutline className="text-2xl" />
                                </button>
                            </div>
                            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TasksSidePanel;