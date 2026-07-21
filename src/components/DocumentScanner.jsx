import { Camera, Check, RefreshCw, RotateCcw, SlidersHorizontal, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { getFriendlyErrorMessage } from '../services/errorMessages';

import { MotionSurface } from './ui';

const DEFAULT_CROP = { x: 8, y: 8, width: 84, height: 84 };

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function findDocumentBounds(imageData, width, height) {
    const pixelCount = width * height;
    const luma = new Uint8Array(pixelCount);
    let gradientSum = 0;
    let gradientSamples = 0;

    for (let index = 0; index < pixelCount; index += 1) {
        const source = index * 4;
        luma[index] = Math.round((imageData[source] * 0.299) + (imageData[source + 1] * 0.587) + (imageData[source + 2] * 0.114));
    }

    const gradients = new Uint16Array(pixelCount);
    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const index = y * width + x;
            const gx = -luma[index - width - 1] - (2 * luma[index - 1]) - luma[index + width - 1]
                + luma[index - width + 1] + (2 * luma[index + 1]) + luma[index + width + 1];
            const gy = -luma[index - width - 1] - (2 * luma[index - width]) - luma[index - width + 1]
                + luma[index + width - 1] + (2 * luma[index + width]) + luma[index + width + 1];
            const gradient = Math.min(255, Math.abs(gx) + Math.abs(gy));
            gradients[index] = gradient;
            gradientSum += gradient;
            gradientSamples += 1;
        }
    }

    const threshold = clamp((gradientSum / Math.max(1, gradientSamples)) * 2.25, 48, 118);
    const edges = new Uint8Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
        edges[index] = gradients[index] > threshold && luma[index] > 42 ? 1 : 0;
    }

    const visited = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let best = null;

    for (let y = 2; y < height - 2; y += 1) {
        for (let x = 2; x < width - 2; x += 1) {
            const seed = y * width + x;
            if (!edges[seed] || visited[seed]) {continue;}

            let head = 0;
            let tail = 0;
            let count = 0;
            let minX = x;
            let maxX = x;
            let minY = y;
            let maxY = y;
            queue[tail] = seed;
            tail += 1;
            visited[seed] = 1;

            while (head < tail) {
                const current = queue[head];
                head += 1;
                count += 1;
                const cx = current % width;
                const cy = Math.floor(current / width);
                minX = Math.min(minX, cx);
                maxX = Math.max(maxX, cx);
                minY = Math.min(minY, cy);
                maxY = Math.max(maxY, cy);

                const neighbors = [current - 1, current + 1, current - width, current + width];
                for (const next of neighbors) {
                    if (next <= 0 || next >= pixelCount || visited[next] || !edges[next]) {continue;}
                    visited[next] = 1;
                    queue[tail] = next;
                    tail += 1;
                }
            }

            const boxWidth = maxX - minX;
            const boxHeight = maxY - minY;
            const areaRatio = (boxWidth * boxHeight) / (width * height);
            const aspect = boxWidth / Math.max(1, boxHeight);
            const density = count / Math.max(1, boxWidth * boxHeight);
            const touchesFrame = minX < 5 || minY < 5 || maxX > width - 6 || maxY > height - 6;

            if (
                count < 90 ||
                areaRatio < 0.12 ||
                areaRatio > 0.86 ||
                aspect < 0.5 ||
                aspect > 2.15 ||
                density < 0.006 ||
                density > 0.42 ||
                touchesFrame
            ) {
                continue;
            }

            const score = (areaRatio * 1000) + (count * 0.4) - Math.abs(1.25 - aspect) * 80;
            if (!best || score > best.score) {
                best = { minX, minY, maxX, maxY, score };
            }
        }
    }

    if (!best) {return null;}

    const pad = Math.floor(Math.min(width, height) * 0.035);
    return {
        x: clamp(best.minX - pad, 0, width),
        y: clamp(best.minY - pad, 0, height),
        width: clamp((best.maxX - best.minX) + pad * 2, 1, width - best.minX + pad),
        height: clamp((best.maxY - best.minY) + pad * 2, 1, height - best.minY + pad),
    };
}
function cropFromBounds(bounds, width, height) {
    if (!bounds) {return DEFAULT_CROP;}
    return {
        x: clamp((bounds.x / width) * 100, 0, 95),
        y: clamp((bounds.y / height) * 100, 0, 95),
        width: clamp((bounds.width / width) * 100, 5, 100),
        height: clamp((bounds.height / height) * 100, 5, 100),
    };
}

