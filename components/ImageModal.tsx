import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IoCloseOutline, IoAddCircleOutline, IoRemoveCircleOutline, IoRefreshOutline } from 'react-icons/io5';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, altText }) => {
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
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    const clampedScale = Math.max(0.5, Math.min(newScale, 5));
    
    // Zoom towards cursor
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
    if (!isPanningRef.current || scale <= 1) return;
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

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60] p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
    >
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white hover:text-slate-300 z-[70]"
            aria-label="Cerrar imagen"
        >
            <IoCloseOutline className="text-4xl" />
        </button>
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
                alt={altText} 
                className="absolute top-1/2 left-1/2"
                style={{
                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isPanningRef.current ? 'none' : 'transform 0.1s ease-out',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                }}
            />
        </div>
        <div className="absolute bottom-4 right-4 bg-black/50 rounded-lg p-1 flex items-center gap-1 z-[70]">
            <button onClick={handleZoomOut} className="text-white p-2 hover:bg-white/20 rounded-md" aria-label="Alejar"><IoRemoveCircleOutline className="text-2xl"/></button>
            <button onClick={reset} className="text-white p-2 hover:bg-white/20 rounded-md" aria-label="Restaurar zoom"><IoRefreshOutline className="text-2xl"/></button>
            <button onClick={handleZoomIn} className="text-white p-2 hover:bg-white/20 rounded-md" aria-label="Acercar"><IoAddCircleOutline className="text-2xl"/></button>
        </div>
    </div>
  );
};

export default ImageModal;
