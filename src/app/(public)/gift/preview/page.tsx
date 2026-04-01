'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Gift,
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Download,
  Sparkles,
  PartyPopper,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type MockState = 'claimable' | 'claimed' | 'expired';

const MOCK_POSTER = '/images/mock-event-poster.png';

// ── Confetti canvas ──────────────────────────────────────────────────────────
function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#0d9488', '#6ee7b7', '#fcd34d', '#a7f3d0', '#f0abfc', '#fff'];
    const pieces: {
      x: number; y: number; r: number; d: number; color: string;
      tilt: number; tiltAngle: number; tiltAngleInc: number; shape: 'circle' | 'rect';
    }[] = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 7 + 3,
      d: Math.random() * 80 + 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltAngleInc: Math.random() * 0.07 + 0.05,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }));

    let angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;
      pieces.forEach((p) => {
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(angle + p.d) + 2.5) * 0.9;
        p.x += Math.sin(angle) * 0.6;
        p.tilt = Math.sin(p.tiltAngle - p.d / 3) * 12;
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.rect(p.x + p.tilt, p.y, p.r * 2, p.r * 0.8);
          ctx.fill();
        }
        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const timeout = setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, 5000);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(timeout);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ display: active ? 'block' : 'none' }}
    />
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function GiftClaimPreviewPage() {
  const [mockState, setMockState] = useState<MockState>('claimable');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [age, setAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);

  const mockTicketCode = 'HT-GIFT-A3F8K9X2';

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !gender || !age.trim()) {
      setError('Please fill in all required fields, including your email address.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1300));
    setIsSubmitting(false);
    setMockState('claimed');
    setConfetti(true);
    setTimeout(() => setConfetti(false), 5500);
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('gift-qr-code-preview') as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `ticket-${mockTicketCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isClaimed = mockState === 'claimed';
  const isExpired = mockState === 'expired';
  const isClaimable = mockState === 'claimable';

  return (
    <>
      <ConfettiCanvas active={confetti} />

      {/* ── Dev state switcher ── */}
      <div className="flex items-center justify-center gap-2 border-b border-dashed border-primary/20 bg-primary/5 px-4 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Preview:</span>
        {(['claimable', 'claimed', 'expired'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setMockState(s);
              setError(null);
            }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all',
              mockState === s
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="min-h-screen bg-background">
        {/* ══════════════════════════════════════════════════════════════════
            EVENT HERO — matches PublicEventPageContent poster hero
           ══════════════════════════════════════════════════════════════════ */}
        <div className="relative">
          <div className="relative h-[420px] sm:h-[460px] md:h-[500px] overflow-hidden">
            {/* Blurred, zoomed background */}
            <div className="absolute inset-0 scale-110">
              <Image
                src={MOCK_POSTER}
                alt=""
                fill
                className="object-cover blur-xl"
                priority
              />
            </div>
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Centered sharp poster */}
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div className="relative w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px] aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <Image
                  src={MOCK_POSTER}
                  alt="Summer Vibes Festival 2026"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Logo top-left */}
            <div className="absolute top-4 left-4 z-10">
              <Link href="/" className="inline-block opacity-90 hover:opacity-100 transition-opacity">
                <div className="relative h-7 w-24">
                  <Image src="/images/HTlogocr.png" alt="Halal Ticketin'" fill className="object-contain brightness-0 invert" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTENT BELOW HERO
           ══════════════════════════════════════════════════════════════════ */}
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

          {/* ── Gift announcement + Event details (side-by-side on desktop) ── */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gift announcement */}
            <div className="rounded-2xl border border-primary/15 bg-card p-6 text-center shadow-sm flex flex-col justify-center">
              <div className="mb-4 inline-flex items-center justify-center self-center rounded-full bg-primary/10 px-4 py-1.5">
                <Gift className="mr-2 h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {isClaimed ? 'Ticket claimed' : isExpired ? 'Gift expired' : 'You\u2019ve received a gift'}
                </span>
              </div>

              {isClaimable && (
                <>
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                    Abdel gifted you<br />a ticket to attend
                  </h2>
                  <p className="mt-2 text-lg font-semibold text-primary">
                    Summer Vibes Festival 2026
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Fill in your details below to claim your ticket and receive your QR code by email.
                  </p>
                </>
              )}

              {isClaimed && (
                <>
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                    Your ticket is ready
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enjoy Summer Vibes Festival 2026 — your QR code is below.
                  </p>
                </>
              )}

              {isExpired && (
                <>
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                    This gift link has expired
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please ask the sender to share a new link.
                  </p>
                </>
              )}
            </div>

            {/* Event details */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex flex-col">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Ticket className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event Details</span>
              </div>
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <Calendar className="h-4 w-4 shrink-0 text-primary/60" />
                  Saturday, 15 August 2026
                </div>
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-primary/60" />
                  18:00 – 23:00 BST
                </div>
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                  Central Park Arena, London, United Kingdom
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Ticket type</span>
                <span className="text-sm font-semibold text-foreground">VIP Access</span>
              </div>
            </div>
          </div>

          {/* ── Claim form ── */}
          {isClaimable && (
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Complete your claim</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Fill in a few details so we can personalise your ticket and email you a copy.
              </p>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gift-name" className="text-xs font-medium text-muted-foreground">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="gift-name"
                    placeholder="Your full name"
                    value={name}
                    className="h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors"
                    onChange={(e) => { setName(e.target.value); setError(null); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gift-email" className="text-xs font-medium text-muted-foreground">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="gift-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    className="h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors"
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gift-age" className="text-xs font-medium text-muted-foreground">Age <span className="text-destructive">*</span></Label>
                  <Input
                    id="gift-age"
                    type="number"
                    min="0"
                    max="120"
                    placeholder="e.g. 25"
                    value={age}
                    className="h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors"
                    onChange={(e) => { setAge(e.target.value); setError(null); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Gender <span className="text-destructive">*</span></Label>
                  <Select value={gender} onValueChange={(v) => { setGender(v as 'male' | 'female'); setError(null); }}>
                    <SelectTrigger className="h-10 bg-muted/30 border-input/60">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Claiming your ticket…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Claim my ticket
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* ── Claimed QR ── */}
          {isClaimed && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-teal-950/10">
              <div className="flex flex-col items-center text-center">
                <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <PartyPopper className="h-4 w-4" />
                  <span className="text-sm font-bold uppercase tracking-wider">You&apos;re all set</span>
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="mb-5 text-sm text-muted-foreground">
                  Show the QR code at the entrance to get in.
                </p>
                <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-primary/10">
                  <QRCodeCanvas
                    id="gift-qr-code-preview"
                    value={mockTicketCode}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">VIP Access · Summer Vibes Festival 2026</p>
                <p className="mt-2 rounded-lg bg-white/80 px-4 py-1.5 font-mono text-xs text-muted-foreground dark:bg-black/20">
                  {mockTicketCode}
                </p>
                <p className="mt-3 max-w-xs text-xs text-muted-foreground">
                  Present this QR code at entry, or use the code above for manual check-in.
                </p>
                <Button variant="outline" className="mt-4 border-emerald-300 hover:bg-emerald-50" onClick={downloadQRCode}>
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </div>
            </div>
          )}

          {/* ── Expired ── */}
          {isExpired && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-sm text-muted-foreground">
                This gift link is no longer valid. Please ask the sender to share a new link, or{' '}
                <Link href="/contact" className="text-primary hover:underline">contact support</Link>.
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="pb-6 text-center text-xs text-muted-foreground">
            Powered by{' '}
            <Link href="/" className="text-primary hover:underline">Halal Ticketin&apos;</Link>
          </p>
        </div>
      </div>
    </>
  );
}
