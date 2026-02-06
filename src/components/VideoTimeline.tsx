import React, { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider"; // Keep this for volume slider
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Loader2, Play, Pause, Download, Eye, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoTimelineProps {
    videoUrl: string;
    durationInFrames: number;
    fps: number;
    currentFrame: number;
    trimRange: [number, number];
    onTrimChange: (range: [number, number]) => void;
    onSeek: (frame: number) => void;
    onPlayPause: () => void;
    isPlaying: boolean;

    onDownload: () => void;
    onPreviewTrim: () => void;
    isDownloading: boolean;
    volume: number;
    onVolumeChange: (volume: number) => void;
    isMuted: boolean;
    onToggleMute: () => void;
}

const VideoTimeline = ({
    videoUrl,
    durationInFrames,
    fps,
    currentFrame,
    trimRange,
    onTrimChange,
    onSeek,
    onPlayPause,
    isPlaying,

    onDownload,
    onPreviewTrim,
    isDownloading,
    volume,
    onVolumeChange,
    isMuted,
    onToggleMute
}: VideoTimelineProps) => {
    const THUMBNAIL_COUNT = 10;
    const [thumbnails, setThumbnails] = useState<string[]>(Array(THUMBNAIL_COUNT).fill(""));
    const [isExtracting, setIsExtracting] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!videoUrl) return;

        let isCancelled = false;

        // Reset thumbnails when URL changes
        setThumbnails(Array(THUMBNAIL_COUNT).fill(""));

        const extractFrames = async () => {
            setIsExtracting(true);

            const video = document.createElement("video");
            video.src = videoUrl;
            video.crossOrigin = "anonymous";
            video.muted = true;
            video.playsInline = true;

            await new Promise((resolve, reject) => {
                video.onloadedmetadata = () => resolve(true);
                video.onerror = (e) => reject(e);
            });

            const duration = video.duration;
            const interval = duration / THUMBNAIL_COUNT;

            // Set canvas size
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const w = 160;
            const h = 90;
            canvas.width = w;
            canvas.height = h;

            for (let i = 0; i < THUMBNAIL_COUNT; i++) {
                if (isCancelled) break;

                const time = i * interval;
                video.currentTime = time;

                await new Promise((resolve) => {
                    video.onseeked = () => {
                        if (ctx && !isCancelled) {
                            ctx.drawImage(video, 0, 0, w, h);
                            const dataUrl = canvas.toDataURL("image/jpeg");

                            // Update state incrementally
                            setThumbnails(prev => {
                                const newThumbs = [...prev];
                                newThumbs[i] = dataUrl;
                                return newThumbs;
                            });
                        }
                        resolve(true);
                    };
                });
            }

            if (!isCancelled) {
                setIsExtracting(false);
            }
        };

        extractFrames().catch(err => {
            console.error("Frame extraction failed:", err);
            setIsExtracting(false);
        });

        return () => {
            isCancelled = true;
        };
    }, [videoUrl]);

    const formatTime = (frames: number) => {
        const seconds = Math.floor(frames / fps);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const trimDuration = (trimRange[1] - trimRange[0]) / fps;

    // Calculate percentages for positioning
    const leftPercent = (trimRange[0] / durationInFrames) * 100;
    const rightPercent = (trimRange[1] / durationInFrames) * 100;
    const widthPercent = rightPercent - leftPercent;

    return (
        <div className="w-full bg-[#121212] border-t border-gray-800 p-4 flex flex-col gap-4">

            {/* Top Bar: Playback Controls & Info */}
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-y-4">
                <div className="flex items-center gap-4 order-2 md:order-1">
                    <button onClick={onPlayPause} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                    </button>

                    <div className="flex items-center gap-2 group relative">
                        <button onClick={onToggleMute} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                        </button>
                        <div className="w-0 overflow-hidden group-hover:w-24 transition-all duration-300 ease-in-out flex items-center">
                            <Slider
                                value={[isMuted ? 0 : volume]}
                                min={0}
                                max={1}
                                step={0.05}
                                onValueChange={(vals) => onVolumeChange(vals[0])}
                                className="w-20 ml-2"
                            />
                        </div>
                    </div>

                    <div className="text-white text-sm font-medium">
                        {/* {formatTime(currentFrame)} / {formatTime(durationInFrames)} */}
                    </div>
                </div>

                {/* Progress Bar (Blue line) */}
                <div className="order-1 md:order-2 w-full md:flex-1 md:mx-6 h-1 bg-gray-700 rounded-full relative group cursor-pointer mt-2 md:mt-0"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        onSeek(Math.floor(percentage * durationInFrames));
                    }}
                >
                    <div
                        className="absolute h-full bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] rounded-full flex items-center justify-end"
                        style={{ width: `${(currentFrame / durationInFrames) * 100}%` }}
                    >
                        <div className="w-3 h-3 bg-white rounded-full shadow-md translate-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 order-3 ml-auto md:ml-0 overflow-x-auto hide-scrollbar max-w-[calc(100vw-4rem)] md:max-w-none">
                    <span className="text-gray-400 text-xs md:text-sm whitespace-nowrap">
                        Trimmed: <span className="text-[#29A6B4] font-medium">{trimDuration.toFixed(1)}s</span>
                    </span>



                    <Button variant="outline" size="sm" onClick={onDownload} disabled={isDownloading} className="bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] text-white hover:opacity-90 border-0 px-3 md:px-4">
                        {isDownloading ? <Loader2 className="w-4 h-4 md:mr-2 animate-spin" /> : <Download className="w-4 h-4 md:mr-2" />}
                        <span className="hidden md:inline">Download Clip</span>
                    </Button>

                    <Button variant="outline" size="sm" onClick={onPreviewTrim} className="border-gray-700 text-gray-300 hover:text-white bg-transparent hover:bg-white/10 px-2 md:px-3">
                        <Eye className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Preview Trim</span>
                    </Button>
                </div>
            </div>


            {/* Timeline Section */}
            <div className="w-full bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[#29A6B4]"><ScissorsIcon /></span>
                        <span className="text-gray-300 text-sm font-medium">Trim Video</span>
                    </div>
                    <div className="flex gap-4 text-xs font-mono text-[#29A6B4]">
                        <span>{formatTime(trimRange[0])}</span>
                        <span className="text-gray-500">to</span>
                        <span>{formatTime(trimRange[1])}</span>
                        <span className="text-gray-500">({trimDuration.toFixed(0)}s)</span>
                    </div>
                </div>

                <div className="relative h-20 w-full select-none" ref={containerRef}>
                    {/* Thumbnails Background */}
                    <div className="absolute inset-0 flex overflow-hidden rounded-md bg-gray-900 border border-gray-700">
                        {thumbnails.map((src, i) => (
                            <div key={i} className="h-full flex-1 relative border-r border-gray-800 last:border-r-0">
                                {src ? (
                                    <img src={src} className="w-full h-full object-cover" alt={`frame-${i}`} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                        <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Dimmed Overlays */}
                    <div
                        className="absolute top-0 bottom-0 left-0 bg-black/60 rounded-l-md pointer-events-none z-10"
                        style={{ width: `${leftPercent}%` }}
                    />
                    <div
                        className="absolute top-0 bottom-0 right-0 bg-black/60 rounded-r-md pointer-events-none z-10"
                        style={{ width: `${100 - rightPercent}%` }}
                    />

                    {/* Selected Region Border */}
                    <div
                        className="absolute top-0 bottom-0 border-t-2 border-b-2 border-[#29A6B4] pointer-events-none z-10"
                        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    />

                    {/* Playhead Indicator */}
                    <div
                        className="absolute top-0 bottom-0 w-[2px] bg-[#29A6B4] z-20 pointer-events-none shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                        style={{ left: `${(currentFrame / durationInFrames) * 100}%` }}
                    >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#29A6B4] rounded-full shadow-sm" />
                    </div>

                    {/* Interactive Slider */}
                    <SliderPrimitive.Root
                        className="relative flex w-full touch-none select-none items-center h-full z-40"
                        value={trimRange}
                        min={0}
                        max={durationInFrames}
                        step={1}
                        minStepsBetweenThumbs={30} // Approx 1s at 30fps
                        onValueChange={(vals) => onTrimChange([vals[0], vals[1]])}
                    >
                        <SliderPrimitive.Track className="relative h-full w-full grow overflow-visible rounded-full">
                            {/* We don't need a visible track because the overlay divs handle the visuals */}
                            {/* <SliderPrimitive.Range className="absolute h-full bg-transparent" /> */}
                        </SliderPrimitive.Track>

                        {/* Left Thumb */}
                        <SliderPrimitive.Thumb
                            className="h-24 w-4 -mt-2 bg-white rounded-md border-2 border-gray-300 shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-ew-resize flex items-center justify-center group z-50 relative"
                        >
                            <div className="h-8 w-1 bg-gray-400 rounded-full group-hover:bg-[#29A6B4] transition-colors" />
                        </SliderPrimitive.Thumb>

                        {/* Right Thumb */}
                        <SliderPrimitive.Thumb
                            className="h-24 w-4 -mt-2 bg-white rounded-md border-2 border-gray-300 shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-ew-resize flex items-center justify-center group z-50 relative"
                        >
                            <div className="h-8 w-1 bg-gray-400 rounded-full group-hover:bg-[#29A6B4] transition-colors" />
                        </SliderPrimitive.Thumb>
                    </SliderPrimitive.Root>

                </div>
            </div>
        </div>
    );
};

const ScissorsIcon = () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
        <path d="M4.5 9.5C5.05228 9.5 5.5 9.05228 5.5 8.5C5.5 7.94772 5.05228 7.5 4.5 7.5C3.94772 7.5 3.5 7.94772 3.5 8.5C3.5 9.05228 3.94772 9.5 4.5 9.5ZM4.5 10.5C5.60457 10.5 6.5 9.60457 6.5 8.5C6.5 7.64571 5.96422 6.91924 5.20786 6.64966L7.5 4.35754L9.79214 6.64966C9.03578 6.91924 8.5 7.64571 8.5 8.5C8.5 9.60457 9.39543 10.5 10.5 10.5C11.6046 10.5 12.5 9.60457 12.5 8.5C12.5 7.39543 11.6046 6.5 10.5 6.5C9.94772 6.5 9.44772 6.72386 9.07906 7.09214L6.7929 4.80598L6.7929 4.80598L9.07906 2.51982C9.44772 2.8881 9.94772 3.11196 10.5 3.11196C11.6046 3.11196 12.5 2.21653 12.5 1.11196C12.5 0.00739265 11.6046 -0.888037 10.5 -0.888037C9.39543 -0.888037 8.5 0.00739265 8.5 1.11196C8.5 1.66424 8.72386 2.16424 9.09214 2.5329L6.806 4.81904L4.51982 2.5329C4.8881 2.16424 5.11196 1.66424 5.11196 1.11196C5.11196 0.00739265 4.21653 -0.888037 3.11196 -0.888037C2.00739 -0.888037 1.11196 0.00739265 1.11196 1.11196C1.11196 2.21653 2.00739 3.11196 3.11196 3.11196C3.66424 3.11196 4.16424 2.8881 4.5329 2.51982L6.09286 4.07978L4.5329 5.63974C4.16424 5.27146 3.66424 5.0476 3.11196 5.0476C2.00739 5.0476 1.11196 5.94297 1.11196 7.04754C1.11196 8.15211 2.00739 9.04748 3.11196 9.04748C3.11746 9.04748 3.12295 9.04746 3.12843 9.04743C3.47353 9.94827 4.34358 10.5 5.30909 10.5H5.5H9.5H9.69091C10.6564 10.5 11.5265 9.94827 11.8716 9.04743C11.877 9.04746 11.8825 9.04748 11.888 9.04748C12.9926 9.04748 13.888 8.15211 13.888 7.04754C13.888 5.94297 12.9926 5.0476 11.888 5.0476C11.3358 5.0476 10.8358 5.27146 10.4671 5.63974L8.20711 7.89975L6.79289 9.31396L5.37868 7.89975L4.5329 7.05396C4.16424 7.42224 3.66424 7.6461 3.11196 7.6461C2.55968 7.6461 2.05968 7.42224 1.69102 7.05396C1.32236 6.68528 1.11196 6.18528 1.11196 5.633C1.11196 4.52843 2.00739 3.633 3.11196 3.633C3.66424 3.633 4.16424 3.85686 4.5329 4.22514L6.09286 5.7851L6.79289 6.48513L7.49292 5.7851L9.07906 4.19896C9.44772 4.56724 9.94772 4.7911 10.5 4.7911C11.6046 4.7911 12.5 3.89567 12.5 2.7911C12.5 1.68653 11.6046 0.791104 10.5 0.791104C9.39543 0.791104 8.5 1.68653 8.5 2.7911C8.5 3.34338 8.72386 3.84338 9.09214 4.21166L10.4671 2.8367C10.8358 3.20498 10.8358 3.80196 10.4671 4.17024C10.0984 4.53852 9.50142 4.53852 9.13274 4.17024L7.5466 2.5841L7.5466 2.5841C7.91526 2.21582 8.13912 1.71582 8.13912 1.16354C8.13912 0.0589714 7.24369 -0.836456 6.13912 -0.836456C5.03455 -0.836456 4.13912 0.0589714 4.13912 1.16354C4.13912 1.71582 4.36298 2.21582 4.73126 2.5841L6.3174 4.17024L4.73126 5.75638C4.36298 6.12466 4.13912 6.62466 4.13912 7.17694C4.13912 8.28151 5.03455 9.17694 6.13912 9.17694C7.24369 9.17694 8.13912 8.28151 8.13912 7.17694C8.13912 6.62466 7.91526 6.12466 7.5466 5.75638L6.13912 7.16386C5.77084 6.79558 5.77084 6.1986 6.13912 5.83032C6.5074 5.46204 7.10438 5.46204 7.47266 5.83032L8.88014 7.2378L10.2876 5.83032L8.88014 4.42284L7.47266 5.83032Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
)

export default VideoTimeline;
