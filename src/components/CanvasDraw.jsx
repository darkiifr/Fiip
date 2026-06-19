import { Save, X, Eraser, Undo, Redo, Square, Circle, Minus, Paintbrush, ChevronDown } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

const HexColorPicker = ({ color, onChange }) => {
    // Custom Color Picker with Palette, Hue Slider, and Preview
    const [localColor, setLocalColor] = useState(color);
    const [hue, setHue] = useState(() => getHue(color));
    const [prevColor, setPrevColor] = useState(color);

    if (color !== prevColor) {
        setPrevColor(color);
        setLocalColor(color);
        setHue(getHue(color));
    }

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
                        if (/^#[0-9A-F]{6}$/i.test(val)) { onChange(val); }
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
  const light = l / 100;
  const a = (s * Math.min(light, 1 - light)) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const colorVal = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * colorVal).toString(16).padStart(2, '0');
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
    const cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
    let h = 0;
    if (delta === 0) { h = 0; }
    else if (cmax === r) { h = ((g - b) / delta) % 6; }
    else if (cmax === g) { h = (b - r) / delta + 2; }
    else { h = (r - g) / delta + 4; }
    h = Math.round(h * 60);
    if (h < 0) { h += 360; }
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
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            
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
        canvasRef.current.toBlob((blob) => {
            onSave(blob);
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
                         <div className="relative">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-white/5 hover:border-white/20 transition-all"
                            >
                                <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: color }} />
                                <span className="text-xs font-mono text-gray-400 uppercase">{color}</span>
                                <ChevronDown size={12} className="text-gray-500" />
                            </button>
                            {showColorPicker && <HexColorPicker color={color} onChange={setColor} />}
                         </div>
                    </div>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg border border-blue-400/20 transition-all"
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
