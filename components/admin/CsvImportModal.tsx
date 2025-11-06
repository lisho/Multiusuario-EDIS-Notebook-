import React, { useState, useCallback } from 'react';
import { Case, Intervention, InterventionStatus, InterventionType } from '../../types';
import { mapCsvHeaders } from '../../services/geminiService';
import { IoCloseOutline, IoCloudUploadOutline, IoDocumentTextOutline, IoArrowForwardOutline, IoSparklesOutline, IoCheckmarkCircleOutline, IoWarningOutline, IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (interventions: (Omit<Intervention, 'id'>)[]) => Promise<void>;
    cases: Case[];
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'result';
type MappableIntervention = Pick<Intervention, 'title' | 'start' | 'end' | 'interventionType' | 'notes' | 'caseId' | 'isAllDay' | 'isRegistered'>;
type Mappings = Record<keyof MappableIntervention, string | null>;
type RowError = { field: keyof MappableIntervention, message: string };
type ProcessedEvent = {
    data: Partial<Omit<Intervention, 'id'>>;
    errors: RowError[];
    originalRow: Record<string, string>;
    originalRowIndex: number;
};

const parseCSV = (csvText: string): { headers: string[], data: Array<Record<string, string>> } => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 1) return { headers: [], data: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
            row[header] = (values[i] || '').trim().replace(/"/g, '');
        });
        return row;
    });
    return { headers, data };
};

const spanishMonths: { [key: string]: number } = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

const parseDate = (dateString: string): { date: Date | null, timeFound: boolean } => {
    if (!dateString) return { date: null, timeFound: false };

    // Try standard ISO/JS parsing first
    const standardDate = new Date(dateString);
    if (!isNaN(standardDate.getTime())) {
        const hasTime = dateString.includes(':') || dateString.toLowerCase().includes('t');
        return { date: standardDate, timeFound: hasTime };
    }

    // Spanish short format: DD/MM/YYYY HH:mm
    const spanishRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T]?(\d{1,2}):(\d{1,2}))?/;
    let match = dateString.match(spanishRegex);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        const hour = parseInt(match[4] || '0', 10);
        const minute = parseInt(match[5] || '0', 10);
        const spanishDate = new Date(year, month, day, hour, minute);
        if (!isNaN(spanishDate.getTime())) {
            const timeFound = !!(match[4] && match[5]);
            return { date: spanishDate, timeFound };
        }
    }
    
    // Spanish long format: DD de MONTH de YYYY
    const longDateRegex = /(\d{1,2}) de (\w+) de (\d{4})/i;
    match = dateString.match(longDateRegex);
    if (match) {
        const day = parseInt(match[1], 10);
        const monthName = match[2].toLowerCase();
        const year = parseInt(match[3], 10);
        const month = spanishMonths[monthName];
        if (month !== undefined) {
             const longDate = new Date(year, month, day);
             if (!isNaN(longDate.getTime())) {
                 return { date: longDate, timeFound: false }; // No time in this format
             }
        }
    }
    
    return { date: null, timeFound: false };
};

const isoToInputDateTimeLocal = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Adjust for timezone offset to display local time correctly in the input
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
};

