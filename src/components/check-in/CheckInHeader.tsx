'use client';

import { motion } from 'motion/react';
import { ScanLine, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CheckInStats } from '@/types';
import { CheckInStatsBar } from '@/components/check-in/CheckInStatsBar';

type Mode = 'scan' | 'search';

interface EventOption {
  id: string;
  name: string;
}

interface CheckInHeaderProps {
  events: EventOption[];
  selectedEventId: string;
  onEventChange: (id: string) => void;
  stats: CheckInStats;
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
  error?: string | null;
  subtitle?: string;
  showModeToggle?: boolean;
  isEventLoading?: boolean;
}

export function CheckInHeader({
  events,
  selectedEventId,
  onEventChange,
  stats,
  mode = 'scan',
  onModeChange,
  error,
  subtitle,
  showModeToggle = true,
  isEventLoading = false,
}: CheckInHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-4"
    >
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Check-in</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      <Select value={selectedEventId} onValueChange={onEventChange}>
        <SelectTrigger
          className="w-full md:w-[300px] mt-2"
          disabled={isEventLoading || events.length === 0}
        >
          <SelectValue
            placeholder={
              isEventLoading ? 'Loading events...' : events.length === 0 ? 'No active events' : undefined
            }
          />
        </SelectTrigger>
        <SelectContent>
          {events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              {event.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isEventLoading && events.length === 0 && (
        <p className="text-sm text-muted-foreground">No active events available.</p>
      )}

      <CheckInStatsBar stats={stats} />

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      {showModeToggle && onModeChange && (
        <div className="flex gap-2 mt-2">
          <Button
            variant={mode === 'scan' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => onModeChange('scan')}
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Scan QR
          </Button>
          <Button
            variant={mode === 'search' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => onModeChange('search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      )}
    </motion.div>
  );
}
