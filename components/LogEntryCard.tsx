import React from 'react';
// FIX: The 'LogEntry' type is not exported from '../types'. Replaced with 'Intervention' as it matches the component's usage.
import { Intervention } from '../types';

interface LogEntryCardProps {
    // FIX: The 'LogEntry' type is not exported from '../types'. Replaced with 'Intervention'.
    entry: Intervention;
}

const LogEntryCard: React.FC<LogEntryCardProps> = ({ entry }) => {
    // FIX: The 'Intervention' type uses 'start' for its date property, not 'date'.
    const formattedDate = new Date(entry.start).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-md text-gray-800">{entry.title}</h4>
                    <p className="text-sm text-gray-500">{entry.interventionType}</p>
                </div>
                <p className="text-sm text-gray-500">{formattedDate}</p>
            </div>
            <p className="text-gray-700 mt-2 whitespace-pre-wrap">{entry.notes}</p>
        </div>
    );
};

export default LogEntryCard;