const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImport, cases }) => {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<Array<Record<string, string>>>([]);
    const [userMappings, setUserMappings] = useState<Mappings>({} as Mappings);
    const [processedEvents, setProcessedEvents] = useState<ProcessedEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ success: number, failed: number } | null>(null);
    const [expandedErrors, setExpandedErrors] = useState<Record<number, boolean>>({});

    const targetFields: { key: keyof MappableIntervention, label: string, required: boolean }[] = [
        { key: 'title', label: 'Título', required: true },
        { key: 'start', label: 'Fecha de Inicio', required: true },
        { key: 'end', label: 'Fecha de Fin', required: false },
        { key: 'interventionType', label: 'Tipo de Intervención', required: true },
        { key: 'notes', label: 'Notas', required: false },
        { key: 'caseId', label: 'Caso (Nombre o ID)', required: false },
        { key: 'isAllDay', label: 'Todo el día (true/false)', required: false },
        { key: 'isRegistered', label: 'Registrado en Cuaderno', required: false },
    ];

    const resetState = () => {
        setStep('upload'); setFile(null); setCsvHeaders([]); setCsvData([]);
        setUserMappings({} as Mappings); setProcessedEvents([]); setIsLoading(false);
        setError(null); setImportResult(null); setExpandedErrors({});
    };

    const handleClose = () => { resetState(); onClose(); };

    const handleFileChange = async (selectedFile: File | null) => {
        if (!selectedFile) return;
        setIsLoading(true); setError(null); setFile(selectedFile);
        try {
            const text = await selectedFile.text();
            const { headers, data } = parseCSV(text);
            if (headers.length === 0 || data.length === 0) throw new Error("El archivo CSV está vacío o tiene un formato incorrecto.");
            setCsvHeaders(headers); setCsvData(data);
            const mappings = await mapCsvHeaders(headers) as Mappings;
            setUserMappings(mappings); setStep('mapping');
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al procesar el archivo.");
            setFile(null);
        } finally { setIsLoading(false); }
    };
    
    const handleMappingChange = (field: keyof MappableIntervention, value: string) => {
        setUserMappings(prev => ({ ...prev, [field]: value === '' ? null : value }));
    };

    const validateRow = (rowData: Partial<Omit<Intervention, 'id'>>): RowError[] => {
        const errors: RowError[] = [];
        if (!rowData.title) errors.push({ field: 'title', message: 'El título es obligatorio.' });
        if (!rowData.start) errors.push({ field: 'start', message: 'La fecha de inicio es obligatoria.' });
        if (!rowData.interventionType) errors.push({ field: 'interventionType', message: 'El tipo es obligatorio.' });
        if (rowData.start && rowData.end && new Date(rowData.end) < new Date(rowData.start)) {
            errors.push({ field: 'end', message: 'La fecha de fin no puede ser anterior a la de inicio.' });
        }
        return errors;
    }

    const processAndPreview = () => {
        setIsLoading(true);
        const results: ProcessedEvent[] = csvData.map((row, index) => {
            let event: Partial<Omit<Intervention, 'id'>> = {};
            const errors: RowError[] = [];
            let inferredAllDay = false;

            targetFields.forEach(field => {
                const csvHeader = userMappings[field.key];
                const value = csvHeader ? row[csvHeader] : undefined;

                if (value !== undefined && value.trim() !== '') {
                    try {
                        switch (field.key) {
                            case 'title': event.title = value; break;
                            case 'notes': event.notes = value; break;
                            case 'interventionType': event.interventionType = value as InterventionType; break;
                            case 'caseId': event.caseId = value; break;
                            case 'isRegistered': 
                                event.isRegistered = ['true', 'si', '1', 'yes'].includes(value.toLowerCase());
                                break;
                            case 'start':
                                const { date, timeFound } = parseDate(value);
                                if (!date) throw new Error(`Formato de fecha inválido.`);
                                event.start = date.toISOString();
                                if (!timeFound) inferredAllDay = true;
                                break;
                            case 'end':
                                const { date: endDate } = parseDate(value);
                                if (!endDate) throw new Error(`Formato de fecha inválido.`);
                                event.end = endDate.toISOString();
                                break;
                            case 'isAllDay': // Handled separately after loop
                                break; 
                        }
                    } catch(e) { 
                        errors.push({ field: field.key, message: e instanceof Error ? e.message : `Error en el campo.`}); 
                    }
                }
            });

            const allDayHeader = userMappings.isAllDay;
            if (allDayHeader && row[allDayHeader] !== undefined && row[allDayHeader].trim() !== '') {
                event.isAllDay = ['true', 'si', '1', 'yes'].includes(row[allDayHeader].toLowerCase());
            } else {
                event.isAllDay = inferredAllDay;
            }

            if (event.start && !event.end) {
                const startDate = new Date(event.start);
                if (event.isAllDay) {
                    event.end = event.start;
                } else {
                    event.end = new Date(startDate.getTime() + 60 * 60 * 1000).toISOString();
                }
            }

            event.status = InterventionStatus.Completed;

            const validationErrors = validateRow(event);
            return { data: event, errors: [...errors, ...validationErrors], originalRow: row, originalRowIndex: index };
        });
        setProcessedEvents(results);
        setStep('preview');
        setIsLoading(false);
    };

    const handleEventUpdate = (rowIndex: number, field: keyof MappableIntervention, newValue: string) => {
        const newProcessedEvents = [...processedEvents];
        const eventToUpdate = newProcessedEvents.find(e => e.originalRowIndex === rowIndex);
        if (!eventToUpdate) return;
        
        let updatedData = { ...eventToUpdate.data };
        if (field === 'start' || field === 'end') {
            const parsed = new Date(newValue);
            if (!isNaN(parsed.getTime())) {
                updatedData[field] = parsed.toISOString();
            }
        } else {
            (updatedData as any)[field] = newValue;
        }

        const newErrors = validateRow(updatedData);
        eventToUpdate.data = updatedData;
        eventToUpdate.errors = newErrors;
        setProcessedEvents(newProcessedEvents);
    };

    const handleImportClick = async () => {
        setIsLoading(true); setStep('importing');
        const validEvents = processedEvents.filter(p => p.errors.length === 0).map(p => p.data as Omit<Intervention, 'id'>);
        try {
            await onImport(validEvents);
            setImportResult({ success: validEvents.length, failed: processedEvents.length - validEvents.length });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Un error desconocido ocurrió durante la importación.");
        } finally {
            setIsLoading(false); setStep('result');
        }
    };
    
    const downloadTemplate = () => {
        const headers = ['title', 'start', 'end', 'interventionType', 'notes', 'caseId', 'isAllDay', 'isRegistered'];
        const exampleRow = [`"Reunión de seguimiento"`, `"15 de agosto de 2024"`, `""`, `"${InterventionType.Meeting}"`, `"Hablamos sobre los avances."`, `"Nombre Completo del Caso"`, '', 'true'];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + exampleRow.join(',');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "plantilla_importacion.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    const renderUploadStep = () => (
        <div className="text-center">
            <IoCloudUploadOutline className="mx-auto text-5xl text-teal-500" />
            <h3 className="text-xl font-semibold text-slate-800 mt-4">Cargar archivo CSV</h3>
            <p className="text-slate-500 mt-2">Arrastra y suelta tu archivo aquí o haz clic para seleccionarlo.</p>
            <input type="file" accept=".csv" onChange={e => handleFileChange(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <button onClick={downloadTemplate} className="mt-4 text-sm text-teal-600 hover:underline">Descargar plantilla de ejemplo</button>
        </div>
    );

    const renderMappingStep = () => (
        <div>
             <h3 className="text-xl font-semibold text-slate-800 mb-2 flex items-center gap-2"><IoSparklesOutline className="text-teal-500"/> Mapeo Asistido por IA</h3>
             <p className="text-sm text-slate-600 mb-4">Revisa y ajusta las columnas del CSV que corresponden a cada campo del sistema.</p>
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {targetFields.map(field => (
                    <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                        <label className="font-semibold text-slate-700 text-sm text-right">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
                        <select
                            value={userMappings[field.key] || ''}
                            onChange={e => handleMappingChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                        >
                            <option value="">-- No importar --</option>
                            {csvHeaders.map(header => <option key={header} value={header}>{header}</option>)}
                        </select>
                    </div>
                ))}
             </div>
        </div>
    );
    
    const renderPreviewStep = () => {
        const validEventsCount = processedEvents.filter(p => p.errors.length === 0).length;
        const invalidEvents = processedEvents.filter(p => p.errors.length > 0);
        return (
            <div>
                 <h3 className="text-xl font-semibold text-slate-800 mb-2">Revisión y Validación</h3>
                 <div className="p-4 bg-slate-100 rounded-lg flex justify-around text-center mb-4">
                    <div><p className="text-2xl font-bold text-slate-700">{processedEvents.length}</p><p className="text-sm text-slate-500">Filas Totales</p></div>
                    <div><p className="text-2xl font-bold text-emerald-600">{validEventsCount}</p><p className="text-sm text-slate-500">Listas para Importar</p></div>
                    <div><p className="text-2xl font-bold text-red-600">{invalidEvents.length}</p><p className="text-sm text-slate-500">Con Errores</p></div>
                 </div>
                 {invalidEvents.length > 0 && (
                     <div className="space-y-2">
                         <h4 className="font-semibold text-red-700 mb-2">Filas con errores (corrige para incluirlas en la importación):</h4>
                         <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {invalidEvents.map(event => {
                                const isExpanded = expandedErrors[event.originalRowIndex] ?? false;
                                return(
                                <div key={event.originalRowIndex} className={`p-3 rounded-lg border ${event.errors.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedErrors(p => ({...p, [event.originalRowIndex]: !isExpanded}))}>
                                        <div className="flex items-center gap-2">
                                            {event.errors.length === 0 
                                                ? <IoCheckmarkCircleOutline className="text-emerald-500"/> 
                                                : <IoWarningOutline className="text-red-500"/>}
                                            <p className="font-semibold text-sm text-slate-800">Fila {event.originalRowIndex + 2}: <span className="font-normal">{event.data.title || event.originalRow[userMappings.title || ''] || 'Sin título'}</span></p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                           {event.errors.length > 0 && <span className="text-xs font-bold text-red-700 bg-red-200 px-1.5 py-0.5 rounded-full">{event.errors.length}</span>}
                                           {isExpanded ? <IoChevronUpOutline/> : <IoChevronDownOutline/>}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-red-200/50 space-y-2 text-sm">
                                            {event.errors.map((err, i) => (
                                                <div key={i}>
                                                     <label className="font-semibold text-slate-600">{targetFields.find(f => f.key === err.field)?.label}</label>
                                                    <p className="text-red-600 text-xs mb-1">{err.message} (Valor original: "{event.originalRow[userMappings[err.field] || ''] || ''}")</p>
                                                     { (err.field === 'start' || err.field === 'end') ? (
                                                        <input type="datetime-local"
                                                            defaultValue={isoToInputDateTimeLocal(event.data[err.field])}
                                                            onChange={e => handleEventUpdate(event.originalRowIndex, err.field, e.target.value)}
                                                            className="w-full text-xs p-1 border rounded-md border-slate-300"
                                                        />
                                                     ) : (
                                                        <input type="text"
                                                            defaultValue={(event.data as any)[err.field] || ''}
                                                            onChange={e => handleEventUpdate(event.originalRowIndex, err.field, e.target.value)}
                                                            className="w-full text-xs p-1 border rounded-md border-slate-300"
                                                        />
                                                     )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )})}
                         </div>
                     </div>
                 )}
            </div>
        );
    };

    const renderResultStep = () => (
         <div className="text-center py-8">
            {error ? (
                 <><IoWarningOutline className="mx-auto text-5xl text-red-500" /><h3 className="text-xl font-semibold text-slate-800 mt-4">Error en la Importación</h3><p className="text-slate-500 mt-2 bg-red-50 p-2 rounded-md">{error}</p></>
            ) : (
                <><IoCheckmarkCircleOutline className="mx-auto text-5xl text-emerald-500" /><h3 className="text-xl font-semibold text-slate-800 mt-4">Importación Completada</h3><p className="text-slate-500 mt-2">Se importaron <span className="font-bold text-emerald-700">{importResult?.success}</span> eventos con éxito.</p>{importResult && importResult.failed > 0 && <p className="text-slate-500">Se omitieron <span className="font-bold text-red-700">{importResult?.failed}</span> filas con errores.</p>}</>
            )}
         </div>
    );
    
    const renderContent = () => {
        if (isLoading) { return (<div className="text-center py-10"><IoSparklesOutline className="text-5xl text-teal-500 mx-auto animate-pulse" /><p className="mt-4 text-slate-600">{step === 'mapping' ? 'Analizando tu archivo con IA...' : 'Procesando datos...'}</p></div>); }
        if (step === 'importing') { return (<div className="text-center py-10"><IoSparklesOutline className="text-5xl text-teal-500 mx-auto animate-pulse" /><p className="mt-4 text-slate-600">Importando eventos... Esto puede tardar unos segundos.</p></div>); }
        switch (step) {
            case 'upload': return <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-10 hover:border-teal-500 transition-colors">{renderUploadStep()}</div>;
            case 'mapping': return renderMappingStep();
            case 'preview': return renderPreviewStep();
            case 'result': return renderResultStep();
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><IoDocumentTextOutline className="text-teal-600"/>Asistente de Importación CSV</h2>
                    <button onClick={handleClose} className="text-slate-500 hover:text-slate-800"><IoCloseOutline className="text-3xl" /></button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {error && <div className="p-3 bg-red-100 text-red-800 rounded-md mb-4">{error}</div>}
                    {renderContent()}
                </div>
                <div className="flex justify-between items-center p-4 mt-auto border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <span className="text-xs text-slate-400">Paso {step === 'upload' ? 1 : step === 'mapping' ? 2 : step === 'preview' ? 3 : 4} de 4</span>
                    <div className="flex gap-4">
                        <button type="button" onClick={handleClose} className="py-2 px-4 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold">{step === 'result' ? 'Cerrar' : 'Cancelar'}</button>
                         {step === 'mapping' && (<button type="button" onClick={processAndPreview} className="py-2 px-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2">Siguiente <IoArrowForwardOutline/></button>)}
                         {step === 'preview' && (<button type="button" onClick={handleImportClick} disabled={processedEvents.filter(p => p.errors.length === 0).length === 0} className="py-2 px-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed">Importar {processedEvents.filter(p => p.errors.length === 0).length} Eventos</button>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CsvImportModal;