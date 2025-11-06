import { GoogleGenAI, Type, Chat } from '@google/genai';
import { Intervention, Case, InterventionMoment } from '../types';

// Per coding guidelines, API_KEY is assumed to be present in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: 'Un breve resumen del estado actual del caso y su progreso reciente.',
        },
        key_themes: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
            },
            description: 'Una lista de temas recurrentes, desafíos o fortalezas observadas.',
        },
        recommendations: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
            },
            description: 'Sugerencias accionables para los próximos pasos o áreas en las que centrarse en futuras intervenciones.',
        },
    },
    required: ["summary", "key_themes", "recommendations"],
};

export const generateCaseSummary = async (interventions: Intervention[]): Promise<{ summary: string; key_themes: string[]; recommendations: string[] }> => {
    
    const formattedEntries = interventions
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .map(entry => `
Fecha: ${new Date(entry.start).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}
Tipo: ${entry.interventionType}
Título: ${entry.title}
Notas: ${entry.notes}
        `)
        .join('\n---\n');

    const prompt = `
Eres un supervisor experto en trabajo social especializado en casos complejos de inclusión.
Analiza las siguientes entradas cronológicas del cuaderno de campo para un único individuo.
Basándote en estas notas, proporciona un análisis conciso y estructurado.
Tu respuesta DEBE ser un objeto JSON válido con la siguiente estructura:
{
  "summary": "Un breve resumen del estado actual del caso y su progreso reciente.",
  "key_themes": ["Una lista de temas recurrentes, desafíos o fortalezas observadas."],
  "recommendations": ["Sugerencias accionables para los próximos pasos o áreas en las que centrarse en futuras intervenciones."]
}

No incluyas ningún texto fuera del objeto JSON.

Aquí están las entradas del cuaderno de campo:

---
${formattedEntries}
---
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.5,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to generate case summary from AI.');
    }
};

const getSystemInstruction = (moment: InterventionMoment): string => {
    const momentMap: Record<InterventionMoment, string> = {
        [InterventionMoment.Welcome]: "Acogida. El objetivo es establecer el primer contacto, entender el motivo de la consulta y las expectativas iniciales.",
        [InterventionMoment.Diagnosis]: "Diagnóstico. El objetivo es analizar en profundidad las diferentes áreas de la vida de la persona (DAFO, red de apoyo, situación laboral, etc.).",
        [InterventionMoment.Planning]: "Planificación. El objetivo es definir metas y acciones concretas en un plan de trabajo conjunto.",
        [InterventionMoment.Accompaniment]: "Acompañamiento. El objetivo es realizar un seguimiento de los avances, identificar nuevas barreras y ajustar el plan.",
    };

    return `Eres un asistente experto en intervención social, actuando como un supervisor virtual para un profesional. Tu rol es ayudar al profesional a explorar y profundizar en los aspectos clave de un caso durante la fase de ${momentMap[moment]}.
    
Te basarás únicamente en la información del caso que se te proporciona. Tu objetivo es hacer preguntas reflexivas, sugerir áreas a investigar y proponer posibles temas de conversación para las próximas intervenciones.
    
Sé conciso, socrático y colaborativo. No inventes información. Siempre basa tus sugerencias en los datos disponibles. Responde en español.`;
};

const getCaseContext = (caseData: Case): string => {
    const recentEntries = caseData.interventions
        .slice(0, 3)
        .map(e => `- ${e.title}: ${e.notes ? e.notes.substring(0, 100) + '...' : ''}`)
        .join('\n');

    const pendingTasks = caseData.tasks
        .filter(t => !t.completed)
        .map(t => `- ${t.text}`)
        .join('\n');
    
    const displayName = caseData.nickname ? `${caseData.name} (${caseData.nickname})` : caseData.name;
    return `Contexto del caso de ${displayName}:
### Notas de Perfil
${caseData.profileNotes || 'No hay notas de perfil.'}

### Intervenciones Recientes
${recentEntries || 'No hay intervenciones recientes.'}

### Tareas Pendientes
${pendingTasks || 'No hay tareas pendientes.'}

Inicia la conversación saludando al profesional y preguntándole en qué aspecto de la fase actual le gustaría profundizar.`;
};


export const createExplorationChat = (caseData: Case, moment: InterventionMoment): Chat => {
    const systemInstruction = getSystemInstruction(moment);
    const caseContext = getCaseContext(caseData);

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
        history: [
            {
                role: 'user',
                parts: [{ text: caseContext }],
            }
        ]
    });
    return chat;
};

const csvMappingResponseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, nullable: true, description: 'La cabecera del CSV que corresponde al título.' },
        start: { type: Type.STRING, nullable: true, description: 'La cabecera para la fecha/hora de inicio.' },
        end: { type: Type.STRING, nullable: true, description: 'La cabecera para la fecha/hora de fin.' },
        interventionType: { type: Type.STRING, nullable: true, description: 'La cabecera para el tipo de intervención.' },
        notes: { type: Type.STRING, nullable: true, description: 'La cabecera para las notas.' },
        caseId: { type: Type.STRING, nullable: true, description: 'La cabecera para el ID o nombre del caso asociado.' },
        isAllDay: { type: Type.STRING, nullable: true, description: 'La cabecera que indica si es de día completo (valores como "true", "si", etc.).' },
        isRegistered: { type: Type.STRING, nullable: true, description: 'La cabecera que indica si se registra en el cuaderno.' },
    },
};

export const mapCsvHeaders = async (csvHeaders: string[]): Promise<Record<string, string | null>> => {
    const prompt = `
Eres un asistente inteligente de mapeo de datos. Tu tarea es mapear las columnas de un CSV proporcionado por el usuario a los campos de la estructura de datos 'Intervention'.

La estructura 'Intervention' tiene estos campos:
- title: string (El título principal del evento)
- start: string (Fecha y hora de inicio. Puede ser un formato como 'YYYY-MM-DD HH:mm', 'DD/MM/YYYY HH:mm' o texto como '19 de marzo de 2025'. Si solo hay fecha y no hora, se considerará un evento de día completo.)
- end: string (Fecha y hora de fin. Mismo formato que 'start'. Si se omite para un evento de día completo, se usará la fecha de inicio.)
- interventionType: string (Tipo de evento, ej: 'Reunión')
- notes: string (Notas detalladas)
- caseId: string (ID o Nombre del caso asociado. Puede ser nulo/vacío para eventos generales)
- isAllDay: boolean (Si el evento dura todo el día. Si una columna de fecha no tiene hora, esto se infiere como 'true' automáticamente.)
- isRegistered: boolean (Si se registra en el cuaderno de campo)

NOTA: El campo 'status' no se mapea; todos los eventos se importarán como 'Completada'.

Estas son las cabeceras del CSV del usuario:
[ ${csvHeaders.join(', ')} ]

Tu respuesta DEBE ser un objeto JSON válido. Las claves deben ser los campos de 'Intervention' listados arriba. Los valores deben ser la cabecera del CSV que mejor corresponda. Si no encuentras una correspondencia clara para un campo, usa null como valor.
Si varias cabeceras parecen corresponder a una fecha (ej. "Fecha Inicio", "Hora Inicio"), elige la más completa o la de inicio para los campos 'start' y 'end'.

Ejemplo de respuesta para las cabeceras ['Asunto', 'Fecha', 'Detalles', 'ID Caso']:
{
  "title": "Asunto",
  "start": "Fecha",
  "end": null,
  "interventionType": null,
  "notes": "Detalles",
  "caseId": "ID Caso",
  "isAllDay": null,
  "isRegistered": null
}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: csvMappingResponseSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('Error mapping CSV headers with Gemini API:', error);
        throw new Error('Failed to get AI-powered column mapping.');
    }
};