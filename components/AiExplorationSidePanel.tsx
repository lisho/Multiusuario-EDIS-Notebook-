import React, { useState, useEffect } from 'react';
import { Case, InterventionMoment } from '../types';
import AiExplorationChat from './AiExplorationChat';
import { IoChatbubblesOutline, IoCloseOutline } from 'react-icons/io5';

interface AiExplorationSidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: Case;
    moment: InterventionMoment | undefined;
}

const AiExplorationSidePanel: React.FC<AiExplorationSidePanelProps> = ({ isOpen, onClose, caseData, moment }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Delay visibility to allow the component to mount before animating
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        // Wait for animation to finish before calling parent's onClose
        setTimeout(onClose, 300);
    };
    
    // The whole component is only rendered by parent when isOpen is true,
    // so we don't need to return null if !isOpen
    
    return (
        <div 
            className={`fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-panel-title"
        >
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black bg-opacity-50" 
                onClick={handleClose} 
                aria-hidden="true"
            />
            
            {/* Panel */}
            <div 
                className={`absolute top-0 right-0 h-full w-full max-w-lg bg-slate-50 shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <IoChatbubblesOutline className="text-2xl text-teal-600" />
                        <h2 id="ai-panel-title" className="text-xl font-bold text-slate-800">Exploración Asistida por IA</h2>
                    </div>
                    <button onClick={handleClose} className="text-slate-500 hover:text-slate-800" aria-label="Cerrar panel de IA">
                        <IoCloseOutline className="text-3xl" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6">
                    {moment ? (
                        <AiExplorationChat caseData={caseData} moment={moment} />
                    ) : (
                        <div className="text-center text-slate-500">
                            <p>No hay un momento de intervención activo para iniciar el chat.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiExplorationSidePanel;