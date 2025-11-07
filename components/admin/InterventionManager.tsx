import React, { useState, useMemo } from 'react';
import { Case, Intervention, InterventionType } from '../../types';
import { IoSparklesOutline, IoSaveOutline, IoSearchOutline, IoBookOutline, IoCloseCircleOutline, IoPersonCircleOutline, IoWarningOutline, IoPencilOutline, IoConstructOutline, IoDuplicateOutline } from 'react-icons/io5';

interface InterventionManagerProps {
    allInterventions: Intervention[];
    cases: Case[];
    onSaveIntervention: (intervention: Intervention) => void;
    onBatchUpdateInterventions: (interventions: Intervention[]) => void;
    onBatchDeleteInterventions: (interventions: Intervention[]) => void;
    onEditIntervention: (intervention: Intervention) => void;
    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
}

const generalInterventionTypes = Object.values(InterventionType).filter(type => 
    ![
        InterventionType.Meeting, InterventionType.HomeVisit, InterventionType.PhoneCall, 
        InterventionType.Workshop, InterventionType.Administrative, InterventionType.Coordination, 
        InterventionType.PsychologicalSupport, InterventionType.GroupSession, InterventionType.Accompaniment
    ].includes(type)
);

const caseInterventionTypes = Object.values(InterventionType).filter(type => 
    ![
        InterventionType.Reunion, InterventionType.ElaborarMemoria, InterventionType.ElaborarDocumento, 
        InterventionType.Fiesta, InterventionType.Vacaciones, InterventionType.Viaje, 
        InterventionType.CursoFormacion
    ].includes(type)
);

// Create a unified, sorted list of all valid intervention types for maximum flexibility.
const allValidInterventionTypes = [...new Set([...caseInterventionTypes, ...generalInterventionTypes])].sort((a, b) => a.localeCompare(b));


