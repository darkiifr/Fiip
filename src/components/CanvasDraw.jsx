import { useRef, useState, useEffect } from 'react';
import { Save, X, Eraser, Undo, Redo, Square, Circle, Minus, Paintbrush, ChevronDown } from 'lucide-react';

const HexColorPicker = ({ color, onChange }) => {
    // Custom Color Picker with Palette, Hue Slider, and Preview
    const [hue, setHue] = useState(0);
    const [localColor, setLocalColor] = useState(color);
    
    useEffect(() => {
        setLocalColor(color);
        setHue(getHue(color));
    }, [color]);

    const handleHueChange = (e) => {
        const h = parseInt(e.target.value);
        setHue(h);
        // Convert Hue to Hex (Assuming 100% Saturation and 50% Lightness for pure hue color)
        // Or better, keep current saturation/lightness? 
        // For simplicity in this "Hue Slider" request, we usually map Hue to a color.
        // Let's generate a color from HSL(h, 100%, 50%)
        const newColor = hslToHex(h, 100, 50);
        setLocalColor(newColor);
        onChange(newColor);
    };

    const PRESETS = [
        "#000000", "#ffffff", "#9ca3af", "#4b5563",
        "#ef4444", "#f97316", "#f59e0b", "#eab308",
        "#84cc16", "#22c55e", "#10b981", "#14b8a6",
        "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
        "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        "#f43f5e"
    ];

    return (
        <div className="absolute top-full left-0 mt-2 p-3 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-50 w-64 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3">
            
            {/* Header / Preview */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Couleur</span>
                <div className="w-8 h-8 rounded-full border border-white/20 shadow-inner" style={{ background: localColor }} />
            </div>

            {/* Hue Slider */}
            <div className="flex flex-col gap-1">
                <div className="h-3 w-full rounded-full relative overflow-hidden cursor-pointer shadow-inner">
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
                    <input 
                        type="range" 
                        min="0" 
                        max="360" 
                        value={hue} 
                        onChange={handleHueChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
            </div>

            {/* Preset Palette */}
            <div>
                <div className="grid grid-cols-7 gap-1.5">
                    {PRESETS.map((c) => (
                        <button
                            key={c}
                            onClick={() => { setLocalColor(c); onChange(c); }}
                            className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${localColor === c ? 'border-white scale-110 ring-1 ring-white/50' : 'border-transparent hover:border-white/30'}`}
                            style={{ background: c }}
                            title={c}
                        />
                    ))}
                </div>
            </div>

            {/* Hex Input */}
            <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1.5 border border-white/5">
                <span className="text-xs text-gray-500 font-mono pl-1">#</span>
                <input 
                    type="text" 
                    value={localColor.replace('#', '')}
                    onChange={(e) => {
                        const val = "#" + e.target.value.replace('#', '');
                        setLocalColor(val);
                        if (/^#[0-9A-F]{6}$/i.test(val)) onChange(val);
                    }}
                    className="w-full bg-transparent border-none text-xs text-white font-mono focus:outline-none uppercase"
                    maxLength={6}
                />
            </div>
        </div>
    );
};

// Helper HSL to Hex
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Helper to extract hue from hex
const getHue = (hex) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255; g /= 255; b /= 255;
    let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
    let h = 0;
    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    return h;
};

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
    const [showColorPicker, setShowColorPicker] = useState(false);
    
    // History
    const [history, setHistory] = useState([]);
    const [historyStep, setHistoryStep] = useState(-1);

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const initCanvas = async () => {
            if (initialImage) {
                const img = new Image();
                img.src = initialImage;
                try {
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    
                    // Set canvas size to match image
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw image
                    ctx.drawImage(img, 0, 0);
                } catch (e) {
                    console.error("Failed to load initial image", e);
                    // Fallback to standard size
                    canvas.width = 800;
                    canvas.height = 600;
                }
            } else if (isOverlay) {
                // Overlay mode: Match container size
                const rect = containerRef.current.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                // Transparent background
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else {
                // Standard mode
                canvas.width = 1920;
                canvas.height = 1080;
                // Transparent/Checkerboard handled by CSS, logic is clear
            }

            // Save initial state
            const dataUrl = canvas.toDataURL();
            setHistory([dataUrl]);
            setHistoryStep(0);
        };

        initCanvas();
    }, [initialImage, isOverlay]);

    const saveHistory = () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL();
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(dataUrl);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const restoreHistory = (step) => {
        if (step < 0 || step >= history.length) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = history[step];
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        setHistoryStep(step);
    };

    const handleResize = () => {
        // Debounce or throttle could be added here
        if (canvasRef.current && containerRef.current) {
             // Just trigger a re-render or layout update if needed
        }
    };
    
    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        // Handle both mouse and touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate scale factors (internal resolution / displayed size)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const handleMouseDown = (e) => {
        // Prevent scrolling on touch
        // e.preventDefault(); // Moved to container
        const pos = getPos(e);
        setDrawing(true);
        setLastPos(pos);
        setStartPos(pos);
        
        const ctx = canvasRef.current.getContext("2d");
        if (['rect', 'circle', 'line'].includes(tool)) {
            setSnapshot(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        }
    };

    const handleMouseMove = (e) => {
        if (!drawing) return;
        const ctx = canvasRef.current.getContext("2d");
        const pos = getPos(e);

        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = 1;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
            ctx.globalAlpha = opacity;
        }

        if (tool === 'brush' || tool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(lastPos.x, lastPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            setLastPos(pos);
        } else if (['rect', 'circle', 'line'].includes(tool) && snapshot) {
            ctx.putImageData(snapshot, 0, 0);
            ctx.beginPath();
            
            if (tool === 'line') {
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(pos.x, pos.y);
            } else if (tool === 'rect') {
                const w = pos.x - startPos.x;
                const h = pos.y - startPos.y;
                ctx.rect(startPos.x, startPos.y, w, h);
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
                ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
            }
            
            ctx.stroke();
        }
    };

    const handleMouseUp = () => {
        if (drawing) {
            setDrawing(false);
            saveHistory();
        }
    };

    const handleSave = () => {
        canvasRef.current.toBlob((blob) => {
            if (onSave) onSave(blob);
        }, 'image/png');
    };



    return (
        <div className={`flex flex-col w-full h-full rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 ${isOverlay ? 'bg-transparent shadow-none border-none pointer-events-none' : 'bg-[#1e1e1e] border border-white/10'}`}>
            
            <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-crosshair touch-none pointer-events-auto">
                {!isOverlay && !initialImage && (
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                        backgroundImage: `linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)`,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                    }} />
                )}
                
                <canvas
                    ref={canvasRef}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-2xl touch-none"
                    style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        width: isOverlay ? '100%' : undefined,
                        height: isOverlay ? '100%' : undefined
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onTouchEnd={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onTouchMove={handleMouseMove}
                />
            </div>

            {/* Toolbar - Floating at Bottom if Overlay */}
            <div className={`pointer-events-auto flex items-center justify-between gap-2 px-3 py-1.5 ${isOverlay ? 'absolute bottom-1 left-1/2 -translate-x-1/2 bg-[#252525]/90 backdrop-blur-md rounded-full border border-white/10 shadow-2xl scale-90 z-50' : 'bg-[#252525] border-t border-white/5'}`}>
                
                {/* Tools Group */}
                <div className="flex items-center gap-2">
                     <div className="flex items-center gap-0.5 bg-black/20 p-0.5 rounded-full">
                        {[
                            { id: 'brush', icon: Paintbrush, label: 'Pinceau' },
                            { id: 'eraser', icon: Eraser, label: 'Gomme' },
                            { id: 'line', icon: Minus, label: 'Ligne' },
                            { id: 'rect', icon: Square, label: 'Rectangle' },
                            { id: 'circle', icon: Circle, label: 'Cercle' }
                        ].map(t => (
                            <button 
                                key={t.id}
                                onClick={() => setTool(t.id)} 
                                className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${tool === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'}`} 
                                title={t.label}
                            >
                                <t.icon className={`w-3.5 h-3.5 ${t.id === 'line' ? '-rotate-45' : ''}`} />
                            </button>
                        ))}
                    </div>

                    <div className="h-4 w-px bg-white/10 hidden sm:block" />

                    {/* Color Picker Group */}
                    <div className="flex items-center gap-2">
                        {/* Advanced Color Picker Trigger */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="flex items-center gap-1.5 px-1.5 py-1 bg-black/20 rounded-full hover:bg-white/5 border border-white/5 transition-colors"
                            >
                                <div className="w-4 h-4 rounded-full border border-white/10 shadow-sm" style={{ background: color }} />
                                <ChevronDown className="w-3 h-3 text-gray-500" />
                            </button>
                            
                            {showColorPicker && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                                    <div className="absolute bottom-full left-0 mb-2 z-50">
                                        <HexColorPicker color={color} onChange={setColor} />
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* Standard Palette (Quick Access) */}
                        <div className="flex items-center gap-1">
                            {[ "#3b82f6", "#ef4444", "#22c55e", "#ffffff" ].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setColor(c)} 
                                    className={`w-3.5 h-3.5 rounded-full border border-white/10 transition-transform hover:scale-110 ${color === c ? "ring-1 ring-white scale-110" : ""}`}
                                    style={{ background: c }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions & Settings Group */}
                <div className="flex items-center gap-3">
                    {/* Sliders - Compact */}
                    <div className="hidden md:flex items-center gap-3 px-1">
                         <div className="flex items-center gap-1.5">
                             <span className="text-[8px] uppercase font-bold text-gray-500">Taille</span>
                             <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-12 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" title={`Taille: ${brushSize}px`} />
                         </div>
                         <div className="flex items-center gap-1.5">
                             <span className="text-[8px] uppercase font-bold text-gray-500">Opacité</span>
                             <input type="range" min="1" max="100" value={opacity * 100} onChange={(e) => setOpacity(parseInt(e.target.value) / 100)} className="w-12 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" title={`Opacité: ${Math.round(opacity * 100)}%`} />
                         </div>
                    </div>

                    <div className="h-4 w-px bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-0.5">
                        <button onClick={() => historyStep > 0 && restoreHistory(historyStep - 1)} disabled={historyStep <= 0} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 hover:bg-white/5 rounded-full">
                            <Undo className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => historyStep < history.length - 1 && restoreHistory(historyStep + 1)} disabled={historyStep >= history.length - 1} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 hover:bg-white/5 rounded-full">
                            <Redo className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                         <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-full shadow hover:bg-blue-500 transition-colors flex items-center gap-1">
                            <Save className="w-3 h-3" />
                            <span className="hidden sm:inline">{isOverlay ? 'Terminer' : 'Enregistrer'}</span>
                        </button>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
