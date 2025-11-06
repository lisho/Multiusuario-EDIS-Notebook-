import React from 'react';
import { AdminTool, InterventionMoment, InterventionRecord } from '../types';
import { IoPlayOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';

interface InterventionMomentViewProps {
  moment: InterventionMoment;
  availableTools: AdminTool[];
  records: InterventionRecord[];
  onRunTool: (tool: AdminTool, recordToEdit?: InterventionRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
}

const momentTitles: Record<InterventionMoment, string> = {
    // FIX: Added the missing 'Referral' key to the object to satisfy the 'Record<InterventionMoment, string>' type, which requires all enum members to be present.
    [InterventionMoment.Referral]: 'Derivación',
    [InterventionMoment.Welcome]: 'Acogida',
    [InterventionMoment.Diagnosis]: 'Diagnóstico',
    [InterventionMoment.Planning]: 'Planificación',
    [InterventionMoment.Accompaniment]: 'Acompañamiento',
};

const InterventionMomentView: React.FC<InterventionMomentViewProps> = ({ moment, availableTools, records, onRunTool, onDeleteRecord, requestConfirmation }) => {
  const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = (recordId: string) => {
    requestConfirmation(
      'Eliminar Registro',
      '¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.',
      () => onDeleteRecord(recordId)
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Herramientas Disponibles para {momentTitles[moment]}</h2>
        {availableTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTools.map(tool => (
              <div key={tool.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{tool.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{tool.description}</p>
                </div>
                <button 
                    onClick={() => onRunTool(tool)}
                    className="mt-4 w-full bg-teal-50 text-teal-700 h-10 rounded-lg hover:bg-teal-100 font-semibold flex items-center justify-center gap-2 transition-colors border border-teal-200"
                    title="Utilizar Herramienta"
                >
                  <IoPlayOutline className="text-xl" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200 shadow-sm">
            <p className="text-slate-500 font-medium">No hay herramientas configuradas para la fase de {momentTitles[moment]}.</p>
            <p className="text-slate-500 mt-2">Puedes crearlas en la sección de "Administración".</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Registros Realizados</h2>
        {sortedRecords.length > 0 ? (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <ul className="divide-y divide-slate-200">
                    {sortedRecords.map(record => (
                        <li key={record.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-slate-800">{record.toolName}</p>
                                <p className="text-sm text-slate-500">
                                    Realizado el: {new Date(record.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Madrid' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onRunTool(availableTools.find(t => t.id === record.toolId)!, record)} className="text-slate-500 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors" title="Ver / Editar Registro">
                                    <IoPencilOutline className="text-lg" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(record.id)} 
                                    className="text-slate-500 hover:text-red-600 p-1.5 rounded-full hover:bg-red-100 transition-colors" title="Eliminar Registro">
                                    <IoTrashOutline className="text-lg" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
          </div>
        ) : (
            <div className="text-center py-10 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200 shadow-sm">
                <p className="text-slate-500 font-medium">No se ha utilizado ninguna herramienta en esta fase todavía.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default InterventionMomentView;