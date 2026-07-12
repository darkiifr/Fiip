import { Save, X, Eraser, Undo, Redo, Square, Circle, Minus, Paintbrush } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

export default function CanvasDraw({ onSave, onClose, initialImage, isOverlay }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [color, setColor] = useState("#3b82f6");
    const [brushSize, setBrushSize] = useState(2);
    const [opacity, setOpacity] = useState(1);
    const [tool, setTool] = useState('brush');
    const [snapshot, setSnapshot] = useState(null);
    
    // History
    const [history, setHistory] = useState([]);
    const [historyStep, setHistoryStep] = useState(-1);

    const saveToHistory = () => {
        const canvas = canvasRef.current;
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(canvas.toDataURL());
        if (newHistory.length > 20) { newHistory.shift(); }
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const container = containerRef.current;
        
        const resize = () => {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = Math.max(640, container.clientWidth || 0);
            canvas.height = Math.max(420, container.clientHeight || 0);
            
            if (isOverlay) {
               ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else {
               ctx.fillStyle = '#1a1a1a';
               ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.putImageData(imageData, 0, 0);
        };

        resize();
        window.addEventListener('resize', resize);

        // Load Initial Image if any
        if (initialImage) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                saveToHistory();
            };
            img.src = initialImage;
        } else {
            saveToHistory();
        }

        return () => window.removeEventListener('resize', resize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const undo = () => {
        if (historyStep > 0) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (!isOverlay) {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
            };
            img.src = history[historyStep - 1];
            setHistoryStep(historyStep - 1);
        }
    };

    const redo = () => {
        if (historyStep < history.length - 1) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (!isOverlay) {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
            };
            img.src = history[historyStep + 1];
            setHistoryStep(historyStep + 1);
        }
    };

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX || e.touches[0].clientX) - rect.left,
            y: (e.clientY || e.touches[0].clientY) - rect.top
        };
    };

    const startDrawing = (e) => {
        const pos = getPos(e);
        setDrawing(true);
        setLastPos(pos);
        setStartPos(pos);
        const ctx = canvasRef.current.getContext('2d');
        setSnapshot(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    };

    const draw = (e) => {
        if (!drawing) { return; }
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = opacity;

        if (tool === 'brush') {
            ctx.beginPath();
            ctx.moveTo(lastPos.x, lastPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            setLastPos(pos);
        } else if (tool === 'eraser') {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.moveTo(lastPos.x, lastPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.restore();
            setLastPos(pos);
        } else if (tool === 'square' || tool === 'circle' || tool === 'line') {
            ctx.putImageData(snapshot, 0, 0);
            ctx.beginPath();
            if (tool === 'line') {
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            } else if (tool === 'square') {
                ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
                ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        if (drawing) {
            setDrawing(false);
            saveToHistory();
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
            return;
        }
        canvas.toBlob((blob) => {
            if (blob) {
                onSave(blob);
            }
        }, 'image/png');
    };

    return (
        <div className="flex flex-col h-full bg-[#121212]" ref={containerRef}>
            {/* Toolbar Top */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#1a1a1a]">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={historyStep <= 0}
                            onClick={undo}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30"
                        >
                            <Undo size={18} />
                        </button>
                        <button 
                            disabled={historyStep >= history.length - 1}
                            onClick={redo}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30"
                        >
                            <Redo size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Tools */}
                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5">
                    {[
                        { id: 'brush', icon: <Paintbrush size={18} />, label: 'Pinceau' },
                        { id: 'eraser', icon: <Eraser size={18} />, label: 'Gomme' },
                        { id: 'line', icon: <Minus size={18} />, label: 'Ligne' },
                        { id: 'square', icon: <Square size={18} />, label: 'Carré' },
                        { id: 'circle', icon: <Circle size={18} />, label: 'Cercle' },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTool(t.id)}
                            className={`p-2 rounded-lg flex items-center gap-2 transition-all ${tool === t.id ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            title={t.label}
                        >
                            {t.icon}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                            <input
                                type="color"
                                value={color}
                                onChange={(event) => setColor(event.target.value)}
                                className="h-5 w-5 cursor-pointer rounded border border-white/20 bg-transparent p-0"
                                aria-label="Couleur du dessin"
                            />
                            <span className="text-xs font-mono text-gray-400 uppercase">{color}</span>
                        </label>
                    </div>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500 px-4 py-2 text-sm font-black text-white shadow-[0_12px_30px_rgba(16,185,129,0.25)] transition-all hover:-translate-y-0.5 hover:bg-emerald-400"
                    >
                        <Save size={18} />
                        <span>Enregistrer</span>
                    </button>
                </div>
            </div>

            {/* Content Bottom */}
            <div className="flex-1 relative overflow-hidden bg-[#121212]">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 cursor-crosshair touch-none"
                    style={{ background: isOverlay ? 'transparent' : '#1a1a1a' }}
                />

                {/* Size/Opacity Floating Panel */}
                <div className="absolute bottom-6 left-6 flex flex-col gap-4 p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Taille</span>
                            <span className="text-[10px] font-mono text-white/60">{brushSize}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="50" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-32 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                         <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Opacité</span>
                            <span className="text-[10px] font-mono text-white/60">{Math.round(opacity * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="1" 
                            step="0.05"
                            value={opacity} 
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                            className="w-32 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
