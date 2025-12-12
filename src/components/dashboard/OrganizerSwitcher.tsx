'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function OrganizerSwitcher() {
    const router = useRouter();
    const { organizers, activeOrganizerId, setActiveOrganizerId, isLoading } = useOrganizers();

    const options = useMemo(() => organizers, [organizers]);

    if (isLoading && options.length === 0) {
        return (
            <div className="px-4 py-3">
                <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
            </div>
        );
    }

    if (options.length === 0) {
        return null;
    }

    const handleChange = (organizerId: string) => {
        setActiveOrganizerId(organizerId);
        router.push(buildDashboardPath(organizerId));
    };

    return (
        <div className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Organizer
            </p>
            <Select value={activeOrganizerId ?? undefined} onValueChange={handleChange}>
                <SelectTrigger className="w-full h-11 justify-start">
                    <SelectValue placeholder="Select organizer">
                        {activeOrganizerId
                            ? options.find((org) => org.id === activeOrganizerId)?.name ?? 'Select organizer'
                            : 'Select organizer'}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {options.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{org.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
