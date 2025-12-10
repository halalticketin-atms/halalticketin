import { AnimatePresence, motion } from 'motion/react';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CheckInResult } from '@/types';

interface ScanResultOverlayProps {
  result: CheckInResult | null;
  onClose: () => void;
}

export function ScanResultOverlay({ result, onClose }: ScanResultOverlayProps) {
  if (!result) return null;

  const isSuccess = result.status === 'success';
  const isAlreadyIn = result.status === 'already_checked_in';
  const isInvalid = result.status === 'invalid';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className={`absolute inset-0 ${
            isSuccess
              ? 'bg-green-500/20'
              : isAlreadyIn
              ? 'bg-amber-500/20'
              : 'bg-red-500/20'
          }`}
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          className={`relative z-10 p-8 rounded-2xl text-center max-w-sm w-full ${
            isSuccess
              ? 'bg-green-500 text-white'
              : isAlreadyIn
              ? 'bg-amber-500 text-white'
              : 'bg-red-500 text-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4">
            {isSuccess && <Check className="h-16 w-16 mx-auto" />}
            {isAlreadyIn && <AlertCircle className="h-16 w-16 mx-auto" />}
            {isInvalid && <X className="h-16 w-16 mx-auto" />}
          </div>

          <h3 className="text-xl font-bold mb-2">
            {isSuccess && 'Checked In!'}
            {isAlreadyIn && 'Already Checked In'}
            {isInvalid && 'Invalid Ticket'}
          </h3>

          {(isSuccess || isAlreadyIn) && (
            <>
              <p className="text-lg font-medium">{result.ticket.attendeeName}</p>
              <p className="text-sm opacity-80">{result.ticket.ticketType}</p>
              {isAlreadyIn && (
                <p className="text-sm opacity-80 mt-2">
                  Checked in at {result.checkedInAt.toLocaleTimeString()}
                </p>
              )}
            </>
          )}

          {isInvalid && <p className="text-sm opacity-80">{result.message}</p>}

          <Button
            variant="secondary"
            className="mt-6"
            onClick={onClose}
            autoFocus
          >
            Continue Scanning
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
