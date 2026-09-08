'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Code2,
  Copy,
  HelpCircle,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Smartphone,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/notifications';
import {
  buildEmbedCheckoutSnippet,
  EMBED_BRAND_COLOURS,
  EMBED_DEFAULT_RADIUS,
  EMBED_RUNTIME_SURFACE,
  type EmbedFont,
  type EmbedTheme,
} from '@/lib/embed';

type Placement = 'inline' | 'compact' | 'full';

type EmbedSettings = {
  theme: EmbedTheme;
  accent: string;
  background: string;
  text: string;
  font: EmbedFont;
  radius: number;
  transparent: boolean;
  showDetails: boolean;
};

/** The Halal Ticketin defaults for a colour mode, sourced from the shared brand palette. */
function brandSettings(theme: EmbedTheme): EmbedSettings {
  return {
    theme,
    ...EMBED_BRAND_COLOURS[theme],
    text: theme === 'dark' ? '#ffffff' : '#000000',
    font: 'system',
    radius: EMBED_DEFAULT_RADIUS,
    transparent: false,
    showDetails: true,
  };
}

const DEFAULT_SETTINGS = brandSettings('light');

const BROWSER_DEFAULTS_KEY = 'halal-ticketin:embed-checkout-defaults';

const PLACEMENTS: Record<Placement, { label: string; maxWidth: number }> = {
  inline: { label: 'Inline', maxWidth: 720 },
  compact: { label: 'Compact', maxWidth: 420 },
  full: { label: 'Full width', maxWidth: 1180 },
};

const COLOUR_FIELDS = [
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
] as const satisfies readonly { key: keyof EmbedSettings; label: string }[];

function savedSettings(value: unknown): Partial<EmbedSettings> | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const settings: Partial<EmbedSettings> = {};
  const isColour = (input: unknown): input is string =>
    typeof input === 'string' && /^#[0-9a-f]{6}$/i.test(input);

  if (candidate.theme === 'light' || candidate.theme === 'dark') settings.theme = candidate.theme;
  if (isColour(candidate.accent)) settings.accent = candidate.accent;
  if (isColour(candidate.background)) settings.background = candidate.background;
  if (candidate.text === '#000000' || candidate.text === '#ffffff') settings.text = candidate.text;
  if (candidate.font === 'system' || candidate.font === 'serif') settings.font = candidate.font;
  if (
    typeof candidate.radius === 'number' &&
    Number.isInteger(candidate.radius) &&
    candidate.radius >= 0 &&
    candidate.radius <= 24
  ) {
    settings.radius = candidate.radius;
  }
  if (typeof candidate.transparent === 'boolean') settings.transparent = candidate.transparent;
  if (typeof candidate.showDetails === 'boolean') settings.showDetails = candidate.showDetails;

  return settings;
}

function browserDefaultSettings(rawSettings: string | null): EmbedSettings {
  try {
    if (!rawSettings) return DEFAULT_SETTINGS;
    const saved = savedSettings(JSON.parse(rawSettings));
    return { ...brandSettings(saved?.theme ?? 'light'), ...saved };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function browserDefaultsSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(BROWSER_DEFAULTS_KEY);
  } catch {
    return null;
  }
}

