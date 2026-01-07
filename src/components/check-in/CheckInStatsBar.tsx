import { motion } from 'motion/react';
import { Users } from 'lucide-react';
import type { CheckInStats } from '@/types';

interface CheckInStatsBarProps {
  stats: CheckInStats;
}

export function CheckInStatsBar({ stats }: CheckInStatsBarProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">
          <span className="text-green-600 dark:text-green-400">{stats.checkedIn}</span>
          <span className="text-muted-foreground"> / {stats.totalTickets}</span>
        </span>
      </div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${stats.percentage}%` }}
          className="h-full bg-green-500 rounded-full"
        />
      </div>
      <span className="text-sm font-bold text-green-600 dark:text-green-400">
        {stats.percentage.toFixed(0)}%
      </span>
    </div>
  );
}

