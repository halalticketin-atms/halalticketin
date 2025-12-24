'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { favoriteEvent, unfavoriteEvent, checkIsFavorite } from '@/lib/favorites-api';

interface FavoriteButtonProps {
    eventId: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showBackground?: boolean;
    /** If provided from batched API, skip individual favorite check */
    initialFavorited?: boolean | null;
}

/**
 * Sparkle particle component for the burst effect
 */
function Sparkle({ index, delay, distance }: { index: number; delay: number; distance: number }) {
    const angle = (index / 8) * 360;

    return (
        <motion.div
            initial={{
                opacity: 1,
                scale: 0,
                x: 0,
                y: 0
            }}
            animate={{
                opacity: 0,
                scale: 1,
                x: Math.cos(angle * Math.PI / 180) * distance,
                y: Math.sin(angle * Math.PI / 180) * distance
            }}
            transition={{
                duration: 0.5,
                delay,
                ease: "easeOut"
            }}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
                background: `linear-gradient(135deg, #ff6b9d ${index % 2 === 0 ? '0%' : '50%'}, #ff4b8d 100%)`,
                left: '50%',
                top: '50%',
                marginLeft: '-3px',
                marginTop: '-3px',
            }}
        />
    );
}

/**
 * Animated heart favorite button with sparkle effect
 */
export function FavoriteButton({
    eventId,
    className,
    size = 'md',
    showBackground = true,
    initialFavorited
}: FavoriteButtonProps) {
    const { user, isLoading: authLoading } = useAuth();
    const isAuthenticated = !authLoading && !!user;
    const userId = user?.id;

    const [isFavorited, setIsFavorited] = useState(initialFavorited ?? false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSparkles, setShowSparkles] = useState(false);
    // Skip API call only if authenticated AND initialFavorited was provided
    const [hasChecked, setHasChecked] = useState(
        isAuthenticated && initialFavorited !== undefined && initialFavorited !== null
    );
    const [sparkleDistances, setSparkleDistances] = useState<number[]>(
        () => Array.from({ length: 8 }, () => 20)
    );
    // Track which user's favorite status we have cached
    const [checkedForUserId, setCheckedForUserId] = useState<string | null>(userId ?? null);

    // Reset state when user changes (logout → login as different user)
    useEffect(() => {
        if (userId !== checkedForUserId) {
            setHasChecked(false);
            setIsFavorited(false);
            setCheckedForUserId(userId ?? null);
        }
    }, [userId, checkedForUserId]);

    // Check favorite status on mount (only if not provided via initialFavorited)
    useEffect(() => {
        const checkStatus = async () => {
            if (!isAuthenticated || hasChecked) return;

            try {
                const result = await checkIsFavorite(eventId);
                setIsFavorited(result.favorited);
                setHasChecked(true);
            } catch {
                // Ignore errors
            }
        };

        checkStatus();
    }, [isAuthenticated, eventId, hasChecked]);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
            return;
        }

        if (isLoading) return;

        setIsLoading(true);

        try {
            if (isFavorited) {
                await unfavoriteEvent(eventId);
                setIsFavorited(false);
            } else {
                await favoriteEvent(eventId);
                setIsFavorited(true);
                // Trigger sparkle animation
                setSparkleDistances(
                    Array.from({ length: 8 }, () => 20 + Math.random() * 15)
                );
                setShowSparkles(true);
                setTimeout(() => setShowSparkles(false), 600);
            }
        } catch (err) {
            console.error('Failed to update favorite status:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12'
    };

    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6'
    };

    return (
        <motion.button
            onClick={handleClick}
            disabled={isLoading}
            className={cn(
                'relative flex items-center justify-center transition-all duration-200',
                sizeClasses[size],
                showBackground && 'rounded-full backdrop-blur-sm bg-black/30 border border-white/10 hover:bg-black/50',
                !showBackground && 'hover:scale-110',
                isLoading && 'opacity-50 cursor-wait',
                className
            )}
            whileTap={{ scale: 0.9 }}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            {/* Sparkle particles */}
            <AnimatePresence>
                {showSparkles && (
                    <>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <Sparkle
                                key={i}
                                index={i}
                                delay={i * 0.02}
                                distance={sparkleDistances[i] ?? 20}
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>

            {/* Heart icon with fill animation */}
            <motion.div
                animate={{
                    scale: isFavorited ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
            >
                <Heart
                    className={cn(
                        iconSizes[size],
                        'transition-all duration-300',
                        isFavorited
                            ? 'fill-[#ff4b8d] text-[#ff4b8d] drop-shadow-[0_0_8px_rgba(255,75,141,0.5)]'
                            : showBackground
                                ? 'text-white'
                                : 'text-muted-foreground hover:text-[#ff6b9d]'
                    )}
                />
            </motion.div>

            {/* Ring glow effect on favorite */}
            <AnimatePresence>
                {isFavorited && showSparkles && (
                    <motion.div
                        initial={{ opacity: 0.5, scale: 0.8 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 rounded-full border-2 border-[#ff4b8d]"
                    />
                )}
            </AnimatePresence>
        </motion.button>
    );
}

export default FavoriteButton;
