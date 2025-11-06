import React, { useState, useEffect } from 'react';
import { Intervention } from '../types';
import { generateCaseSummary } from '../services/geminiService';
import { IoSparklesOutline, IoCloseOutline } from 'react-icons/io5';

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

  useEffect(() => {
    if (isOpen) {
      setStage('initial');
      setInsight(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (interventions.length > 0) {
      setStage('loading');
      setError(null);
      setInsight(null);
      generateCaseSummary(interventions)
        .then(data => {
          setInsight(data);
          setStage('result');
        })
        .catch(err => {
          console.error(err);
          setError('No se pudieron generar los insights. Por favor, inténtalo de nuevo más tarde.');
          setStage('error');
        });
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
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Resumen del Caso</h3>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{insight.summary}</p>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Temas Clave</h3>
                <ul className="list-disc list-inside text-slate-700 bg-slate-50 p-3 rounded-lg space-y-1">
                  {insight.key_themes.map((theme, index) => <li key={index}>{theme}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Recomendaciones</h3>
                <ul className="list-disc list-inside text-slate-700 bg-slate-50 p-3 rounded-lg space-y-1">
                  {insight.recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
                </ul>
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
                    Obtén un resumen, temas clave y recomendaciones accionables basadas en las intervenciones registradas en el cuaderno.
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IoSparklesOutline className="text-teal-500 text-2xl" />
            Análisis con IA
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <IoCloseOutline className="text-3xl" />
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default AiInsightModal;