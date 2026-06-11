import Image from 'next/image';
import Link from 'next/link';
import { Building2, ExternalLink, Lock, RefreshCw } from 'lucide-react';

import type { HeightsPrPartnerOrganizer } from '@/lib/heightspr-partner-api';

type ViewState = 'loading' | 'loaded' | 'unauthenticated' | 'forbidden' | 'error';

type Props = {
    state: ViewState;
    organizers: HeightsPrPartnerOrganizer[];
    errorMessage?: string | null;
    onRetry?: () => void;
};

const formatDate = (value: string) =>
    new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));

const formatOrganizerType = (value: HeightsPrPartnerOrganizer['organizerType']) => {
    if (value === 'organization') return 'Organisation';
    if (value === 'charity') return 'Charity';
    return 'Individual';
};

const HEIGHTSPR_LOGO_SRC = '/logos/heightspr-full-logo-black.png';

const HeightsPrLogo = () => (
    <div className="relative h-9 w-32 shrink-0 sm:h-11 sm:w-40">
        <Image
            src={HEIGHTSPR_LOGO_SRC}
            alt="HeightsPR"
            fill
            sizes="160px"
            priority
            className="object-contain"
        />
    </div>
);

const StatePanel = ({
    title,
    body,
    action,
}: {
    title: string;
    body: string;
    action?: React.ReactNode;
}) => (
    <div className="rounded-lg border border-[#d7d1c5] bg-white/80 p-8 text-center shadow-sm backdrop-blur">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-cyan)]/12 text-[var(--brand-teal)]">
            <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-[#172b27]">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5d6b66]">{body}</p>
        {action ? <div className="mt-5">{action}</div> : null}
    </div>
);

export function HeightsPrPartnerAdminView({
    state,
    organizers,
    errorMessage,
    onRetry,
}: Props) {
    const total = organizers.length;

    return (
        <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(105deg,oklch(0.78_0.14_165/0.24)_0%,oklch(0.72_0.15_185/0.16)_42%,oklch(0.99_0.005_180/0.88)_54%,#fff0e0_100%)] text-[#172b27]">
            <div className="pointer-events-none absolute inset-0 bg-noise opacity-30" />
            <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
                <header className="flex flex-col gap-6 border-b border-[#d7d1c5] pb-7 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <HeightsPrLogo />
                        <h1 className="mt-7 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            HeightsPR signups
                        </h1>
                    </div>
                    <div className="w-full rounded-lg border border-[#d7d1c5] bg-white/65 px-5 py-4 shadow-sm backdrop-blur md:w-auto md:min-w-44">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c7a75]">
                            Total signups
                        </span>
                        <strong className="mt-2 block font-display text-5xl font-bold leading-none text-[var(--brand-teal)]">
                            {state === 'loading' ? '-' : total}
                        </strong>
                        <span className="mt-2 block text-xs font-medium text-[#5d6b66]">
                            organisers
                        </span>
                    </div>
                </header>

                {state === 'unauthenticated' ? (
                    <StatePanel
                        title="Sign in to view the HeightsPR dashboard"
                        body="This page is restricted to the approved HeightsPR admin account."
                        action={
                            <Link
                                href="/login?next=/heightspr/admin"
                                className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#14221c] px-4 text-sm font-semibold text-white transition hover:bg-[#263a31]"
                            >
                                Sign in
                            </Link>
                        }
                    />
                ) : null}

                {state === 'forbidden' ? (
                    <StatePanel
                        title="This account does not have HeightsPR dashboard access"
                        body="Use the approved HeightsPR admin email, or ask Halal Ticketin support to update the access list."
                    />
                ) : null}

                {state === 'error' ? (
                    <StatePanel
                        title="Unable to load HeightsPR signups"
                        body={errorMessage ?? 'The dashboard could not be loaded. Please try again.'}
                        action={
                            onRetry ? (
                                <button
                                    type="button"
                                    onClick={onRetry}
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#172b27] px-4 text-sm font-semibold text-white transition hover:bg-[#263a31]"
                                >
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                    Retry
                                </button>
                            ) : null
                        }
                    />
                ) : null}

                {state === 'loading' ? (
                    <div className="overflow-hidden rounded-lg border border-[#d7d1c5] bg-white/75 shadow-sm backdrop-blur">
                        {[0, 1, 2].map((item) => (
                            <div
                                key={item}
                                className="grid gap-4 border-b border-[#ede7dc] p-5 last:border-b-0 md:grid-cols-[1.45fr_0.55fr_0.75fr_0.6fr]"
                            >
                                <div className="h-5 rounded bg-[#e5e2d8]" />
                                <div className="h-5 rounded bg-[#ece8df]" />
                                <div className="h-5 rounded bg-[#ece8df]" />
                                <div className="h-5 rounded bg-[#ece8df]" />
                            </div>
                        ))}
                    </div>
                ) : null}

                {state === 'loaded' && organizers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#c8c0b3] bg-white/75 p-10 text-center backdrop-blur">
                        <Building2 className="mx-auto h-9 w-9 text-[#6c7a75]" aria-hidden="true" />
                        <h2 className="mt-4 text-lg font-semibold text-[#172b27]">
                            No HeightsPR signups yet
                        </h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5d6b66]">
                            Organisations will appear here after they complete organiser signup
                            through the HeightsPR portal.
                        </p>
                    </div>
                ) : null}

                {state === 'loaded' && organizers.length > 0 ? (
                    <section className="overflow-hidden rounded-lg border border-[#d7d1c5] bg-white/80 shadow-sm backdrop-blur">
                        <div className="hidden grid-cols-[1.45fr_0.55fr_0.75fr_0.6fr] gap-4 border-b border-[#e4ded4] bg-white/60 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#697671] md:grid">
                            <span>Organisation</span>
                            <span>Type</span>
                            <span>Location</span>
                            <span>Signed up</span>
                        </div>
                        <div className="divide-y divide-[#ede7dc]">
                            {organizers.map((organizer) => (
                                <article
                                    key={organizer.id}
                                    className="grid gap-4 px-5 py-5 transition-colors hover:bg-white/50 md:grid-cols-[1.45fr_0.55fr_0.75fr_0.6fr] md:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-cyan)]/12 text-[var(--brand-teal)]">
                                                <Building2 className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="truncate text-base font-semibold text-[#172b27]">
                                                    {organizer.name}
                                                </h2>
                                                {organizer.replyToEmail ? (
                                                    <p className="truncate text-sm text-[#6c7a75]">
                                                        {organizer.replyToEmail}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        {organizer.website ? (
                                            <a
                                                href={organizer.website}
                                                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-teal)] hover:text-[#123b2b]"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Website
                                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                            </a>
                                        ) : null}
                                    </div>
                                    <div className="space-y-1 md:space-y-0">
                                        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a8580] md:hidden">
                                            Type
                                        </span>
                                        <span className="block text-base font-medium text-[#263a31] md:text-sm md:font-normal md:text-[#40514b]">
                                            {formatOrganizerType(organizer.organizerType)}
                                        </span>
                                    </div>
                                    <div className="space-y-1 md:space-y-0">
                                        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a8580] md:hidden">
                                            Location
                                        </span>
                                        <span className="block text-base font-medium text-[#263a31] md:text-sm md:font-normal md:text-[#40514b]">
                                            {[organizer.city, organizer.country].filter(Boolean).join(', ') ||
                                                'Not provided'}
                                        </span>
                                    </div>
                                    <div className="space-y-1 md:space-y-0">
                                        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a8580] md:hidden">
                                            Signed up
                                        </span>
                                        <span className="block text-base font-semibold text-[#263a31] md:text-sm md:font-medium md:text-[#40514b]">
                                            {formatDate(organizer.heightsprReferredAt)}
                                        </span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
        </main>
    );
}
