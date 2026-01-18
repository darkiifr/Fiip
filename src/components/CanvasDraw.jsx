import React, { useRef, useState } from "react";

export default function CanvasDraw() {
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setDrawing(true);
        setLastPos(getPos(e));
    };
    const handleMouseUp = () => setDrawing(false);
    const handleMouseLeave = () => setDrawing(false);
    const handleMouseMove = (e) => {
        if (!drawing) return;
        const ctx = canvasRef.current.getContext("2d");
        const pos = getPos(e);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setLastPos(pos);
    };
    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };
    const handleClear = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-blue-400 tracking-wide">Zone de dessin</span>
                <button onClick={handleClear} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 ml-2">Effacer</button>
            </div>
            <canvas
                ref={canvasRef}
                width={500}
                height={250}
                style={{ border: "2px solid #3b82f6", borderRadius: 12, background: "#18181b", cursor: "crosshair", width: '100%', maxWidth: 600, boxShadow: '0 2px 8px #0002' }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
            />
        </div>
    );
}
