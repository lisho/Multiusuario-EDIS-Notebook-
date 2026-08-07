import React, { useState, useEffect, useMemo } from 'react';
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
    IoAlertCircleOutline,
    IoListOutline,
    IoTimeOutline,
    IoCheckmarkDoneOutline,
    IoCloseCircleOutline,
    IoSearchOutline,
    IoFilterOutline,
    IoTrashBinOutline
} from 'react-icons/io5';

interface TimelineNotebookViewProps {
  caseId: string;
  interventions: Intervention[];
  onEditIntervention: (intervention: Intervention) => void;
  onDeleteIntervention: (intervention: Intervention) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  onSaveIntervention?: (intervention: Intervention) => void;
  onBulkSaveInterventions?: (interventions: Intervention[]) => void;
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

const TimelineNotebookView: React.FC<TimelineNotebookViewProps> = ({ caseId, interventions: initialInterventions, onEditIntervention, onDeleteIntervention, requestConfirmation, onSaveIntervention, onBulkSaveInterventions }) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [localInterventions, setLocalInterventions] = useState<Intervention[]>(initialInterventions);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | 'all'>('all');

  // Sync local state when initialInterventions prop changes (e.g. switching cases)
  useEffect(() => {
    setLocalInterventions(initialInterventions);
    setSelectedIds(new Set());
  }, [caseId]);

  // Soft sync for updates within the same case (e.g. new interventions added elsewhere)
  useEffect(() => {
      // Only update if the length changed (new items or deleted items from outside)
      // or if we don't have any pending local changes (selected items)
      if (initialInterventions.length !== localInterventions.length || selectedIds.size === 0) {
          setLocalInterventions(initialInterventions);
      }
  }, [initialInterventions, caseId]);

