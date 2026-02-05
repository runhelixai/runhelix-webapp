import { useCallback, useRef } from "react";

export function useHoverPlayback() {
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
    const playbackPositions = useRef<{ [key: string]: number }>({});
    const initialSet = useRef<{ [key: string]: boolean }>({});

    const setRef = useCallback((id: string | number) => (el: HTMLVideoElement | null) => {
        videoRefs.current[String(id)] = el;
        if (el && !initialSet.current[String(id)]) {
            el.addEventListener("loadedmetadata", () => {
                if (el.readyState >= 2) {
                    el.currentTime = 1;
                    initialSet.current[String(id)] = true;
                }
            },
                { once: true });
        }
    }, []);

    const playForHover = useCallback((id: string | number) => {
        const key = String(id);
        const v = videoRefs.current[key];
        if (!v) return;
        if (playbackPositions.current[key] !== undefined) {
            v.currentTime = playbackPositions.current[key];
        } else if (!initialSet.current[key]) {
            v.currentTime = 1;
            initialSet.current[key] = true;
        } else {
            v.currentTime = 0;
        }
        v.play().catch((e) => console.error("hover play err", e));
    }, []);

    const pauseAndSave = useCallback((id: string | number) => {
        const key = String(id);
        const v = videoRefs.current[key];
        if (!v) return;
        playbackPositions.current[key] = v.currentTime;
        v.pause();
    }, []);

    return { setRef, playForHover, pauseAndSave, videoRefs };
}