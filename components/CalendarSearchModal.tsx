import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Intervention, Case } from '../types';
import { IoCloseOutline, IoSearchOutline } from 'react-icons/io5';

interface CalendarSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    interventions: Intervention[];
    cases: Case[];
    onSelectIntervention: (intervention: Intervention) => void;
}

const CalendarSearchModal: React.FC<CalendarSearchModalProps> = ({
    isOpen,
    onClose,
    interventions,
    cases,
    onSelectIntervention
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    const filteredInterventions = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return interventions.filter(intervention => {
            const caseInfo = intervention.caseId ? cases.find(c => c.id === intervention.caseId) : null;
            const caseNameMatch = caseInfo ? caseInfo.name.toLowerCase().includes(term) : false;
            const caseNickMatch = caseInfo && caseInfo.nickname ? caseInfo.nickname.toLowerCase().includes(term) : false;
            const titleMatch = intervention.title.toLowerCase().includes(term);
            const notesMatch = intervention.notes ? intervention.notes.toLowerCase().includes(term) : false;
            const typeMatch = intervention.interventionType.toLowerCase().includes(term);
            return caseNameMatch || caseNickMatch || titleMatch || notesMatch || typeMatch;
        }).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()); // newest first
    }, [searchTerm, interventions, cases]);

    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('es-ES', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start pt-[10vh] z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden">
                <div className="flex items-center p-4 border-b border-slate-100 relative">
                    <IoSearchOutline className="text-slate-400 text-xl absolute left-7" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar en el calendario..."
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-teal-500 text-slate-800 placeholder-slate-400"
                    />
                    <button
                        onClick={onClose}
                        className="absolute right-6 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                    >
                        <IoCloseOutline className="text-xl" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-2">
                    {searchTerm.trim() === '' ? (
                        <div className="text-center py-10 text-slate-500">
                            Escribe para buscar citas en el calendario.
                        </div>
                    ) : filteredInterventions.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            No se encontraron resultados para "{searchTerm}".
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {filteredInterventions.map(intervention => {
                                const caseInfo = intervention.caseId ? cases.find(c => c.id === intervention.caseId) : null;
                                return (
                                    <li key={intervention.id}>
                                        <button
                                            onClick={() => {
                                                onSelectIntervention(intervention);
                                                onClose();
                                            }}
                                            className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-transparent hover:border-slate-100 group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">
                                                    {caseInfo ? `${caseInfo.name.split(' ')[0]} - ` : ''}{intervention.title}
                                                </span>
                                                <span className="text-sm text-slate-500 flex items-center gap-2">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                                                        {intervention.interventionType}
                                                    </span>
                                                    <span className="truncate max-w-[200px] sm:max-w-[300px]">
                                                        {intervention.notes}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-400 font-medium whitespace-nowrap group-hover:text-teal-600 transition-colors">
                                                {formatDate(intervention.start)}
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarSearchModal;
