import React, { useState, useMemo } from 'react';
import { Task, Professional, Case, User, ProfessionalRole } from '../types';
import { IoAddOutline, IoTrashOutline, IoArrowRedoOutline, IoPencilOutline, IoPersonOutline, IoCheckmarkCircle } from 'react-icons/io5';

interface TasksViewProps {
    tasks: Task[];
    onAddTask: (taskText: string, assignedTo?: string[]) => void;
    onToggleTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onTaskToEntry: (task: Task) => void;
    professionals: Professional[];
    caseData: Case;
    onUpdateTask: (updatedTask: Task) => void;
    currentUser: User;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const TaskItem: React.FC<{
    task: Task;
    onToggle: () => void;
    onDelete: () => void;
    onConvertToEntry: () => void;
    professionals: Professional[];
    onUpdateTask: (updatedTask: Task) => void;
}> = ({ task, onToggle, onDelete, onConvertToEntry, professionals, onUpdateTask }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);

    const assignedProfs = (task.assignedTo || [])
        .map(id => professionals.find(p => p.id === id))
        .filter(p => p && p.role === ProfessionalRole.EdisTechnician) as Professional[];

    const handleSaveEdit = () => {
        if (editText.trim() && editText.trim() !== task.text) {
            onUpdateTask({ ...task, text: editText.trim() });
        }
        setIsEditing(false);
    };
    
    if (isEditing) {
        return (
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 border-teal-500 shadow-md">
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={onToggle}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); }
                        if (e.key === 'Escape') setIsEditing(false);
                    }}
                    onBlur={handleSaveEdit}
                    className="flex-grow text-slate-800 bg-slate-100 border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                    autoFocus
                />
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 group hover:border-slate-300 transition-colors">
            <input
                type="checkbox"
                checked={task.completed}
                onChange={onToggle}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <div className="flex-grow min-w-0">
                <p className={`text-sm text-slate-800 ${task.completed ? 'line-through text-slate-400' : ''}`}>
                    {task.text}
                </p>
                {assignedProfs.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 -space-x-1">
                        {assignedProfs.map(p => (
                            <div 
                                key={p.id} 
                                className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[9px] border border-white overflow-hidden shadow-2xs" 
                                title={`Asignado a: ${p.name}`}
                            >
                                {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{getInitials(p.name)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors" title="Editar Tarea">
                    <IoPencilOutline />
                </button>
                {!task.completed && (
                    <button onClick={onConvertToEntry} className="p-1.5 text-slate-400 hover:text-teal-600 rounded-full hover:bg-slate-100 transition-colors" title="Convertir en Entrada de Cuaderno">
                        <IoArrowRedoOutline />
                    </button>
                )}
                <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors" title="Eliminar Tarea">
                    <IoTrashOutline />
                </button>
            </div>
        </div>
    );
};

const TasksView: React.FC<TasksViewProps> = (props) => {
    const { tasks, onAddTask, onToggleTask, onDeleteTask, onTaskToEntry, professionals, caseData, onUpdateTask, currentUser } = props;
    const [newTaskText, setNewTaskText] = useState('');
    
    // Only EDIS Technicians can be assigned tasks
    const edisTechnicians = useMemo(() => {
        return professionals.filter(p => p.role === ProfessionalRole.EdisTechnician);
    }, [professionals]);

    const teamProfessionals = useMemo(() => {
        const caseEdis = edisTechnicians.filter(p => caseData.professionalIds?.includes(p.id));
        return caseEdis.length > 0 ? caseEdis : edisTechnicians;
    }, [edisTechnicians, caseData.professionalIds]);

    const [assignedTo, setAssignedTo] = useState<string[]>(currentUser?.id ? [currentUser.id] : []);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            onAddTask(newTaskText.trim(), assignedTo.length > 0 ? assignedTo : (currentUser ? [currentUser.id] : []));
            setNewTaskText('');
        }
    };
    
    const handleAssigneeToggle = (profId: string) => {
        setAssignedTo(prev =>
          prev.includes(profId)
            ? prev.filter(id => id !== profId)
            : [...prev, profId]
        );
    };

    const handleSelectOnlyMe = () => {
        if (currentUser?.id) {
            setAssignedTo([currentUser.id]);
        }
    };

    const handleSelectAllTeam = () => {
        setAssignedTo(teamProfessionals.map(p => p.id));
    };

    const isOnlyMeSelected = currentUser?.id && assignedTo.length === 1 && assignedTo[0] === currentUser.id;
    const isAllTeamSelected = teamProfessionals.length > 0 && assignedTo.length === teamProfessionals.length;

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <form onSubmit={handleAddTask} className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            placeholder="Añadir una nueva tarea..."
                            className="flex-grow px-4 py-2 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 border-slate-300 focus:ring-teal-500"
                        />
                        <button type="submit" className="bg-teal-600 text-white w-10 h-10 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors flex-shrink-0" title="Añadir Tarea">
                            <IoAddOutline className="text-2xl" />
                        </button>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <IoPersonOutline className="text-teal-600 text-sm" />
                                Asignar a Técnico/a EDIS:
                            </label>
                            <div className="flex items-center gap-1.5">
                                {currentUser && (
                                    <button
                                        type="button"
                                        onClick={handleSelectOnlyMe}
                                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                                            isOnlyMeSelected
                                                ? 'bg-teal-100 text-teal-800 border-teal-300 font-semibold'
                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                        }`}
                                    >
                                        Solo a mí
                                    </button>
                                )}
                                {teamProfessionals.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleSelectAllTeam}
                                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                                            isAllTeamSelected
                                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold'
                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                        }`}
                                    >
                                        Todo el equipo
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {teamProfessionals.map(p => {
                                const isSelected = assignedTo.includes(p.id);
                                const isMe = currentUser && p.id === currentUser.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleAssigneeToggle(p.id)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all border ${
                                            isSelected
                                                ? 'bg-teal-50 border-teal-500 text-teal-900 font-medium shadow-2xs ring-1 ring-teal-400'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-teal-200 text-teal-900 flex items-center justify-center font-bold text-[9px] overflow-hidden flex-shrink-0">
                                            {p.avatar ? (
                                                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(p.name)
                                            )}
                                        </div>
                                        <span>{p.name} {isMe ? '(Tú)' : ''}</span>
                                        {isSelected && (
                                            <IoCheckmarkCircle className="text-teal-600 text-sm flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </form>
            </div>
            
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Tareas Pendientes ({pendingTasks.length})</h3>
                    <div className="space-y-2">
                        {pendingTasks.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                onToggle={() => onToggleTask(task.id)} 
                                onDelete={() => onDeleteTask(task.id)} 
                                onConvertToEntry={() => onTaskToEntry(task)} 
                                professionals={edisTechnicians} 
                                onUpdateTask={onUpdateTask}
                            />
                        ))}
                    </div>
                </div>

                {completedTasks.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-3">Tareas Completadas ({completedTasks.length})</h3>
                        <div className="space-y-2">
                            {completedTasks.map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={() => onToggleTask(task.id)} 
                                    onDelete={() => onDeleteTask(task.id)} 
                                    onConvertToEntry={() => onTaskToEntry(task)} 
                                    professionals={edisTechnicians} 
                                    onUpdateTask={onUpdateTask}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TasksView;