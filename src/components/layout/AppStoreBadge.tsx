import Link from 'next/link';

const APP_STORE_URL = 'https://apps.apple.com/ie/app/halal-ticketin-organiser/id6764363253';

export function AppStoreBadge({ className = '' }: { className?: string }) {
    return (
        <Link
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download HalalTicketin' on the App Store"
            className={`group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-foreground px-3.5 py-2 text-background ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[oklch(0.72_0.15_185/0.35)] hover:ring-[oklch(0.72_0.15_185/0.5)] ${className}`}
        >
            {/* Animated brand-color sheen on hover */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[oklch(0.78_0.14_165/0.25)] to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100"
            />

            <svg
                viewBox="0 0 24 24"
                className="relative h-6 w-6 shrink-0 fill-current"
                aria-hidden="true"
            >
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>

            <span className="relative flex flex-col leading-none">
                <span className="text-[9px] font-medium tracking-wide opacity-80">
                    Download on the
                </span>
                <span className="mt-0.5 text-[15px] font-semibold tracking-tight">
                    App&nbsp;Store
                </span>
            </span>
        </Link>
    );
}