function cropToBounds(crop, width, height) {
    return {
        x: Math.round((crop.x / 100) * width),
        y: Math.round((crop.y / 100) * height),
        width: Math.round((crop.width / 100) * width),
        height: Math.round((crop.height / 100) * height),
    };
}

function isAppleCameraRuntime() {
    if (typeof navigator === 'undefined') {return false;}
    const platform = navigator.userAgentData?.platform || navigator.platform || '';
    return /mac|iphone|ipad|ipod/i.test(platform);
}

function stopStream(stream) {
    stream?.getTracks?.().forEach((track) => track.stop());
}

async function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Impossible de générer l’image du scan.'));
            }
        }, 'image/png', 0.95);
    });
}

export default function DocumentScanner({ onSave, onClose }) {
    const videoRef = useRef(null);
    const cropStageRef = useRef(null);
    const dragRef = useRef(null);
    const streamRef = useRef(null);
    const fullCanvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const [error, setError] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const [detectedCrop, setDetectedCrop] = useState(null);
    const [capturedUrl, setCapturedUrl] = useState('');
    const [captureSize, setCaptureSize] = useState({ width: 0, height: 0 });
    const [crop, setCrop] = useState(DEFAULT_CROP);
    const [devices, setDevices] = useState([]);
    const [deviceId, setDeviceId] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [zoomRange, setZoomRange] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraState, setCameraState] = useState('idle');

    useEffect(() => {
        let cancelled = false;

        const start = async () => {
            try {
                setError('');
                setCameraState('requesting');
                setIsCameraReady(false);
                stopStream(streamRef.current);
                streamRef.current = null;
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('getUserMedia unavailable');
                }
                const appleRuntime = isAppleCameraRuntime();
                const videoConstraints = {
                    ...(deviceId
                        ? { deviceId: appleRuntime ? { ideal: deviceId } : { exact: deviceId } }
                        : appleRuntime ? {} : { facingMode: { ideal: 'environment' } }),
                    width: { ideal: 1280 },
                    height: { ideal: 960 },
                    frameRate: appleRuntime ? { ideal: 15, max: 24 } : { ideal: 24, max: 30 },
                };
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: videoConstraints,
                        audio: false,
                    });
                } catch (primaryError) {
                    console.warn('Camera preferred constraints failed, using fallback:', primaryError);
                    if (deviceId) {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { deviceId: { ideal: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } },
                            audio: false,
                        });
                    } else {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { width: { ideal: 1280 }, height: { ideal: 960 } },
                            audio: false,
                        });
                    }
                }
                if (cancelled) {
                    stopStream(stream);
                    return;
                }
                streamRef.current = stream;
                const videoTrack = stream.getVideoTracks()[0];
                const capabilities = videoTrack?.getCapabilities?.() || {};
                const settings = videoTrack?.getSettings?.() || {};
                if (capabilities.zoom) {
                    setZoomRange({ min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step || 0.1 });
                    setZoom(settings.zoom || capabilities.zoom.min || 1);
                } else {
                    setZoomRange(null);
                    setZoom(1);
                }
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        if (!cancelled) {
                            setIsCameraReady(true);
                        }
                    };
                    videoRef.current.oncanplay = () => {
                        if (!cancelled) {
                            setIsCameraReady(true);
                        }
                    };
                    await videoRef.current.play();
                }
                try {
                    const listedDevices = await navigator.mediaDevices.enumerateDevices();
                    if (!cancelled) {
                        const videoDevices = listedDevices.filter((device) => device.kind === 'videoinput');
                        setDevices(videoDevices);
                    }
                } catch (deviceError) {
                    console.warn('Camera device enumeration failed:', deviceError);
                }
                if (!cancelled) {
                    setCameraState('ready');
                }
            } catch (cameraError) {
                console.warn('Camera startup failed:', cameraError);
                setIsCameraReady(false);
                setCameraState('error');
                setError(getFriendlyErrorMessage(cameraError, "Aucune webcam disponible ou permission refusée. Vous pouvez importer une image à la place."));
            }
        };

        start();
        return () => {
            cancelled = true;
            stopStream(streamRef.current);
            streamRef.current = null;
        };
    }, [deviceId]);

    useEffect(() => () => {
        if (capturedUrl) {URL.revokeObjectURL(capturedUrl);}
    }, [capturedUrl]);

    useEffect(() => {
        if (capturedUrl || error) {return undefined;}
        const detectorCanvas = document.createElement('canvas');
        const detectorContext = detectorCanvas.getContext('2d', { willReadFrequently: true });

        const interval = window.setInterval(() => {
            const video = videoRef.current;
            if (!video?.videoWidth || !video?.videoHeight) {return;}

            const maxWidth = 480;
            const scale = Math.min(1, maxWidth / video.videoWidth);
            detectorCanvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            detectorCanvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            detectorContext.drawImage(video, 0, 0, detectorCanvas.width, detectorCanvas.height);
            const imageData = detectorContext.getImageData(0, 0, detectorCanvas.width, detectorCanvas.height);
            const bounds = findDocumentBounds(imageData.data, detectorCanvas.width, detectorCanvas.height);
            setDetectedCrop(bounds ? cropFromBounds(bounds, detectorCanvas.width, detectorCanvas.height) : null);
        }, 650);

        return () => window.clearInterval(interval);
    }, [capturedUrl, error]);

    const capture = async () => {
        const video = videoRef.current;
        if (!video?.videoWidth || !video?.videoHeight) {
            setError("La webcam n'a pas encore fourni d'image. Réessayez dans une seconde.");
            return;
        }

        setIsCapturing(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

            fullCanvasRef.current = canvas;
            setCaptureSize({ width: canvas.width, height: canvas.height });
            setCrop(detectedCrop || DEFAULT_CROP);
            setCapturedUrl(canvas.toDataURL('image/jpeg', 0.88));
        } finally {
            setIsCapturing(false);
        }
    };

    const saveCrop = async () => {
        const source = fullCanvasRef.current;
        if (!source) {return;}

        setIsCapturing(true);
        try {
            const bounds = cropToBounds(crop, source.width, source.height);
            const output = document.createElement('canvas');
            output.width = Math.max(1, bounds.width);
            output.height = Math.max(1, bounds.height);
            const context = output.getContext('2d');
            context.filter = 'contrast(1.08) brightness(1.04) saturate(0.96)';
            context.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, output.width, output.height);

            const blob = await canvasToBlob(output);
            await onSave(blob);
        } finally {
            setIsCapturing(false);
        }
    };

    const importFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {return;}
        if (!file.type?.startsWith('image/')) {
            setError('Choisissez une image de document compatible.');
            return;
        }
        setIsCapturing(true);
        try {
            stopStream(streamRef.current);
            streamRef.current = null;
            await onSave(file);
        } catch (fileError) {
            setError(getFriendlyErrorMessage(fileError, "Import de l'image impossible."));
        } finally {
            setIsCapturing(false);
        }
    };

    const retake = () => {
        if (capturedUrl) {URL.revokeObjectURL(capturedUrl);}
        setCapturedUrl('');
        setCaptureSize({ width: 0, height: 0 });
        setCrop(DEFAULT_CROP);
        fullCanvasRef.current = null;
    };

    const normalizeCrop = (next) => {
        const x = clamp(next.x, 0, 95);
        const y = clamp(next.y, 0, 95);
        return {
            x,
            y,
            width: clamp(next.width, 5, 100 - x),
            height: clamp(next.height, 5, 100 - y),
        };
    };

    const startCropDrag = (handle, event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = cropStageRef.current?.getBoundingClientRect();
        if (!rect) {return;}
        dragRef.current = {
            handle,
            rect,
            startX: event.clientX,
            startY: event.clientY,
            startCrop: crop,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const updateCropDrag = (event) => {
        const drag = dragRef.current;
        if (!drag) {return;}
        const dx = ((event.clientX - drag.startX) / Math.max(1, drag.rect.width)) * 100;
        const dy = ((event.clientY - drag.startY) / Math.max(1, drag.rect.height)) * 100;
        const start = drag.startCrop;
        const next = { ...start };

        if (drag.handle === 'move') {
            next.x = start.x + dx;
            next.y = start.y + dy;
        } else {
            if (drag.handle.includes('w')) {
                next.x = start.x + dx;
                next.width = start.width - dx;
            }
            if (drag.handle.includes('e')) {next.width = start.width + dx;}
            if (drag.handle.includes('n')) {
                next.y = start.y + dy;
                next.height = start.height - dy;
            }
            if (drag.handle.includes('s')) {next.height = start.height + dy;}
        }

        setCrop(normalizeCrop(next));
    };

    const stopCropDrag = () => {
        dragRef.current = null;
    };

    const applyZoom = async (value) => {
        const nextZoom = Number(value);
        setZoom(nextZoom);
        const track = streamRef.current?.getVideoTracks?.()[0];
        if (!track || !zoomRange) {return;}
        try {
            await track.applyConstraints({ advanced: [{ zoom: nextZoom }] });
        } catch {
            // Some webcams expose zoom but reject constraints while streaming.
        }
    };

    const hasDetection = Boolean(detectedCrop);

    return (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/72 p-4 backdrop-blur-xl" role="dialog" aria-modal="true">
            <MotionSurface className="flex h-[min(860px,96vh)] w-[min(1080px,96vw)] min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/12 bg-[#111316] text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
                <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold">Scanner avec la webcam</h2>
                        <p className="mt-1 text-xs text-white/58">
                            {capturedUrl ? 'Ajustez le recadrage, puis validez le scan.' : 'Présentez le document à la caméra. Fiip détecte le contour en temps réel, puis vous pouvez capturer.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!capturedUrl && (
                            <button type="button" onClick={() => setShowSettings((value) => !value)} className="rounded-xl p-2 text-white/62 hover:bg-white/10 hover:text-white" aria-label="Paramètres webcam">
                                <SlidersHorizontal size={18} />
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/62 hover:bg-white/10 hover:text-white" aria-label="Fermer">
                            <X size={18} />
                        </button>
                    </div>
                </header>

                {showSettings && !capturedUrl && (
                    <div className="grid gap-3 border-b border-white/10 px-5 py-3 text-xs text-white/72 md:grid-cols-2">
                        <label className="space-y-1">
                            <span>Webcam</span>
                            <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none">
                                {devices.map((device, index) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Webcam ${index + 1}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className={`space-y-1 ${zoomRange ? '' : 'opacity-45'}`}>
                            <span>Zoom / dézoom</span>
                            <input
                                type="range"
                                min={zoomRange?.min || 1}
                                max={zoomRange?.max || 1}
                                step={zoomRange?.step || 0.1}
                                value={zoom}
                                disabled={!zoomRange}
                                onChange={(event) => applyZoom(event.target.value)}
                                className="w-full accent-emerald-400"
                            />
                        </label>
                    </div>
                )}

                <div className="relative min-h-0 flex-1 bg-black">
                    {error ? (
                        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/72">{error}</div>
                    ) : capturedUrl ? (
                        <div className="relative flex h-full items-center justify-center overflow-hidden p-4">
                            <div
                                ref={cropStageRef}
                                className="relative max-h-full max-w-full touch-none select-none"
                                onPointerMove={updateCropDrag}
                                onPointerUp={stopCropDrag}
                                onPointerCancel={stopCropDrag}
                            >
                                <img src={capturedUrl} alt="Scan capture" draggable="false" className="block max-h-[calc(96vh-13rem)] max-w-full select-none rounded-2xl object-contain" />
                                <div
                                    className="absolute cursor-move border-2 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.34)]"
                                    style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }}
                                    onPointerDown={(event) => startCropDrag('move', event)}
                                >
                                    {[
                                        ['nw', '-left-2 -top-2 cursor-nwse-resize'],
                                        ['n', 'left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize'],
                                        ['ne', '-right-2 -top-2 cursor-nesw-resize'],
                                        ['e', '-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize'],
                                        ['se', '-bottom-2 -right-2 cursor-nwse-resize'],
                                        ['s', 'bottom-[-0.5rem] left-1/2 -translate-x-1/2 cursor-ns-resize'],
                                        ['sw', '-bottom-2 -left-2 cursor-nesw-resize'],
                                        ['w', '-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize'],
                                    ].map(([handle, className]) => (
                                        <button
                                            key={handle}
                                            type="button"
                                            aria-label={`Redimensionner ${handle}`}
                                            className={`absolute h-4 w-4 rounded-full border-2 border-[#111316] bg-emerald-300 shadow-lg ${className}`}
                                            onPointerDown={(event) => startCropDrag(handle, event)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
                            {hasDetection && (
                                <div
                                    className="pointer-events-none absolute rounded-3xl border-2 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.18)] transition-all duration-300"
                                    style={{ left: `${detectedCrop.x}%`, top: `${detectedCrop.y}%`, width: `${detectedCrop.width}%`, height: `${detectedCrop.height}%` }}
                                />
                            )}
                            <div className="absolute left-4 top-4 rounded-full border border-white/12 bg-black/48 px-3 py-1.5 text-xs font-semibold text-white/78 backdrop-blur-xl">
                                {isCameraReady ? (hasDetection ? 'Document détecté' : 'En attente du document') : cameraState === 'error' ? 'Webcam indisponible' : 'Activation webcam...'}
                            </div>
                        </>
                    )}
                </div>
                <footer className="flex shrink-0 items-center justify-between border-t border-white/10 px-5 py-3">
                    <p className="text-xs text-white/54">
                        {capturedUrl ? `${captureSize.width} x ${captureSize.height}px` : 'Astuce : utilisez un fond contrasté et évitez les reflets.'}
                    </p>
                    <div className="flex gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={importFile} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isCapturing} className="inline-flex items-center gap-2 rounded-2xl border border-white/12 px-4 py-2 text-xs font-semibold text-white/76 hover:bg-white/10 disabled:opacity-45">
                            <Upload size={14} />
                            Importer
                        </button>
                        <button type="button" onClick={capturedUrl ? retake : onClose} className="inline-flex items-center gap-2 rounded-2xl border border-white/12 px-4 py-2 text-xs font-semibold text-white/76 hover:bg-white/10">
                            {capturedUrl ? <RotateCcw size={14} /> : null}
                            {capturedUrl ? 'Reprendre' : 'Annuler'}
                        </button>
                        <button type="button" onClick={capturedUrl ? saveCrop : capture} disabled={Boolean(error) || isCapturing || (!capturedUrl && !isCameraReady)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-45">
                            {isCapturing ? <RefreshCw size={14} className="animate-spin" /> : capturedUrl ? <Check size={14} /> : <Camera size={14} />}
                            {capturedUrl ? 'Valider le scan' : 'Prendre la photo'}
                        </button>
                    </div>
                </footer>
            </MotionSurface>
        </div>
    );
}
