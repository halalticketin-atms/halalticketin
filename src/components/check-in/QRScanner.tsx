'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { motion } from 'motion/react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
    onScan: (data: string) => void;
    onError?: (error: string) => void;
    isActive?: boolean;
}

export function QRScanner({ onScan, onError, isActive = true }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startScanner = useCallback(async () => {
        if (!containerRef.current || scannerRef.current) return;

        try {
            const html5QrCode = new Html5Qrcode('qr-reader');
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1,
            };

            await html5QrCode.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Successful scan
                    onScan(decodedText);
                    // Brief pause to show feedback, then continue scanning
                },
                () => {
                    // Ignore scan errors - these happen constantly as camera tries to read
                }
            );

            setIsScanning(true);
            setHasPermission(true);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
            setError(errorMessage);
            setHasPermission(false);
            onError?.(errorMessage);
        }
    }, [onScan, onError]);

    const stopScanner = useCallback(async () => {
        const instance = scannerRef.current;
        if (!instance) return;

        try {
            const state = instance.getState();
            if (
                state === Html5QrcodeScannerState.SCANNING ||
                state === Html5QrcodeScannerState.PAUSED
            ) {
                await instance.stop();
            }

            const container = document.getElementById('qr-reader');
            if (container) {
                await instance.clear();
            }
        } catch {
            // Swallow expected transition/DOM timing errors from html5-qrcode
        } finally {
            scannerRef.current = null;
            setIsScanning(false);
        }
    }, []);

    useEffect(() => {
        if (isActive) {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isActive, startScanner, stopScanner]);

    const handleRetry = () => {
        setError(null);
        stopScanner().then(() => {
            setTimeout(startScanner, 100);
        });
    };

    return (
        <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden">
            {/* Scanner container */}
            <div
                id="qr-reader"
                ref={containerRef}
                className="w-full h-full"
                aria-label="QR code scanner area"
            />

            {/* Scanning overlay */}
            {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                    {/* Scan frame */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-64 h-64 relative"
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

                            {/* Scanning line animation */}
                            <motion.div
                                animate={{
                                    y: [0, 240, 0],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                                className="absolute top-2 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent"
                            />
                        </motion.div>
                    </div>

                    {/* Instructions */}
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full inline-block">
                            Point camera at ticket QR code
                        </p>
                    </div>
                </div>
            )}

            {/* Permission/Error states */}
            {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8">
                    {hasPermission === null && !error && (
                        <>
                            <Camera className="h-16 w-16 mb-4 opacity-50" />
                            <p className="text-center">Initializing camera...</p>
                        </>
                    )}

                    {error && (
                        <>
                            <CameraOff className="h-16 w-16 mb-4 text-red-400" />
                            <p className="text-center text-sm mb-4">{error}</p>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleRetry}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
