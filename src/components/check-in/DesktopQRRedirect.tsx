import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';

interface DesktopQRRedirectProps {
  eventId: string;
  eventName: string;
  organizerId?: string | null;
}

export function DesktopQRRedirect({ eventId, eventName, organizerId }: DesktopQRRedirectProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scannerUrl = mounted
    ? organizerId
      ? `${window.location.origin}/dashboard/o/${organizerId}/check-in?event=${eventId}&mode=scan`
      : `${window.location.origin}/dashboard`
    : '';

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <Smartphone className="h-16 w-16 mx-auto text-primary mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading scanner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="mb-6">
          <Smartphone className="h-16 w-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Open Scanner on Your Phone</h2>
          <p className="text-muted-foreground max-w-md">
            Scan this QR code with your phone to open the check-in scanner for{' '}
            <strong>{eventName}</strong>
          </p>
        </div>

        <Card className="inline-block p-6 bg-white">
          <QRCodeSVG value={scannerUrl} size={200} level="H" includeMargin />
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          Or open this URL on your phone:
          <br />
          <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
            {scannerUrl}
          </code>
        </p>
      </motion.div>
    </div>
  );
}