function subscribeToBrowserDefaults(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === BROWSER_DEFAULTS_KEY && event.storageArea === window.localStorage) {
      onStoreChange();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

function embedAppearance(settings: EmbedSettings) {
  const { transparent, ...appearance } = settings;
  return {
    ...appearance,
    minimal: true,
    background: transparent ? 'transparent' : appearance.background,
  };
}

function buildPreviewUrl(siteUrl: string, slug: string, settings: EmbedSettings) {
  const appearance = embedAppearance(settings);
  const parameters = new URLSearchParams({
    configure: '1',
    theme: appearance.theme,
    accent: appearance.accent,
    background: appearance.background,
    text: appearance.text,
    font: appearance.font,
    radius: String(appearance.radius),
    minimal: String(appearance.minimal),
    showDetails: String(appearance.showDetails),
  });

  return `${siteUrl.replace(/\/$/, '')}/embed/checkout/${encodeURIComponent(slug)}?${parameters.toString()}`;
}

function wrapSnippet(snippet: string, placement: Placement) {
  const lines = snippet.split('\n');
  const script = lines.pop();
  const { maxWidth } = PLACEMENTS[placement];

  return [
    `<div style="max-width: ${maxWidth}px; margin: 0 auto;">`,
    ...lines.map((line) => `  ${line}`),
    '</div>',
    script,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Optional explanation for a control, revealed on hover, keyboard focus and tap.
 * Focus is never moved into the bubble, so it cannot trap keyboard users. The bubble stays
 * open while the pointer is inside it, and Escape dismisses it for good until the user
 * deliberately returns.
 */
function HelpHint({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'bottom' }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  // Set when Escape dismisses the bubble, so returning focus to the trigger does not reopen it.
  const dismissedByKeyboard = useRef(false);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openHint = () => {
    cancelClose();
    setOpen(true);
  };

  // A short grace period lets the pointer cross the gap into the bubble without it closing.
  const closeHint = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  const dismissHint = () => {
    dismissedByKeyboard.current = true;
    cancelClose();
    setOpen(false);
  };

  useEffect(() => cancelClose, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`About ${label}`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-6 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') openHint();
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') closeHint();
          }}
          onFocus={(event) => {
            if (dismissedByKeyboard.current) {
              dismissedByKeyboard.current = false;
              return;
            }
            // Only keyboard focus opens the hint, so a click still toggles it normally.
            if (event.currentTarget.matches(':focus-visible')) openHint();
          }}
          onBlur={() => {
            dismissedByKeyboard.current = false;
            cancelClose();
            setOpen(false);
          }}
          onKeyDown={(event) => {
            // Focus stays on the trigger while the bubble is open, so Escape arrives here.
            if (event.key === 'Escape' && open) {
              event.stopPropagation();
              dismissHint();
            }
          }}
        >
          <HelpCircle className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={dismissHint}
        onPointerEnter={cancelClose}
        onPointerLeave={closeHint}
        className="w-64 p-3 text-xs leading-5"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function OptionRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        <HelpHint label={label}>{hint}</HelpHint>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function EmbedCheckoutSnippet({
  slug,
  canCopy,
  isLive,
  isPublic,
  siteUrl,
}: {
  slug: string | null;
  canCopy: boolean;
  isLive: boolean;
  isPublic: boolean;
  siteUrl?: string;
}) {
  const savedBrowserDefaults = useSyncExternalStore(
    subscribeToBrowserDefaults,
    browserDefaultsSnapshot,
    () => null
  );
  const browserDefaults = useMemo(
    () => browserDefaultSettings(savedBrowserDefaults),
    [savedBrowserDefaults]
  );
  const [overrides, setOverrides] = useState<EmbedSettings | null>(null);
  const settings = overrides ?? browserDefaults;
  const [placement, setPlacement] = useState<Placement>('inline');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  const resolvedSiteUrl = useMemo(() => {
    if (siteUrl) return siteUrl;
    if (typeof window === 'undefined') return 'https://halalticketin.com';
    return window.location.origin;
  }, [siteUrl]);
  const resolvedSlug = slug ?? 'your-event-slug';
  const previewAvailable = Boolean(slug && canCopy && isLive && isPublic);
  const blockedReason = !canCopy
    ? 'Save your event to generate code.'
    : !isLive || !isPublic
      ? 'Publish this event publicly to embed it.'
      : null;

  const currentSnippet = useMemo(() => {
    const snippet = buildEmbedCheckoutSnippet({
      slug: resolvedSlug,
      siteUrl: resolvedSiteUrl,
      ...embedAppearance(settings),
    });
    return wrapSnippet(snippet, placement);
  }, [placement, resolvedSiteUrl, resolvedSlug, settings]);

  const previewUrl = useMemo(
    () => buildPreviewUrl(resolvedSiteUrl, resolvedSlug, settings),
    [resolvedSiteUrl, resolvedSlug, settings]
  );

  const updateSettings = <Key extends keyof EmbedSettings>(key: Key, value: EmbedSettings[Key]) => {
    setOverrides((current) => ({ ...(current ?? browserDefaults), [key]: value }));
  };

  const applyTheme = (theme: EmbedTheme) => {
    setOverrides((current) => ({
      ...(current ?? browserDefaults),
      theme,
      ...EMBED_BRAND_COLOURS[theme],
    text: theme === 'dark' ? '#ffffff' : '#000000',
    }));
  };

  const resetToBrand = () => {
    setOverrides(brandSettings(settings.theme));
  };

  useEffect(() => {
    let trustedOrigin: string;
    try {
      trustedOrigin = new URL(resolvedSiteUrl).origin;
    } catch {
      return;
    }

    const resizePreview = (event: MessageEvent) => {
      const frame = previewFrameRef.current;
      const payload = event.data as { source?: unknown; type?: unknown; height?: unknown } | null;
      if (
        !frame ||
        event.origin !== trustedOrigin ||
        event.source !== frame.contentWindow ||
        payload?.source !== 'ht-embed' ||
        payload.type !== 'resize' ||
        typeof payload.height !== 'number' ||
        !Number.isFinite(payload.height)
      ) {
        return;
      }

      frame.style.height = `${Math.min(10_000, Math.max(160, Math.round(payload.height)))}px`;
    };

    window.addEventListener('message', resizePreview);
    return () => window.removeEventListener('message', resizePreview);
  }, [resolvedSiteUrl]);

  const handleCopySnippet = async () => {
    if (!navigator.clipboard?.writeText) {
      toast.error('Clipboard access is not available.');
      return;
    }
    try {
      await navigator.clipboard.writeText(currentSnippet);
      toast.success('Code copied to clipboard');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Unable to copy embed code');
    }
  };

  const saveBrowserDefaults = () => {
    try {
      window.localStorage.setItem(BROWSER_DEFAULTS_KEY, JSON.stringify(settings));
      toast.success('Embed defaults saved in this browser');
    } catch {
      toast.error('Unable to save browser defaults');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h3 className="text-base font-semibold">Embed checkout</h3>
          <HelpHint label="the embed checkout" side="bottom">
            Paste the code into your website to sell tickets there.
          </HelpHint>
        </div>

      </div>

      {blockedReason && (
        <p className="border-border bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {blockedReason}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-12 xl:gap-6">
        <div className="order-2 space-y-4 xl:order-1 xl:col-span-5">
          <section className="bg-card rounded-xl border" aria-labelledby="embed-appearance-heading">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
              <h4 id="embed-appearance-heading" className="text-sm font-medium">
                Appearance
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground min-h-9"
                onClick={resetToBrand}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            </div>

            <div className="space-y-4 p-4">
              <div
                role="group"
                aria-label="Colour mode"
                className="bg-muted/60 grid grid-cols-2 gap-1 rounded-lg p-1"
              >
                {(['light', 'dark'] as EmbedTheme[]).map((theme) => {
                  const selected = settings.theme === theme;
                  const Icon = theme === 'light' ? Sun : Moon;
                  return (
                    <button
                      key={theme}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => applyTheme(theme)}
                      className={cn(
                        'focus-visible:ring-ring flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none',
                        selected
                          ? 'bg-background ring-border/60 shadow-sm ring-1'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4" />
                      {theme === 'light' ? 'Light' : 'Dark'}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Colours</span>
                  <HelpHint label="colours">
                    Choose black or white text to suit your background.
                  </HelpHint>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {COLOUR_FIELDS.map(({ key, label }) => {
                    const disabled = key === 'background' && settings.transparent;
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label
                          htmlFor={`embed-${key}`}
                          className={cn('text-xs', disabled && 'opacity-50')}
                        >
                          {label}
                        </Label>
                        <Input
                          id={`embed-${key}`}
                          type="color"
                          value={settings[key]}
                          onChange={(event) => updateSettings(key, event.target.value)}
                          disabled={disabled}
                          className="h-10 w-full cursor-pointer p-1"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="embed-text" className="text-xs">Text</Label>
                  <Select value={settings.text} onValueChange={(value) => updateSettings('text', value)}>
                    <SelectTrigger id="embed-text" className="h-10 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#000000">Black</SelectItem>
                      <SelectItem value="#ffffff">White</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="embed-font" className="text-xs">
                    Font
                  </Label>
                  <Select
                    value={settings.font}
                    onValueChange={(value: EmbedFont) => updateSettings('font', value)}
                  >
                    <SelectTrigger id="embed-font" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="serif">Classic serif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="embed-radius" className="text-xs">
                    Corners
                  </Label>
                  <Select
                    value={String(settings.radius)}
                    onValueChange={(value) => updateSettings('radius', Number(value))}
                  >
                    <SelectTrigger id="embed-radius" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Square</SelectItem>
                      <SelectItem value="8">Subtle</SelectItem>
                      <SelectItem value="12">Rounded</SelectItem>
                      <SelectItem value="16">Soft</SelectItem>
                      <SelectItem value="24">Pill-like</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
            <CollapsibleTrigger className="bg-card hover:bg-muted/40 focus-visible:ring-ring flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
              Layout and options
              <ChevronDown
                className={cn(
                  'text-muted-foreground size-4 transition-transform',
                  optionsOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-card mt-2 space-y-3 rounded-xl border p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="embed-placement" className="text-xs">
                      Width
                    </Label>
                    <HelpHint label="width">
                      Sets the maximum width of the checkout on your page: inline 720px, compact
                      420px, full width 1180px.
                    </HelpHint>
                  </div>
                  <Select
                    value={placement}
                    onValueChange={(value: Placement) => setPlacement(value)}
                  >
                    <SelectTrigger id="embed-placement" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PLACEMENTS) as Placement[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {PLACEMENTS[value].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="divide-border/60 divide-y border-t pt-1">
                  <OptionRow
                    id="embed-details"
                    label="Event details"
                    hint="Shows the event name and summary above the ticket choices."
                    checked={settings.showDetails}
                    onCheckedChange={(checked) => updateSettings('showDetails', checked)}
                  />
                  <OptionRow
                    id="embed-transparent"
                    label="Transparent background"
                    hint="Lets your own website background show around the ticket flow."
                    checked={settings.transparent}
                    onCheckedChange={(checked) => updateSettings('transparent', checked)}
                  />
                </div>

                <div className="flex items-center gap-1 border-t pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1"
                    onClick={saveBrowserDefaults}
                  >
                    <Save className="size-4" />
                    Save as my defaults
                  </Button>
                  <HelpHint label="saved defaults">
                    Remembers these settings in this browser and applies them the next time you
                    build an embed.
                  </HelpHint>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="order-1 space-y-4 xl:order-2 xl:col-span-7">
          <section
            className="bg-card overflow-hidden rounded-xl border"
            aria-labelledby="embed-preview-heading"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <h4 id="embed-preview-heading" className="px-1 text-sm font-medium">
                Preview
              </h4>
              <div
                role="group"
                aria-label="Preview size"
                className="bg-muted/60 flex gap-1 rounded-lg p-1"
              >
                {(
                  [
                    ['desktop', 'Desktop', Monitor],
                    ['mobile', 'Mobile', Smartphone],
                  ] as const
                ).map(([value, label, Icon]) => {
                  const selected = previewDevice === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPreviewDevice(value)}
                      className={cn(
                        'focus-visible:ring-ring flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none',
                        selected
                          ? 'bg-background ring-border/60 shadow-sm ring-1'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bg-muted/20 min-h-80 p-3 sm:p-4">
              {previewAvailable ? (
                <div
                  className="bg-background mx-auto w-full overflow-hidden rounded-xl border shadow-sm"
                  style={{
                    maxWidth: previewDevice === 'mobile' ? 375 : PLACEMENTS[placement].maxWidth,
                    // Match the opaque panel the widget itself paints behind a transparent embed.
                    backgroundColor: settings.transparent
                      ? EMBED_RUNTIME_SURFACE[settings.theme]
                      : undefined,
                  }}
                >
                  <iframe
                    ref={previewFrameRef}
                    key={previewUrl}
                    title="Embed checkout preview"
                    sandbox="allow-scripts allow-same-origin"
                    referrerPolicy="strict-origin-when-cross-origin"
                    src={previewUrl}
                    className="block w-full border-0"
                    style={{ height: previewDevice === 'mobile' ? 760 : 680 }}
                  />
                </div>
              ) : (
                <div className="bg-background flex min-h-72 items-center justify-center rounded-xl border border-dashed p-6 text-center">
                  <p className="text-muted-foreground max-w-xs text-sm">
                    The preview appears once this event is saved and published publicly.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section aria-label="Embed code" className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-900/10">
            <div className="flex items-center justify-between gap-3 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-3 rounded-full border border-red-200 bg-red-100" />
                  <span className="size-3 rounded-full border border-amber-200 bg-amber-100" />
                  <span className="size-3 rounded-full border border-emerald-200 bg-emerald-100" />
                </div>
                <span className="font-mono text-xs text-slate-500">embed.html</span>
              </div>
              <Button type="button" variant="ghost" size="sm" className="min-h-10 bg-teal-50/60 text-teal-700 hover:bg-teal-50 hover:text-teal-800" onClick={handleCopySnippet} disabled={!canCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy Code'}
              </Button>
            </div>
            <div className="relative">
              <pre className="min-h-60 overflow-x-auto px-4 py-7 font-mono text-xs leading-6 break-all whitespace-pre-wrap text-slate-700">
                {currentSnippet}
              </pre>
              {!canCopy && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/95 p-4 text-center text-sm text-slate-600">
                  Save your event first to generate code
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
              <Code2 className="size-3.5 shrink-0" aria-hidden />
              Paste this code anywhere in your website’s body tag
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
