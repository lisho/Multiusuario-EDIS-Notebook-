import React, { useState, useEffect, useRef } from 'react';
import { Intervention, ChatMessage } from '../types';
import { generateCaseSummary, createCaseInsightChat } from '../services/geminiService';
import { IoSparklesOutline, IoCloseOutline, IoSendOutline, IoCopyOutline, IoCheckmarkOutline } from 'react-icons/io5';
import { Chat } from '@google/genai';

interface AiInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  interventions: Intervention[];
}

type Stage = 'initial' | 'loading' | 'result' | 'error';

const AiInsightModal: React.FC<AiInsightModalProps> = ({ isOpen, onClose, interventions }) => {
  const [stage, setStage] = useState<Stage>('initial');
  const [insight, setInsight] = useState<{ summary: string; key_themes: string[]; recommendations: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    if (isOpen) {
      setStage('initial');
      setInsight(null);
      setError(null);
      setChatSession(null);
      setMessages([]);
      setInput('');
      setIsChatLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (interventions.length > 0) {
      setStage('loading');
      setError(null);
      setInsight(null);
      setMessages([]);
      generateCaseSummary(interventions)
        .then(data => {
          setInsight(data);
          setChatSession(createCaseInsightChat(interventions, data));
          setStage('result');
        })
        .catch(err => {
          console.error(err);
          setError('No se pudieron generar los insights. Por favor, inténtalo de nuevo más tarde.');
          setStage('error');
        });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading || !chatSession) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage, { role: 'model', content: '' }]);
    setInput('');
    setIsChatLoading(true);

    try {
        const stream = await chatSession.sendMessageStream({ message: input });
        let currentModelMessage = '';

        for await (const chunk of stream) {
            currentModelMessage += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'model', content: currentModelMessage };
                return newMessages;
            });
        }
    } catch (error) {
        console.error("Failed to send message to AI:", error);
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'model', content: 'Error al obtener respuesta.' };
            return newMessages;
        });
    } finally {
        setIsChatLoading(false);
    }
  };

  const renderContent = () => {
    switch(stage) {
      case 'loading':
        return (
          <div className="text-center py-10">
            <IoSparklesOutline className="text-5xl text-teal-500 mx-auto animate-pulse" />
            <p className="mt-4 text-slate-600">Generando análisis con IA... Esto puede tardar unos segundos.</p>
          </div>
        );

      case 'error':
        return (
            <div className="text-center py-10">
                <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                    <p className="font-semibold">Error</p>
                    <p>{error}</p>
                </div>
                <button onClick={handleGenerate} className="mt-6 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 font-semibold">
                    Intentar de Nuevo
                </button>
            </div>
        );
    
      case 'result':
        if (insight) {
          return (
            <div className="flex flex-col h-full">
              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm shrink-0">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-1">Resumen del Caso</h3>
                  <p className="text-slate-700 text-sm">{insight.summary}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-1">Temas Clave</h3>
                    <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
                      {insight.key_themes.map((theme, index) => <li key={index} className="pl-1 leading-relaxed">{theme}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-1">Recomendaciones sugeridas</h3>
                    <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
                      {insight.recommendations.map((rec, index) => <li key={index} className="pl-1 leading-relaxed">{rec}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex-grow flex flex-col min-h-[300px] bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 py-2 px-4 border-b border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700">Chat de profundización</h4>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                      <div className="text-center text-slate-500 p-4">
                          <IoSparklesOutline className="text-3xl mx-auto mb-2 opacity-50" />
                          <p className="text-sm">¿Tienes alguna pregunta sobre el análisis o quieres explorar un aspecto en detalle? Escríbelo aquí abajo.</p>
                      </div>
                  )}
                  {messages.map((msg, index) => {
                      const isUser = msg.role === 'user';
                      const isLastModelMessage = msg.role === 'model' && index === messages.length - 1 && isChatLoading;
                      return (
                          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`relative max-w-[85%] px-4 py-2 rounded-lg text-sm group ${isUser ? 'bg-teal-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                  {isLastModelMessage && <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-1" />}
                                  
                                  {!isUser && msg.content && (
                                     <button
                                         onClick={() => handleCopyMessage(msg.content, index)}
                                         className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white text-slate-500 rounded border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                         title="Copiar respuesta"
                                     >
                                         {copiedIndex === index ? <IoCheckmarkOutline className="text-teal-600" /> : <IoCopyOutline />}
                                     </button>
                                  )}
                              </div>
                          </div>
                      );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
                  <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ej. ¿Qué temas destacan más en el ámbito relacional?"
                      className="flex-grow px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      disabled={isChatLoading}
                  />
                  <button
                      type="submit"
                      className="bg-teal-600 text-white w-10 h-10 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors disabled:bg-slate-400"
                      disabled={isChatLoading || !input.trim()}
                  >
                      <IoSendOutline className="text-lg" />
                  </button>
                </form>
              </div>
            </div>
          );
        }
        return null;

      case 'initial':
      default:
         return (
            <div className="text-center py-10 flex flex-col items-center">
                <div className="p-3 bg-teal-100 rounded-full">
                    <IoSparklesOutline className="text-4xl text-teal-600" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800">Análisis del Caso con IA</h3>
                <p className="mt-2 text-slate-600 max-w-md">
                    Obtén un resumen estructurado y la posibilidad de chatear sobre el contenido y evolución del caso.
                </p>
                <button
                    onClick={handleGenerate}
                    className="mt-8 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    Generar Análisis
                </button>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl m-4 h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white z-10 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IoSparklesOutline className="text-teal-500 text-2xl" />
            Análisis con IA
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100">
            <IoCloseOutline className="text-2xl" />
          </button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto bg-slate-50/50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AiInsightModal;