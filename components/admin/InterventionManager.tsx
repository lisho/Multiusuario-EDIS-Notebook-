import React, { useState, useMemo } from 'react';
import { Intervention, Case, InterventionType } from '../../types';
import { IoWarningOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';

interface InterventionManagerProps {
    allInterventions: Intervention[];
    cases: Case[];
    onSaveIntervention: (intervention: Intervention) => void;
    onBatchUpdateInterventions: (interventions: Intervention[]) => void;
    onBatchDeleteInterventions: (interventions: Intervention[]) => void;
    onEditIntervention: (intervention: Intervention) => void;
    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
}

const InterventionManager: React.FC<InterventionManagerProps> = ({
    allInterventions,
    cases,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSaveIntervention,
    onBatchUpdateInterventions,
    onBatchDeleteInterventions,
    onEditIntervention,
    requestConfirmation
}) => {
    const [newTypeSelections, setNewTypeSelections] = useState<Record<string, InterventionType>>({});

    const standardTypes = useMemo<Set<InterventionType>>(() => new Set(Object.values(InterventionType)), []);
    
    const inconsistentInterventionsGrouped = useMemo<Record<string, Intervention[]>>(() => {
        const grouped: Record<string, Intervention[]> = {};
        allInterventions.forEach(i => {
             // Check if type exists in enum values
             if (!standardTypes.has(i.interventionType as InterventionType)) {
                 const typeKey = i.interventionType || 'Sin Tipo';
                 if (!grouped[typeKey]) {
                     grouped[typeKey] = [];
                 }
                 grouped[typeKey].push(i);
             }
        });
        return grouped;
    }, [allInterventions, standardTypes]);

    const handleBulkTypeCorrection = (invalidType: string) => {
        const newType = newTypeSelections[invalidType];
        if (!newType) return;

        const interventionsToUpdate = inconsistentInterventionsGrouped[invalidType] || [];
        
        if (interventionsToUpdate.length === 0) {
            return;
        }
        requestConfirmation(
            'Confirmar Corrección Masiva',
            `¿Estás seguro de que quieres cambiar ${interventionsToUpdate.length} intervenciones de tipo "${invalidType}" a "${newType}"? Esta acción es permanente.`,
            () => {
                const updatedInterventions = interventionsToUpdate.map(i => ({
                    ...i,
                    interventionType: newType
                }));
                onBatchUpdateInterventions(updatedInterventions);
            }
        );
    };

    return (
        <div className="space-y-8">
             {Object.keys(inconsistentInterventionsGrouped).length > 0 && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                        <IoWarningOutline /> Tipos de Intervención Inconsistentes Detectados
                    </h3>
                    <p className="text-amber-700 text-sm mb-4">Se han detectado registros con tipos de intervención que no coinciden con la lista oficial (posiblemente importados). Puedes corregirlos masivamente aquí.</p>
                    <div className="space-y-4">
                        {Object.entries(inconsistentInterventionsGrouped).map(([invalidType, interventions]: [string, Intervention[]]) => (
                            <div key={invalidType} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded shadow-sm border border-amber-100">
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-700">Tipo inválido: <span className="text-red-600">"{invalidType}"</span></p>
                                    <p className="text-sm text-slate-500">{interventions.length} registros afectados</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600 whitespace-nowrap">Cambiar a:</span>
                                    <select 
                                        className="border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                        value={newTypeSelections[invalidType] || ''}
                                        onChange={(e) => setNewTypeSelections(prev => ({...prev, [invalidType]: e.target.value as InterventionType}))}
                                    >
                                        <option value="">Seleccionar tipo...</option>
                                        {Object.values(InterventionType).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={() => handleBulkTypeCorrection(invalidType)}
                                        disabled={!newTypeSelections[invalidType]}
                                        className="bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Corregir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             )}

             <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">Registro de Intervenciones ({allInterventions.length})</h3>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Título</th>
                                <th className="p-4">Caso</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {[...allInterventions].sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime()).slice(0, 100).map(intervention => { 
                                const relatedCase = cases.find(c => c.id === intervention.caseId);
                                return (
                                <tr key={intervention.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-600 whitespace-nowrap">{new Date(intervention.start).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
                                            {intervention.interventionType}
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium text-slate-800">{intervention.title}</td>
                                    <td className="p-4 text-slate-500">{relatedCase ? relatedCase.name : <span className="italic text-slate-400">General</span>}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onEditIntervention(intervention)} className="p-2 text-slate-400 hover:text-teal-600 rounded-full hover:bg-teal-50 transition-colors" title="Editar">
                                                <IoPencilOutline className="text-lg" />
                                            </button>
                                            <button onClick={() => requestConfirmation('Eliminar Intervención', '¿Estás seguro de que quieres eliminar esta intervención? Esta acción no se puede deshacer.', () => onBatchDeleteInterventions([intervention]))} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" title="Eliminar">
                                                <IoTrashOutline className="text-lg" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                )
                            })}
                            {allInterventions.length > 100 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-500 text-xs italic">
                                        Mostrando las 100 intervenciones más recientes. Utiliza los filtros (próximamente) para ver más.
                                    </td>
                                </tr>
                            )}
                            {allInterventions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No hay intervenciones registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>
    );
};

export default InterventionManager;