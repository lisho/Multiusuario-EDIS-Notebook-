import React, { useState } from 'react';
import { Task } from '../types';
import { IoBookOutline, IoTrashOutline, IoAddOutline } from 'react-icons/io5';

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onTaskToEntry: (task: Task) => void;
}

const TasksView: React.FC<TasksViewProps> = ({ tasks, onAddTask, onToggleTask, onDeleteTask, onTaskToEntry }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      onAddTask(newTaskText.trim());
      setNewTaskText('');
      setError(null);
    } else {
      setError('La descripción de la tarea no puede estar vacía.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTaskText(e.target.value);
    if(error) {
        setError(null);
    }
  };

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);
  
  const TaskItem: React.FC<{task: Task}> = ({ task }) => (
    <li className="flex items-center justify-between p-3 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggleTask(task.id)}
          className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
        />
        <span className={`text-slate-800 ${task.completed ? 'line-through text-slate-500' : ''}`}>{task.text}</span>
      </div>
      <div className="flex items-center gap-3">
        {task.completed && (
            <button onClick={() => onTaskToEntry(task)} className="text-slate-400 hover:text-teal-600 transition-colors p-1" title="Añadir al cuaderno">
                <IoBookOutline className="text-xl" />
            </button>
        )}
        <button onClick={() => onDeleteTask(task.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Eliminar tarea">
            <IoTrashOutline className="text-xl" />
        </button>
      </div>
    </li>
  );

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Añadir Nueva Tarea</h3>
        <form onSubmit={handleAddTask}>
          <div className="flex gap-2">
            <input
                type="text"
                value={newTaskText}
                onChange={handleInputChange}
                placeholder="Ej. Coordinar cita médica..."
                className={`flex-grow px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 placeholder:text-slate-500 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`}
            />
            <button type="submit" className="bg-teal-600 text-white w-12 h-12 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors" title="Añadir Tarea">
                <IoAddOutline className="text-2xl" />
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Pendientes ({pendingTasks.length})</h3>
        {pendingTasks.length > 0 ? (
          <ul className="space-y-3">
            {pendingTasks.map(task => <TaskItem key={task.id} task={task} />)}
          </ul>
        ) : (
          <p className="text-slate-500">No hay tareas pendientes.</p>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Completadas ({completedTasks.length})</h3>
          <ul className="space-y-3">
            {completedTasks.map(task => <TaskItem key={task.id} task={task} />)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TasksView;