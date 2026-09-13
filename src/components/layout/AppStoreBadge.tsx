import Link from 'next/link';
import Image from 'next/image';

const APP_STORE_URL = 'https://apps.apple.com/ie/app/halal-ticketin-organiser/id6764363253';

export function AppStoreBadge({ className = '' }: { className?: string }) {
    return (
        <Link
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download HalalTicketin' on the App Store"
            className={`inline-flex transition-opacity hover:opacity-80 ${className}`}
        >
            <Image
                src="/app-store-badge.png"
                alt="Download on the App Store"
                width={458}
                height={258}
                className="h-auto w-[180px]"
                unoptimized
            />
        </Link>
    );
}
