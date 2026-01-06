'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QRScannerProps {
    onScan: (data: string) => void;
    isActive?: boolean;
}

export function QRScanner({ onScan, isActive = true }: QRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const html5ContainerId = useId();
    const html5ScannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
    const onScanRef = useRef(onScan);
    const [useHtml5Scanner, setUseHtml5Scanner] = useState(false);
    const [hasCamera, setHasCamera] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastScannedRef = useRef<string>('');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        if (!isActive) return;

        let stream: MediaStream | null = null;
        let animationId: number | null = null;
        let cancelled = false;

        const handleDecoded = (data: string) => {
            if (!data || data === lastScannedRef.current) return;
            lastScannedRef.current = data;
            onScanRef.current(data);

            // Debounce - prevent same code for 3 seconds
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                lastScannedRef.current = '';
            }, 3000);
        };

        const stopHtml5Scanner = async () => {
            if (!html5ScannerRef.current) return;
            try {
                await html5ScannerRef.current.stop();
            } catch (err) {
                // Ignore stop errors on teardown.
            }
            try {
                html5ScannerRef.current.clear();
            } catch (err) {
                // Ignore clear errors on teardown.
            }
            html5ScannerRef.current = null;
        };

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setIsScanning(true);
                    setHasCamera(true);
                    setError(null);
                }
            } catch (err) {
                console.error('Camera error:', err);
                setHasCamera(false);
                setError('Unable to access camera. Please grant permission.');
            }
        };

        const scanFrame = async () => {
            if (!videoRef.current || !canvasRef.current || !isScanning) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
                animationId = requestAnimationFrame(scanFrame);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Use BarcodeDetector API if available
            if ('BarcodeDetector' in window) {
                try {
                    // @ts-expect-error BarcodeDetector is not in TypeScript types yet
                    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                    const barcodes = await detector.detect(canvas);

                    if (barcodes.length > 0) {
                        const data = barcodes[0].rawValue;
                        if (data) handleDecoded(data);
                    }
                } catch (err) {
                    // Continue scanning if detection fails
                }
            }

            animationId = requestAnimationFrame(scanFrame);
        };

        if (!('BarcodeDetector' in window)) {
            setUseHtml5Scanner(true);
            const startHtml5Scanner = async () => {
                try {
                    const { Html5Qrcode } = await import('html5-qrcode');
                    if (cancelled) return;
                    const scanner = new Html5Qrcode(html5ContainerId);
                    html5ScannerRef.current = scanner;
                    await scanner.start(
                        { facingMode: 'environment' },
                        { fps: 10, qrbox: { width: 240, height: 240 } },
                        (decodedText) => handleDecoded(decodedText),
                        () => {}
                    );
                    setIsScanning(true);
                    setHasCamera(true);
                    setError(null);
                } catch (err) {
                    console.error('Camera error:', err);
                    setHasCamera(false);
                    setError('Unable to access camera. Please grant permission.');
                }
            };

            startHtml5Scanner();

            return () => {
                cancelled = true;
                stopHtml5Scanner();
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                setIsScanning(false);
            };
        }

        setUseHtml5Scanner(false);
        startCamera().then(() => {
            animationId = requestAnimationFrame(scanFrame);
        });

        return () => {
            cancelled = true;
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setIsScanning(false);
        };
    }, [html5ContainerId, isActive]);

    if (!hasCamera || error) {
        return (
            <div
                data-testid="qr-scanner"
                className="aspect-square max-h-[400px] bg-muted/50 flex flex-col items-center justify-center p-8 text-center"
            >
                <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                    {error || 'Camera not available'}
                </p>
                <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="relative aspect-square max-h-[400px] bg-black overflow-hidden" data-testid="qr-scanner">
            {useHtml5Scanner ? (
                <div id={html5ContainerId} className="absolute inset-0" />
            ) : (
                <>
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover"
                        playsInline
                        muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                </>
            )}

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Corner guides */}
                <div className="absolute inset-8 sm:inset-16">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                </div>

                {/* Scanning line animation */}
                {isScanning && (
                    <div className="absolute inset-x-8 sm:inset-x-16 top-8 sm:top-16 h-0.5 bg-green-400 animate-scan" />
                )}
            </div>

            {/* Status */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                    'bg-black/60 text-white backdrop-blur-sm'
                )}>
                    <Camera className="h-4 w-4" />
                    {isScanning ? 'Scanning for QR codes...' : 'Starting camera...'}
                </div>
            </div>
        </div>
    );
}