const InterventionManager: React.FC<InterventionManagerProps> = ({ allInterventions, cases, onSaveIntervention, onBatchUpdateInterventions, onBatchDeleteInterventions, onEditIntervention, requestConfirmation }) => {
    const [assignments, setAssignments] = useState<Record<string, { caseId: string; isRegistered: boolean }>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('unassigned');
    const [registrationFilter, setRegistrationFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
    const [selectedInterventions, setSelectedInterventions] = useState<Set<string>>(new Set());
    const [bulkAssignCaseId, setBulkAssignCaseId] = useState<string>('');
    const [bulkRegister, setBulkRegister] = useState(false);
    const [newTypeSelections, setNewTypeSelections] = useState<Record<string, InterventionType>>({});
    const [individualTypeChanges, setIndividualTypeChanges] = useState<Record<string, InterventionType>>({});
    const [hasAppliedFilters, setHasAppliedFilters] = useState(false);


    const caseMap = useMemo(() => new Map(cases.map(c => [c.id, c])), [cases]);
    
    const allPresentInterventionTypes = useMemo(() => {
        const types = new Set(allInterventions.map(i => i.interventionType as string));
        // FIX: Explicitly type the parameters of the sort function to avoid potential type inference issues.
        return Array.from(types).sort((a: string, b: string) => a.localeCompare(b));
    }, [allInterventions]);
    
    const inconsistentInterventionsGrouped = useMemo(() => {
        const validTypes = new Set(Object.values(InterventionType));
        const inconsistent = allInterventions.filter(i => !validTypes.has(i.interventionType) && (i.interventionType as string) !== 'Tarea');
        
        return inconsistent.reduce((acc, intervention) => {
            const type = intervention.interventionType;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(intervention);
            return acc;
        }, {} as Record<string, Intervention[]>);

    }, [allInterventions]);
    
    const duplicateGroups = useMemo(() => {
        const groups = new Map<string, Intervention[]>();
        allInterventions.forEach(i => {
            const dateKey = new Date(i.start).toISOString().split('T')[0];
            const titleKey = i.title.trim().toLowerCase();
            const key = `${dateKey}-${titleKey}`;
            
            const group = groups.get(key) || [];
            group.push(i);
            groups.set(key, group);
        });
    
        // Define a set of "generic" types that are candidates for deletion if a more specific one exists.
        const genericTypes = new Set([
            'Cita', // Custom invalid type, very generic
            InterventionType.Other,
            InterventionType.Reunion,
        ]);
    
        const duplicateGroupsWithActions = Array.from(groups.values())
            .filter(g => g.length > 1)
            .map(group => {
                // Separate generic from specific interventions within the group
                const specifics = group.filter(i => !genericTypes.has(i.interventionType as InterventionType));
                const generics = group.filter(i => genericTypes.has(i.interventionType as InterventionType));
                
                let toDelete: Intervention[] = [];
                let toKeep: Intervention[] = [];
    
                if (specifics.length > 0 && generics.length > 0) {
                    // Case 1: Mixed group. Keep the specific ones, delete the generic ones.
                    toKeep = specifics;
                    toDelete = generics;
                } else if (specifics.length === 0 && generics.length > 1) {
                    // Case 2: All generic. Keep the first one, delete the rest.
                    toKeep = [generics[0]];
                    toDelete = generics.slice(1);
                } else {
                    // Case 3: All specific (or only one generic, or other combos). Nothing to automatically clean.
                    toKeep = group;
                }
    
                if (toDelete.length > 0) {
                    return {
                        id: group[0].id,
                        title: group[0].title,
                        date: new Date(group[0].start).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric'}),
                        toKeep,
                        toDelete,
                    };
                }
                return null;
            }).filter(Boolean) as { id: string; title: string; date: string; toKeep: Intervention[]; toDelete: Intervention[] }[];
    
        return duplicateGroupsWithActions;
    }, [allInterventions]);

    const allDuplicatesToDelete = useMemo(() => {
        return duplicateGroups.flatMap(g => g.toDelete);
    }, [duplicateGroups]);


    const filteredAndSortedInterventions = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();

        return allInterventions
            .filter(intervention => {
                // Assignment filter
                if (assignmentFilter === 'assigned' && !intervention.caseId) return false;
                if (assignmentFilter === 'unassigned' && intervention.caseId) return false;

                // Registration filter
                if (registrationFilter === 'registered' && !intervention.isRegistered) return false;
                if (registrationFilter === 'unregistered' && intervention.isRegistered) return false;

                // Type filter
                if (filterType && intervention.interventionType !== filterType) {
                    return false;
                }

                // Search query filter
                if (!searchQuery) return true;
                const titleMatch = intervention.title.toLowerCase().includes(lowerCaseQuery);
                const notesMatch = intervention.notes?.toLowerCase().includes(lowerCaseQuery);
                
                let caseMatch = false;
                if (intervention.caseId) {
                    const caseData = caseMap.get(intervention.caseId);
                    if (caseData) {
                        caseMatch = caseData.name.toLowerCase().includes(lowerCaseQuery) ||
                                    (caseData.nickname && caseData.nickname.toLowerCase().includes(lowerCaseQuery));
                    }
                }
                
                return titleMatch || notesMatch || caseMatch;
            })
            .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    }, [allInterventions, caseMap, searchQuery, filterType, assignmentFilter, registrationFilter]);

    // FIX: Explicitly typing the useMemo hook's return value fixes an inference issue where destructured variables were typed as 'unknown'.
    const { unassignedSelected, assignedSelected, canBeRegistered, canBeUnregistered } = useMemo<{
        unassignedSelected: Intervention[];
        assignedSelected: Intervention[];
        canBeRegistered: boolean;
        canBeUnregistered: boolean;
    }>(() => {
        const selected = allInterventions.filter(i => selectedInterventions.has(i.id));
        const unassignedSelected = selected.filter(i => !i.caseId);
        const assignedSelected = selected.filter(i => !!i.caseId);
        const canBeRegistered = assignedSelected.some(i => !i.isRegistered);
        const canBeUnregistered = assignedSelected.some(i => i.isRegistered);
        return { unassignedSelected, assignedSelected, canBeRegistered, canBeUnregistered };
    }, [selectedInterventions, allInterventions]);

    
    const handleToggleSelection = (id: string, isSelected: boolean) => {
        setSelectedInterventions(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleToggleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedInterventions(new Set(filteredAndSortedInterventions.map(i => i.id)));
        } else {
            setSelectedInterventions(new Set());
        }
    };

    const handleAssignmentChange = (interventionId: string, value: string | boolean, field: 'caseId' | 'isRegistered') => {
        setAssignments(prev => {
            const current = prev[interventionId] || { caseId: '', isRegistered: false };
            const updated = { ...current, [field]: value };
            
            if (field === 'caseId' && !value) {
                updated.isRegistered = false;
            }
    
            return {
                ...prev,
                [interventionId]: updated,
            };
        });
    };

    const handleSaveAssignment = (intervention: Intervention) => {
        const assignment = assignments[intervention.id];
        if (!assignment || !assignment.caseId) return;

        const updatedIntervention = { 
            ...intervention, 
            caseId: assignment.caseId,
            isRegistered: assignment.isRegistered ?? false
        };
        onSaveIntervention(updatedIntervention);
        
        setAssignments(prev => {
            const { [intervention.id]: _, ...rest } = prev;
            return rest;
        });
    };

    const handleBulkAssign = () => {
        if (!bulkAssignCaseId || unassignedSelected.length === 0) return;

        const interventionsToUpdate = unassignedSelected.map(i => ({
                ...i,
                caseId: bulkAssignCaseId,
                isRegistered: bulkRegister
            }));
        
        onBatchUpdateInterventions(interventionsToUpdate);

        setSelectedInterventions(new Set());
        setBulkAssignCaseId('');
        setBulkRegister(false);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setFilterType('');
        setAssignmentFilter('unassigned');
        setRegistrationFilter('all');
        setHasAppliedFilters(false);
        setSelectedInterventions(new Set());
    };
    
    const handleToggleRegistration = (intervention: Intervention) => {
        const isUnregistering = intervention.isRegistered;
        const action = () => {
            onSaveIntervention({ ...intervention, isRegistered: !intervention.isRegistered });
        };

        if (isUnregistering) {
            requestConfirmation(
                'Quitar del Cuaderno',
                '¿Seguro que quieres quitar esta intervención del cuaderno de campo? Seguirá existiendo en el calendario.',
                action
            );
        } else {
            action();
        }
    };
    
    const handleBulkRegister = () => {
        const interventionsToUpdate = assignedSelected
            .filter(i => !i.isRegistered)
            .map(i => ({ ...i, isRegistered: true }));
        
        if (interventionsToUpdate.length > 0) {
            onBatchUpdateInterventions(interventionsToUpdate);
        }
        setSelectedInterventions(new Set());
    };

    const handleBulkUnregister = () => {
        const interventionsToUpdate = assignedSelected.filter(i => i.isRegistered);

        if (interventionsToUpdate.length > 0) {
            requestConfirmation(
                `Quitar Registro de ${interventionsToUpdate.length} Intervenciones`,
                'Esta acción quitará las intervenciones seleccionadas del cuaderno de campo de sus respectivos casos. ¿Quieres continuar?',
                () => {
                    const updated = interventionsToUpdate.map(i => ({ ...i, isRegistered: false }));
                    onBatchUpdateInterventions(updated);
                    setSelectedInterventions(new Set());
                }
            );
        }
    };
    
    const handleBulkTypeCorrection = (invalidType: string) => {
        const newType = newTypeSelections[invalidType];
        if (!newType) return;

        const interventionsToUpdate = inconsistentInterventionsGrouped[invalidType];

        // FIX: Add a guard to ensure interventionsToUpdate is defined before accessing .length, resolving a type error where it could be 'unknown'.
        if (!Array.isArray(interventionsToUpdate)) {
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

    const handleIndividualTypeChange = (interventionId: string, newType: InterventionType) => {
        setIndividualTypeChanges(prev => ({
            ...prev,
            [interventionId]: newType,
        }));
    };

    const handleSaveIndividualTypeChange = (intervention: Intervention) => {
        const newType = individualTypeChanges[intervention.id];
        if (!newType) return;

        requestConfirmation(
            'Confirmar Cambio de Tipo',
            `¿Estás seguro de que quieres cambiar el tipo de "${intervention.title}" a "${newType}"?`,
            () => {
                onSaveIntervention({ ...intervention, interventionType: newType });
                setIndividualTypeChanges(prev => {
                    const { [intervention.id]: _, ...rest } = prev;
                    return rest;
                });
            }
        );
    };
    
    const handleBulkDeleteDuplicates = () => {
        if (allDuplicatesToDelete.length === 0) return;
        requestConfirmation(
            'Confirmar Eliminación de Duplicados',
            `¿Estás seguro de que quieres eliminar permanentemente ${allDuplicatesToDelete.length} intervenciones duplicadas? Esta acción es irreversible.`,
            () => {
                onBatchDeleteInterventions(allDuplicatesToDelete);
            }
        );
    };


    if (allInterventions.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 text-center">
                <h2 className="text-xl font-bold text-slate-800">Gestor de Intervenciones</h2>
                <p className="text-slate-500 mt-2">No hay ninguna intervención en el sistema.</p>
            </div>
        );
    }

    const isAllSelected = selectedInterventions.size > 0 && selectedInterventions.size === filteredAndSortedInterventions.length;
    const areFiltersActive = searchQuery || filterType || assignmentFilter !== 'unassigned' || registrationFilter !== 'all';
    const hasInconsistentData = Object.keys(inconsistentInterventionsGrouped).length > 0;


    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
             <h2 className="text-xl font-bold text-slate-800">Gestor de Intervenciones</h2>
             <p className="text-sm text-slate-600">Filtra, busca y gestiona todas las intervenciones del sistema, tanto generales como las asignadas a casos.</p>

            <div className="space-y-4">
                {hasInconsistentData && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                        <h3 className="font-bold text-amber-800 flex items-center gap-2"><IoConstructOutline /> Calidad de Datos: Tipos de Intervención Inconsistentes</h3>
                        <p className="text-sm text-amber-700">Hemos detectado intervenciones con tipos que ya no son válidos (excepto "Tarea", que se gestiona individualmente). Puedes corregirlos de forma masiva aquí.</p>
                        {Object.entries(inconsistentInterventionsGrouped).map(([type, interventions]) => (
                            <div key={type} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-md border border-amber-200">
                                <p className="text-sm">
                                    <span className="font-semibold text-slate-700">{interventions.length}</span> intervenciones encontradas con el tipo inválido: <strong className="text-red-600">"{type}"</strong>
                                </p>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium">Corregir a:</label>
                                    <select 
                                        className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                                        value={newTypeSelections[type] || ''}
                                        onChange={e => setNewTypeSelections(prev => ({ ...prev, [type]: e.target.value as InterventionType }))}
                                    >
                                        <option value="">Seleccionar tipo...</option>
                                        {allValidInterventionTypes.map(validType => <option key={validType} value={validType}>{validType}</option>)}
                                    </select>
                                    <button
                                        onClick={() => handleBulkTypeCorrection(type)}
                                        disabled={!newTypeSelections[type]}
                                        className="px-3 py-1.5 text-sm text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:bg-slate-400 font-semibold"
                                    >
                                        Actualizar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {duplicateGroups.length > 0 && (
                    <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg space-y-3">
                        <h3 className="font-bold text-sky-800 flex items-center gap-2"><IoDuplicateOutline /> Calidad de Datos: Duplicados de Intervención</h3>
                        <p className="text-sm text-sky-700">
                            Hemos detectado <span className="font-bold">{allDuplicatesToDelete.length}</span> intervenciones que podrían ser duplicados. El sistema marca para eliminar tipos genéricos ('Cita', 'Reunión', 'Otro') cuando existe una entrada más específica con el mismo título y fecha, o elimina copias si todas son genéricas. Revisa los grupos y confirma la limpieza.
                        </p>
                        <div className="text-right">
                            <button
                                onClick={handleBulkDeleteDuplicates}
                                className="px-4 py-2 text-sm text-white bg-sky-600 rounded-lg hover:bg-sky-700 font-semibold"
                            >
                                Eliminar {allDuplicatesToDelete.length} duplicados
                            </button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {duplicateGroups.map(group => (
                                <div key={group.id} className="p-3 bg-white rounded-md border border-sky-200">
                                    <h4 className="font-semibold text-slate-800 text-sm mb-2">{group.title} - {group.date}</h4>
                                    <div className="space-y-1">
                                        {group.toKeep.map(i => (
                                            <p key={i.id} className="text-xs p-1 rounded bg-emerald-100 text-emerald-800">
                                                <span className="font-bold">[Conservar]</span> Tipo: {i.interventionType}, Caso: {caseMap.get(i.caseId)?.name || 'General'}
                                            </p>
                                        ))}
                                        {group.toDelete.map(i => (
                                            <p key={i.id} className="text-xs p-1 rounded bg-red-100 text-red-800">
                                                <span className="font-bold">[Eliminar]</span> Tipo: {i.interventionType}, Caso: {caseMap.get(i.caseId)?.name || 'General'}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-200">
                <div className="relative flex-grow min-w-[200px]">
                    <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por título, notas, caso..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600 flex-shrink-0">Asignación:</label>
                    <select
                        value={assignmentFilter}
                        onChange={e => setAssignmentFilter(e.target.value as any)}
                        className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                    >
                        <option value="unassigned">Sin Asignar</option>
                        <option value="assigned">Asignadas</option>
                        <option value="all">Todas</option>
                    </select>
                </div>
                 <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600 flex-shrink-0">Registro:</label>
                    <select
                        value={registrationFilter}
                        onChange={e => setRegistrationFilter(e.target.value as any)}
                        className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                    >
                        <option value="all">Todos</option>
                        <option value="registered">Registradas</option>
                        <option value="unregistered">No Registradas</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600 flex-shrink-0">Tipo:</label>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                    >
                        <option value="">-- Todos --</option>
                        {allPresentInterventionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                 <button 
                    onClick={() => setHasAppliedFilters(true)}
                    className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2"
                >
                    <IoSearchOutline />
                    Aplicar Filtros
                </button>
                { (areFiltersActive || hasAppliedFilters) && (
                    <button onClick={handleClearFilters} className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-900">
                        <IoCloseCircleOutline className="text-lg"/> Limpiar Filtros
                    </button>
                )}
            </div>

            {hasAppliedFilters && selectedInterventions.size > 0 && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-3 sticky top-0 z-10">
                    <span className="font-semibold text-sm text-teal-800">{selectedInterventions.size} seleccionada(s)</span>
                    {unassignedSelected.length > 0 && (
                        <div className="flex items-center gap-4 border-l border-teal-200 pl-4">
                            <select
                                value={bulkAssignCaseId}
                                onChange={e => setBulkAssignCaseId(e.target.value)}
                                className="flex-grow px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                            >
                                <option value="">-- Asignar a un caso --</option>
                                {cases.map(c => <option key={c.id} value={c.id}>{c.name}{c.nickname ? ` (${c.nickname})` : ''}</option>)}
                            </select>
                            <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">
                                <input type="checkbox" checked={bulkRegister} onChange={e => setBulkRegister(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"/>
                                <IoBookOutline/> Registrar
                            </label>
                            <button
                                onClick={handleBulkAssign}
                                disabled={!bulkAssignCaseId}
                                className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed font-semibold"
                            >
                                Asignar ({unassignedSelected.length})
                            </button>
                        </div>
                    )}
                     {assignedSelected.length > 0 && (
                        <div className="flex items-center gap-2 border-l border-teal-200 pl-4">
                           <button
                                onClick={handleBulkRegister}
                                disabled={!canBeRegistered}
                                className="px-4 py-2 text-sm text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed font-semibold"
                            >
                                Registrar ({assignedSelected.filter(i => !i.isRegistered).length})
                            </button>
                             <button
                                onClick={handleBulkUnregister}
                                disabled={!canBeUnregistered}
                                className="px-4 py-2 text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed font-semibold"
                            >
                                Quitar Registro ({assignedSelected.filter(i => i.isRegistered).length})
                            </button>
                        </div>
                     )}
                </div>
            )}

            <div className="space-y-4 pt-4 border-t border-slate-200 max-h-[60vh] overflow-y-auto pr-2">
                {hasAppliedFilters ? (
                     <>
                        {filteredAndSortedInterventions.length > 0 ? (
                            <>
                                <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={e => handleToggleSelectAll(e.target.checked)}
                                        className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <label className="text-sm font-semibold text-slate-600">Seleccionar todo ({filteredAndSortedInterventions.length})</label>
                                </div>
                                {filteredAndSortedInterventions.map(inter => (
                                    <div key={inter.id} className={`p-4 rounded-md border ${selectedInterventions.has(inter.id) ? 'bg-teal-50/50 border-teal-300' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex items-start gap-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedInterventions.has(inter.id)}
                                                onChange={e => handleToggleSelection(inter.id, e.target.checked)}
                                                className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            />
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs text-slate-500">{new Date(inter.start).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' })}</p>
                                                        <h3 className="font-semibold text-slate-800">{inter.title}</h3>
                                                        {inter.notes && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{inter.notes}</p>}
                                                    </div>
                                                     <button 
                                                        onClick={() => onEditIntervention(inter)}
                                                        className="text-slate-400 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0 ml-2" 
                                                        title="Editar intervención"
                                                    >
                                                        <IoPencilOutline className="text-lg" />
                                                    </button>
                                                </div>
                                                
                                                {(inter.interventionType as string) === 'Tarea' && (
                                                    <div className="mt-3 pt-3 border-t border-amber-200 flex flex-wrap items-center gap-3 bg-amber-50 p-3 rounded-md">
                                                        <IoWarningOutline className="text-amber-600 text-xl flex-shrink-0" />
                                                        <label className="text-sm font-semibold text-amber-800">Reclasificar como:</label>
                                                        <select
                                                            value={individualTypeChanges[inter.id] || ''}
                                                            onChange={(e) => handleIndividualTypeChange(inter.id, e.target.value as InterventionType)}
                                                            className="flex-grow min-w-[200px] px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                                                        >
                                                            <option value="">-- Seleccionar tipo válido --</option>
                                                            {allValidInterventionTypes.map(type => (
                                                                <option key={type} value={type}>{type}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handleSaveIndividualTypeChange(inter)}
                                                            disabled={!individualTypeChanges[inter.id]}
                                                            className="p-2.5 text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                            title="Guardar cambio de tipo"
                                                        >
                                                            <IoSaveOutline className="text-xl"/>
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {inter.caseId ? (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                                        <span className="flex items-center gap-1 font-semibold text-teal-700 text-sm">
                                                            <IoPersonCircleOutline /> {caseMap.get(inter.caseId)?.name || 'Caso no encontrado'}
                                                        </span>
                                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={inter.isRegistered}
                                                                onChange={() => handleToggleRegistration(inter)}
                                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                            />
                                                            <IoBookOutline /> Registrar en Cuaderno
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3">
                                                        <select
                                                            value={assignments[inter.id]?.caseId || ''}
                                                            onChange={(e) => handleAssignmentChange(inter.id, e.target.value, 'caseId')}
                                                            className="flex-grow min-w-[200px] px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                                                        >
                                                            <option value="">-- Asignar a un caso --</option>
                                                            {cases.map(c => (
                                                                <option key={c.id} value={c.id}>{c.name}{c.nickname ? ` (${c.nickname})` : ''}</option>
                                                            ))}
                                                        </select>
                                                        <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700 whitespace-nowrap" title={!assignments[inter.id]?.caseId ? "Primero selecciona un caso para poder registrar la intervención" : "Registrar en el Cuaderno de Campo al asignar"}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={assignments[inter.id]?.isRegistered || false}
                                                                onChange={(e) => handleAssignmentChange(inter.id, e.target.checked, 'isRegistered')}
                                                                disabled={!assignments[inter.id]?.caseId}
                                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            />
                                                            <IoBookOutline/> Registrar
                                                        </label>
                                                        <button
                                                            onClick={() => handleSaveAssignment(inter)}
                                                            disabled={!assignments[inter.id]?.caseId}
                                                            className="p-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                            title="Guardar asignación"
                                                        >
                                                            <IoSaveOutline className="text-xl"/>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p className="text-center text-slate-500 py-6">
                                No se encontraron intervenciones que coincidan con tus filtros.
                            </p>
                        )}
                    </>
                ) : (
                    <div className="text-center text-slate-500 py-12 px-6 bg-slate-50 rounded-lg">
                        <IoSearchOutline className="mx-auto text-5xl text-slate-400 mb-4" />
                        <h3 className="font-semibold text-slate-600 text-lg">Gestionar Intervenciones</h3>
                        <p className="mt-1">Usa los filtros de arriba y pulsa "Aplicar Filtros" para buscar y gestionar las intervenciones del sistema.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterventionManager;