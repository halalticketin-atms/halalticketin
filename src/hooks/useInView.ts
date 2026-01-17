'use client';

import { useEffect, useRef, useState } from 'react';

export function useInView<T extends Element>(options?: IntersectionObserverInit) {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(() =>
        typeof window === 'undefined' || !('IntersectionObserver' in window),
    );

    useEffect(() => {
        if (inView || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
            return;
        }

        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry?.isIntersecting) {
                setInView(true);
                observer.disconnect();
            }
        }, options);

        observer.observe(node);
        return () => observer.disconnect();
    }, [inView, options]);

    return { ref, inView };
}
