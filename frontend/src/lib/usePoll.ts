"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Load data now, then refresh every `ms` while the tab is visible.
export function usePoll<T>(load: () => Promise<T>, ms: number, deps: unknown[] = []) {

    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);

    const loadRef = useRef(load);
    loadRef.current = load;

    const refresh = useCallback(async () => {
        try {
            const result = await loadRef.current();
            setData(result);
            setError(null);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        refresh();
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") refresh();
        }, ms);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ms, refresh, ...deps]);

    return { data, error, loading, refresh, setData };
}
