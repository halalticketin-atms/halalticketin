'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CheckInResult } from '@/types';

interface ScanResultOverlayProps {
    result: CheckInResult | null;
    onClose: () => void;
}

export function ScanResultOverlay({ result, onClose }: ScanResultOverlayProps) {
    // Auto-close after delay for success
    useEffect(() => {
        if (!result) return;

        const delay = result.status === 'success' ? 2000 : 4000;
        const timer = setTimeout(onClose, delay);

        return () => clearTimeout(timer);
    }, [result, onClose]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!result) return null;

    const getStatusConfig = () => {
        switch (result.status) {
            case 'success':
                return {
                    icon: CheckCircle,
                    bg: 'bg-green-500',
                    title: 'Checked In!',
                };
            case 'already_checked_in':
                return {
                    icon: AlertTriangle,
                    bg: 'bg-amber-500',
                    title: 'Already Checked In',
                };
            case 'invalid':
            default:
                return {
                    icon: XCircle,
                    bg: 'bg-red-500',
                    title: 'Invalid Ticket',
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={cn(
                    'relative w-full max-w-sm mx-4 rounded-2xl p-8 text-white text-center',
                    config.bg
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20"
                    onClick={onClose}
                >
                    <X className="h-5 w-5" />
                </Button>

                <Icon className="h-16 w-16 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">{config.title}</h2>

                {(result.status === 'success' || result.status === 'already_checked_in') && (
                    <div className="space-y-1 mb-4">
                        <p className="font-medium">{result.ticket.attendeeName}</p>
                        <p className="text-sm opacity-80">{result.ticket.ticketType}</p>
                    </div>
                )}

                {result.status === 'invalid' && (
                    <p className="text-sm opacity-80">{result.message}</p>
                )}

                {result.status === 'already_checked_in' && (
                    <p className="text-sm opacity-80 mt-2">
                        Checked in at {new Date(result.checkedInAt).toLocaleTimeString()}
                    </p>
                )}
            </div>
        </div>
    );
}