  const filteredInterventions = useMemo(() => {
      return localInterventions.filter(i => {
          const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               i.interventionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (i.notes && i.notes.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
          return matchesSearch && matchesStatus;
      });
  }, [localInterventions, searchTerm, statusFilter]);

  const registeredEntries = useMemo(() => 
    filteredInterventions
      .filter(i => i.isRegistered)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
    [filteredInterventions]
  );

  const allEntries = useMemo(() => 
    [...filteredInterventions].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
    [filteredInterventions]
  );

  const handleDelete = (entry: Intervention) => {
    requestConfirmation(
        'Eliminar Entrada',
        '¿Estás seguro de que quieres eliminar esta entrada? Esta acción también eliminará la intervención asociada del calendario y es irreversible.',
        () => {
            onDeleteIntervention(entry);
            setLocalInterventions(prev => prev.filter(i => i.id !== entry.id));
        }
    );
  };

  const handleBulkDelete = () => {
      const count = selectedIds.size;
      requestConfirmation(
          'Eliminar Múltiples Entradas',
          `¿Estás seguro de que quieres eliminar las ${count} entradas seleccionadas? Esta acción también eliminará las intervenciones asociadas del calendario y es irreversible.`,
          () => {
              const selectedInterventions = localInterventions.filter(i => selectedIds.has(i.id));
              selectedInterventions.forEach(i => onDeleteIntervention(i));
              setLocalInterventions(prev => prev.filter(i => !selectedIds.has(i.id)));
              setSelectedIds(new Set());
          }
      );
  };

  const handleStatusChange = (event: Intervention, newStatus: InterventionStatus) => {
      // Optimistic update
      setLocalInterventions(prev => prev.map(i => i.id === event.id ? { ...i, status: newStatus } : i));
      if (onSaveIntervention) {
          onSaveIntervention({ ...event, status: newStatus });
      }
  };

  const handleIsRegisteredChange = (event: Intervention, isRegistered: boolean) => {
      // Optimistic update
      setLocalInterventions(prev => prev.map(i => i.id === event.id ? { ...i, isRegistered } : i));
      if (onSaveIntervention) {
          onSaveIntervention({ ...event, isRegistered });
      }
  };

  const toggleSelect = (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
          newSelected.delete(id);
      } else {
          newSelected.add(id);
      }
      setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === allEntries.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(allEntries.map(e => e.id)));
      }
  };

  const handleBulkStatusChange = (newStatus: InterventionStatus) => {
      const selectedInterventions = localInterventions.filter(i => selectedIds.has(i.id));
      const updatedInterventions = selectedInterventions.map(i => ({ ...i, status: newStatus }));
      
      // Optimistic update
      setLocalInterventions(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, status: newStatus } : i));
      
      if (onBulkSaveInterventions) {
          onBulkSaveInterventions(updatedInterventions);
      } else if (onSaveIntervention) {
          selectedInterventions.forEach(i => {
              onSaveIntervention({ ...i, status: newStatus });
          });
      }
      setSelectedIds(new Set());
  };

  const handleBulkRegisterChange = (isRegistered: boolean) => {
      const selectedInterventions = localInterventions.filter(i => selectedIds.has(i.id));
      const updatedInterventions = selectedInterventions.map(i => ({ ...i, isRegistered }));
      
      // Optimistic update
      setLocalInterventions(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, isRegistered } : i));
      
      if (onBulkSaveInterventions) {
          onBulkSaveInterventions(updatedInterventions);
      } else if (onSaveIntervention) {
          selectedInterventions.forEach(i => {
              onSaveIntervention({ ...i, isRegistered });
          });
      }
      setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-3 rounded-lg shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">
                {viewMode === 'timeline' ? 'Cuaderno de Campo' : 'Gestión de Intervenciones'}
            </h3>
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full border border-slate-200">
                {allEntries.length} total
            </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text"
                    placeholder="Buscar intervenciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
                <button
                    onClick={() => setViewMode('timeline')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-teal-700 font-medium' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    <IoTimeOutline className="text-lg" />
                    Línea de Tiempo
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-teal-700 font-medium' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    <IoListOutline className="text-lg" />
                    Lista Completa
                </button>
            </div>
        </div>
      </div>

      {viewMode === 'list' && (
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-500 mr-2">
                  <IoFilterOutline className="text-lg" />
                  <span>Filtrar por:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${statusFilter === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                  >
                      Todos
                  </button>
                  {Object.values(InterventionStatus).map(status => (
                      <button 
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${statusFilter === status ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                      >
                          {status}
                      </button>
                  ))}
              </div>
          </div>
      )}

      {selectedIds.size > 0 && viewMode === 'list' && (
          <div className="bg-teal-50 border border-teal-200 p-4 rounded-lg shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2 sticky top-4 z-10">
              <div className="flex items-center gap-3">
                  <div className="bg-teal-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                      {selectedIds.size}
                  </div>
                  <span className="text-teal-900 font-medium">elementos seleccionados</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider mr-2">Acciones masivas:</span>
                  <button 
                    onClick={() => handleBulkStatusChange(InterventionStatus.Completed)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-md hover:bg-teal-100 transition-colors text-sm font-medium"
                  >
                      <IoCheckmarkDoneOutline /> Completar
                  </button>
                  <button 
                    onClick={() => handleBulkStatusChange(InterventionStatus.Cancelled)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-200 text-red-700 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                      <IoCloseCircleOutline /> Anular
                  </button>
                  <div className="h-6 w-px bg-teal-200 mx-1"></div>
                  <button 
                    onClick={() => handleBulkRegisterChange(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm font-medium"
                  >
                      Añadir al Cuaderno
                  </button>
                  <button 
                    onClick={() => handleBulkRegisterChange(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-md hover:bg-teal-100 transition-colors text-sm font-medium"
                  >
                      Quitar del Cuaderno
                  </button>
                  <div className="h-6 w-px bg-teal-200 mx-1"></div>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md hover:bg-red-100 transition-colors text-sm font-medium"
                  >
                      <IoTrashBinOutline /> Eliminar
                  </button>
                  <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="ml-2 text-slate-500 hover:text-slate-700 text-sm font-medium px-2 py-1"
                  >
                      Cancelar
                  </button>
              </div>
          </div>
      )}

      {viewMode === 'timeline' ? (
        registeredEntries.length === 0 ? (
          <div className="text-center bg-white rounded-lg p-10 shadow-sm border border-slate-200">
            <p className="text-slate-500">No hay entradas en el cuaderno para este caso.</p>
            <p className="text-slate-500 mt-2">Para añadir una entrada, crea una nueva intervención o edita una existente y marca la casilla "Registrada".</p>
          </div>
        ) : (
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
        )
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                        checked={selectedIds.size === allEntries.length && allEntries.length > 0}
                        onChange={toggleSelectAll}
                      />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Título / Tipo</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Cuaderno</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {allEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      {searchTerm || statusFilter !== 'all' ? 'No se encontraron intervenciones con los filtros aplicados.' : 'No hay intervenciones registradas para este caso.'}
                    </td>
                  </tr>
                ) : (
                  allEntries.map((entry) => (
                    <tr key={entry.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(entry.id) ? 'bg-teal-50/50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                          />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {new Date(entry.start).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 truncate max-w-xs" title={entry.title}>{entry.title}</div>
                        <div className="text-xs text-slate-500">{entry.interventionType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                            value={entry.status}
                            onChange={(e) => handleStatusChange(entry, e.target.value as InterventionStatus)}
                            className={`text-xs rounded border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-1 pl-2 pr-8 ${
                                entry.status === InterventionStatus.Completed ? 'bg-green-50 text-green-700 border-green-200' :
                                entry.status === InterventionStatus.Cancelled ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                            {Object.values(InterventionStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={entry.isRegistered}
                                onChange={(e) => handleIsRegisteredChange(entry, e.target.checked)}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-5 h-5"
                                title="Añadir al cuaderno de campo"
                            />
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                            onClick={() => onEditIntervention(entry)}
                            className="text-slate-400 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors inline-flex"
                            title="Editar"
                        >
                            <IoPencilOutline className="text-lg" />
                        </button>
                        <button
                            onClick={() => handleDelete(entry)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-100 transition-colors inline-flex ml-1"
                            title="Eliminar"
                        >
                            <IoTrashOutline className="text-lg" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineNotebookView;