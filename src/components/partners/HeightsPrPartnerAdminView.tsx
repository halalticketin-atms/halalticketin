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

const StatePanel = ({
    title,
    body,
    action,
}: {
    title: string;
    body: string;
    action?: React.ReactNode;
}) => (
    <div className="rounded-lg border border-[#d9dedb] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#e7f0ea] text-[#1d5f44]">
            <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-[#14221c]">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#52615c]">{body}</p>
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
        <main className="min-h-screen bg-[#f4f6f2] text-[#14221c]">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-5 border-b border-[#d8ddd7] pb-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4d6b5f]">
                            HeightsPR partner admin
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#14221c] md:text-4xl">
                            Referred organisation signups
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52615c]">
                            A read-only view of organisations that registered through the HeightsPR
                            signup portal.
                        </p>
                    </div>
                    <div className="grid min-w-36 grid-cols-2 gap-2 rounded-lg border border-[#cdd5cf] bg-white p-3 shadow-sm md:grid-cols-1">
                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#68746f]">
                            Signups
                        </span>
                        <strong className="text-3xl font-semibold leading-none text-[#1d5f44]">
                            {state === 'loading' ? '-' : total}
                        </strong>
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
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#14221c] px-4 text-sm font-semibold text-white transition hover:bg-[#263a31]"
                                >
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                    Retry
                                </button>
                            ) : null
                        }
                    />
                ) : null}

                {state === 'loading' ? (
                    <div className="overflow-hidden rounded-lg border border-[#d9dedb] bg-white shadow-sm">
                        {[0, 1, 2].map((item) => (
                            <div
                                key={item}
                                className="grid gap-4 border-b border-[#edf0ed] p-5 last:border-b-0 md:grid-cols-[1.4fr_0.9fr_0.7fr]"
                            >
                                <div className="h-5 rounded bg-[#e8ece8]" />
                                <div className="h-5 rounded bg-[#edf1ee]" />
                                <div className="h-5 rounded bg-[#edf1ee]" />
                            </div>
                        ))}
                    </div>
                ) : null}

                {state === 'loaded' && organizers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#bac6be] bg-white p-10 text-center">
                        <Building2 className="mx-auto h-9 w-9 text-[#6f8077]" aria-hidden="true" />
                        <h2 className="mt-4 text-lg font-semibold text-[#14221c]">
                            No HeightsPR signups yet
                        </h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#52615c]">
                            Organisations will appear here after they complete organiser signup
                            through the HeightsPR portal.
                        </p>
                    </div>
                ) : null}

                {state === 'loaded' && organizers.length > 0 ? (
                    <section className="overflow-hidden rounded-lg border border-[#d9dedb] bg-white shadow-sm">
                        <div className="hidden grid-cols-[1.3fr_0.7fr_0.8fr_0.8fr] gap-4 border-b border-[#dfe5e0] bg-[#edf2ee] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#53645d] md:grid">
                            <span>Organisation</span>
                            <span>Type</span>
                            <span>Location</span>
                            <span>Signed up</span>
                        </div>
                        <div className="divide-y divide-[#edf0ed]">
                            {organizers.map((organizer) => (
                                <article
                                    key={organizer.id}
                                    className="grid gap-4 px-5 py-5 md:grid-cols-[1.3fr_0.7fr_0.8fr_0.8fr] md:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e7f0ea] text-[#1d5f44]">
                                                <Building2 className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="truncate text-base font-semibold text-[#14221c]">
                                                    {organizer.name}
                                                </h2>
                                                {organizer.replyToEmail ? (
                                                    <p className="truncate text-sm text-[#5f6d68]">
                                                        {organizer.replyToEmail}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        {organizer.website ? (
                                            <a
                                                href={organizer.website}
                                                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#1d5f44] hover:text-[#123b2b]"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Website
                                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                            </a>
                                        ) : null}
                                    </div>
                                    <div className="text-sm text-[#34443d]">
                                        <span className="md:hidden">Type: </span>
                                        {formatOrganizerType(organizer.organizerType)}
                                    </div>
                                    <div className="text-sm text-[#34443d]">
                                        <span className="md:hidden">Location: </span>
                                        {[organizer.city, organizer.country].filter(Boolean).join(', ') ||
                                            'Not provided'}
                                    </div>
                                    <div className="text-sm font-medium text-[#34443d]">
                                        <span className="md:hidden">Signed up: </span>
                                        {formatDate(organizer.heightsprReferredAt)}
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
