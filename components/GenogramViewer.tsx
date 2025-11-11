import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IoCloseOutline, IoAddCircleOutline, IoRemoveCircleOutline, IoRefreshOutline } from 'react-icons/io5';

interface GenogramViewerProps {
  imageUrl: string;
  onClose: () => void;
}

const GenogramViewer: React.FC<GenogramViewerProps> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  const reset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
  }, [imageUrl, reset]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    const clampedScale = Math.max(0.5, Math.min(newScale, 5));
    
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const x = (mouseX - position.x) / scale;
        const y = (mouseY - position.y) / scale;

        const newX = mouseX - x * clampedScale;
        const newY = mouseY - y * clampedScale;
        
        setScale(clampedScale);
        setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    isPanningRef.current = true;
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastMousePositionRef.current.x;
    const dy = e.clientY - lastMousePositionRef.current.y;

    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const stopPanning = () => {
    isPanningRef.current = false;
    if (containerRef.current) containerRef.current.style.cursor = scale > 1 ? 'grab' : 'default';
  };
  
  const handleZoomIn = () => {
      setScale(s => Math.min(s * 1.5, 5));
  };
  const handleZoomOut = () => {
      setScale(s => Math.max(s / 1.5, 0.5));
  };

  return (
    <div 
        className="fixed inset-0 bg-black/80 flex justify-center items-center z-[60] p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
    >
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden"
            onClick={e => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopPanning}
            onMouseLeave={stopPanning}
            onWheel={handleWheel}
            style={{ cursor: scale > 1 ? 'grab' : 'default' }}
        >
            <img 
                src={imageUrl} 
                alt="Genograma familiar" 
                className="absolute top-1/2 left-1/2"
                style={{
                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isPanningRef.current ? 'none' : 'transform 0.1s ease-out',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                }}
            />
        </div>
        
        <div className="absolute top-4 right-4 flex items-center gap-2 z-[70]">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={handleZoomOut} className="text-white p-2 hover:bg-white/20 rounded-md" aria-label="Alejar"><IoRemoveCircleOutline className="text-2xl"/></button>
                <button onClick={reset} className="text-white p-2 hover:bg-white/20 rounded-md" aria-label="Restaurar zoom"><IoRefreshOutline className="text-2xl"/></button>
                <button onClick={handleZoomIn} className="text-white p-2 hover:bg-white/20 rounded-md" aria-label="Acercar"><IoAddCircleOutline className="text-2xl"/></button>
            </div>
            <button 
                onClick={onClose} 
                className="text-white bg-black/50 backdrop-blur-sm p-2 rounded-lg hover:bg-white/20"
                aria-label="Cerrar imagen"
            >
                <IoCloseOutline className="text-3xl" />
            </button>
        </div>
    </div>
  );
};

export default GenogramViewer;