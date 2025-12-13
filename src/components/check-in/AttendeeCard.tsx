import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CheckInTicket } from '@/types';

interface AttendeeCardProps {
  ticket: CheckInTicket;
  onCheckIn: (id: string) => void;
  onUndo: (id: string) => void;
  isUpdating?: boolean;
}

export function AttendeeCard({ ticket, onCheckIn, onUndo, isUpdating }: AttendeeCardProps) {
  const isCheckedIn = ticket.checkInStatus === 'checked_in';
  const checkedInTime =
    ticket.checkedInAt?.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }) ?? null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-card rounded-xl border flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{ticket.attendeeName}</p>
        <p className="text-sm text-muted-foreground truncate">{ticket.attendeeEmail}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {ticket.ticketType}
          </Badge>
          {ticket.groupSize > 1 && (
            <Badge variant="secondary" className="text-xs">
              {ticket.groupCheckedIn}/{ticket.groupSize} in group
            </Badge>
          )}
        </div>
        {isCheckedIn && (
          <p className="text-xs text-muted-foreground mt-1">
            Checked in
            {checkedInTime ? ` at ${checkedInTime}` : ''}
            {ticket.checkedInByName ? ` by ${ticket.checkedInByName}` : ''}
          </p>
        )}
      </div>
      <div>
        {isCheckedIn ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isUpdating}
            onClick={() => onUndo(ticket.id)}
            className="text-amber-600 border-amber-200 hover:bg-amber-50"
          >
            Undo
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={isUpdating}
            onClick={() => onCheckIn(ticket.id)}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]"
          >
            <Check className="h-4 w-4 mr-1" />
            Check In
          </Button>
        )}
      </div>
    </motion.div>
  );
}
