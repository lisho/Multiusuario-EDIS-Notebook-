import React, { useState } from 'react';
import { Intervention, InterventionType, InterventionStatus } from '../types';
import {
    IoHomeOutline,
    IoCallOutline,
    IoPeopleOutline,
    IoEaselOutline,
    IoArchiveOutline,
    IoGitNetworkOutline,
    IoHeartOutline,
    IoPeopleCircleOutline,
    IoWalkOutline,
    IoDocumentTextOutline,
    IoDocumentAttachOutline,
    IoBeerOutline,
    IoSunnyOutline,
    IoAirplaneOutline,
    IoSchoolOutline,
    IoPencilOutline,
    IoTrashOutline,
    IoChevronDownOutline,
    IoAlertCircleOutline
} from 'react-icons/io5';

interface TimelineNotebookViewProps {
  interventions: Intervention[];
  onEditIntervention: (intervention: Intervention) => void;
  onDeleteIntervention: (intervention: Intervention) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
}

const interventionIcons: Record<InterventionType, React.ComponentType<{className?: string}>> = {
  [InterventionType.HomeVisit]: IoHomeOutline,
  [InterventionType.PhoneCall]: IoCallOutline,
  [InterventionType.Meeting]: IoPeopleOutline,
  [InterventionType.Workshop]: IoEaselOutline,
  [InterventionType.Administrative]: IoArchiveOutline,
  [InterventionType.Coordination]: IoGitNetworkOutline,
  [InterventionType.PsychologicalSupport]: IoHeartOutline,
  [InterventionType.GroupSession]: IoPeopleCircleOutline,
  [InterventionType.Accompaniment]: IoWalkOutline,
  [InterventionType.Other]: IoDocumentTextOutline,
  [InterventionType.Reunion]: IoPeopleOutline,
  [InterventionType.AssessmentInterview]: IoPeopleOutline,
  [InterventionType.ElaborarMemoria]: IoDocumentAttachOutline,
  [InterventionType.ElaborarDocumento]: IoDocumentTextOutline,
  [InterventionType.Fiesta]: IoBeerOutline,
  [InterventionType.Vacaciones]: IoSunnyOutline,
  [InterventionType.Viaje]: IoAirplaneOutline,
  [InterventionType.CursoFormacion]: IoSchoolOutline,
};

const interventionColors: Record<InterventionType, string> = {
    [InterventionType.HomeVisit]: 'bg-emerald-500',
    [InterventionType.PhoneCall]: 'bg-sky-500',
    [InterventionType.Meeting]: 'bg-indigo-500',
    [InterventionType.Workshop]: 'bg-purple-500',
    [InterventionType.Administrative]: 'bg-slate-500',
    [InterventionType.Coordination]: 'bg-amber-500',
    [InterventionType.PsychologicalSupport]: 'bg-rose-500',
    [InterventionType.GroupSession]: 'bg-cyan-500',
    [InterventionType.Accompaniment]: 'bg-lime-500',
    [InterventionType.Other]: 'bg-gray-400',
    [InterventionType.Reunion]: 'bg-blue-500',
    [InterventionType.AssessmentInterview]: 'bg-sky-500',
    [InterventionType.ElaborarMemoria]: 'bg-gray-500',
    [InterventionType.ElaborarDocumento]: 'bg-gray-500',
    [InterventionType.Fiesta]: 'bg-pink-500',
    [InterventionType.Vacaciones]: 'bg-yellow-500',
    [InterventionType.Viaje]: 'bg-cyan-500',
    [InterventionType.CursoFormacion]: 'bg-orange-500',
};


const TimelineItem: React.FC<{ entry: Intervention; isLast: boolean; onEdit: () => void; onDelete: () => void; }> = ({ entry, isLast, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const formattedDate = new Date(entry.start).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Madrid',
    });
    const isCancelled = entry.status === InterventionStatus.Cancelled;

    const IconComponent = interventionIcons[entry.interventionType] || IoDocumentTextOutline;
    const iconColor = interventionColors[entry.interventionType] || interventionColors[InterventionType.Other];

    return (
        <div className="relative pl-8">
            {!isLast && <div className="absolute left-3.5 top-5 h-full w-0.5 bg-slate-200"></div>}
            <div className="absolute left-0 top-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColor}`}>
                    <IconComponent className="text-white text-lg" />
                </div>
            </div>
            <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${isCancelled ? 'opacity-70' : ''}`}>
                <div className="w-full text-left p-4 flex justify-between items-center">
                    <div 
                        className="flex-grow cursor-pointer" 
                        onClick={() => setIsExpanded(!isExpanded)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                    >
                        <p className="text-sm font-medium text-slate-500">{formattedDate}</p>
                        <h4 className={`font-bold text-md text-slate-800 ${isCancelled ? 'line-through' : ''}`}>{entry.title}</h4>
                        <p className="text-sm text-slate-500">{entry.interventionType}</p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                         <button
                            onClick={onEdit}
                            className="p-1.5 text-slate-400 hover:text-teal-600 rounded-full hover:bg-slate-100 transition-colors"
                            aria-label="Editar entrada"
                            title="Editar entrada"
                        >
                            <IoPencilOutline className="text-lg" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                            aria-label="Eliminar entrada"
                            title="Eliminar entrada"
                        >
                            <IoTrashOutline className="text-lg" />
                        </button>
                        <button
                            className="p-1.5 text-slate-500 rounded-full hover:bg-slate-100 transition-colors"
                            onClick={() => setIsExpanded(!isExpanded)}
                            aria-label="Mostrar/ocultar detalles"
                            title="Mostrar/ocultar detalles"
                        >
                            <IoChevronDownOutline className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>
                {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-200">
                         {isCancelled && (
                            <div className="my-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
                                <IoAlertCircleOutline className="text-xl flex-shrink-0" />
                                <span>Anulado el: {entry.cancellationTime ? new Date(entry.cancellationTime).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }) : 'Sí'}</span>
                            </div>
                        )}
                        <p className="text-slate-700 mt-2 whitespace-pre-wrap">{entry.notes || <span className="text-slate-400 italic">No hay notas detalladas.</span>}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TimelineNotebookView: React.FC<TimelineNotebookViewProps> = ({ interventions, onEditIntervention, onDeleteIntervention, requestConfirmation }) => {
  const registeredEntries = interventions
    .filter(i => i.isRegistered)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  if (registeredEntries.length === 0) {
    return (
      <div className="text-center bg-white rounded-lg p-10 shadow-sm border border-slate-200">
        <p className="text-slate-500">No hay entradas en el cuaderno para este caso.</p>
        <p className="text-slate-500 mt-2">Para añadir una entrada, crea una nueva intervención o edita una existente y marca la casilla "Registrada".</p>
      </div>
    );
  }

  const handleDelete = (entry: Intervention) => {
    requestConfirmation(
        'Eliminar Entrada del Cuaderno',
        '¿Estás seguro de que quieres eliminar esta entrada? Esta acción también eliminará la intervención asociada del calendario y es irreversible.',
        () => onDeleteIntervention(entry)
    );
  };

  return (
    <div className="space-y-6">
      {registeredEntries.map((entry, index) => (
        <TimelineItem 
            key={entry.id} 
            entry={entry} 
            isLast={index === registeredEntries.length - 1} 
            onEdit={() => onEditIntervention(entry)}
            onDelete={() => handleDelete(entry)} 
        />
      ))}
    </div>
  );
};

export default TimelineNotebookView;