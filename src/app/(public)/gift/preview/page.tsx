'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type MockState = 'claimable' | 'claimed' | 'expired';

export default function GiftClaimPreviewPage() {
  const [mockState, setMockState] = useState<MockState>('claimable');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [age, setAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mockTicketCode = 'HT-GIFT-A3F8K9X2';

  const handleSubmit = async () => {
    if (!name.trim() || !gender || !age.trim()) {
      setError('Please complete the required fields before claiming this ticket.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    setMockState('claimed');
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('gift-qr-code-preview') as HTMLCanvasElement | null;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `ticket-${mockTicketCode}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      {/* State switcher — dev only */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Preview state:</span>
        {(['claimable', 'claimed', 'expired'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setMockState(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mockState === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {mockState === 'claimable'
              ? 'Claim your gifted ticket'
              : mockState === 'claimed'
                ? 'Ticket claimed'
                : 'Gift link expired'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gifted by Abdel for Summer Vibes Festival 2026.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-medium">Summer Vibes Festival 2026</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Saturday, 15 August 2026, 18:00 – 23:00
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Central Park Arena, London, United Kingdom
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Ticket type: VIP Access
            </p>
            {mockState === 'claimed' && (
              <p className="mt-1 text-sm text-muted-foreground">
                Ticket code: {mockTicketCode}
              </p>
            )}
          </div>

          {error ? <Alert>{error}</Alert> : null}

          {mockState === 'expired' ? (
            <Alert>
              This gift link is no longer valid. Ask the buyer or support for a new link.
            </Alert>
          ) : null}

          {mockState === 'claimed' ? (
            <Alert>
              Your ticket is ready. Keep this page for entry and check your email for a copy.
            </Alert>
          ) : null}

          {mockState === 'claimable' ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gift-name">Full name</Label>
                  <Input
                    id="gift-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gift-email">Email</Label>
                  <Input
                    id="gift-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gift-age">Age</Label>
                  <Input
                    id="gift-age"
                    type="number"
                    min="0"
                    max="120"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={gender}
                    onValueChange={(value) => {
                      setGender(value as 'male' | 'female');
                      setError(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Claiming…' : 'Claim ticket'}
              </Button>
            </div>
          ) : null}

          {mockState === 'claimed' ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <QRCodeCanvas
                    id="gift-qr-code-preview"
                    value={mockTicketCode}
                    size={220}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">VIP Access</p>
                <p className="mt-2 break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-muted-foreground">
                  {mockTicketCode}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Present this QR code at entry, or use the ticket code for manual check-in.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={downloadQRCode}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
