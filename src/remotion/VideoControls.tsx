import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Scissors } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VideoControlsProps {
    isPlaying: boolean;
    isMuted: boolean;
    currentFrame: number;
    durationInFrames: number;
    fps: number;
    volume: number;
    onPlayPause: () => void;
    onSeek: (frame: number) => void;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
    onFullscreen: () => void;
    isFullscreen: boolean;
    title?: string;
    isTrimming?: boolean;
    trimRange?: [number, number];
    onToggleTrim?: () => void;
    onTrimChange?: (range: [number, number]) => void;
}

const formatTime = (frames: number, fps: number) => {
    const seconds = Math.floor(frames / fps);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const VideoControls: React.FC<VideoControlsProps> = ({
    isPlaying,
    isMuted,
    currentFrame,
    durationInFrames,
    fps,
    volume,
    onPlayPause,
    onSeek,
    onVolumeChange,
    onToggleMute,
    onFullscreen,
    isFullscreen,
    title,
    isTrimming = false,
    trimRange = [0, durationInFrames],
    onToggleTrim,
    onTrimChange,
}) => {
    const [isHovering, setIsHovering] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);

    // YouTube style: Controls fade out after inactivity unless paused
    const [showControls, setShowControls] = useState(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseMove = () => {
        setShowControls(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (isPlaying) {
            timeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    };

    const handleMouseLeave = () => {
        if (isPlaying) {
            setShowControls(false);
        }
    };

    useEffect(() => {
        if (!isPlaying) {
            setShowControls(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        } else {
            timeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isPlaying]);

    return (
        <div
            className="absolute inset-0 flex flex-col justify-end transition-opacity duration-300 z-50"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ opacity: showControls || isHovering || isScrubbing || isTrimming ? 1 : 0 }}
        >
            {/* Top Gradient for Title */}
            {title && (
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                    <h3 className="text-white text-lg font-medium drop-shadow-md">{title}</h3>
                </div>
            )}

            {/* Bottom Controls Area */}
            <div
                className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pb-3 pt-10"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Trim Slider */}
                {isTrimming && onTrimChange && (
                    <div className="mb-4 px-1">
                        <div className="flex justify-between text-xs text-white/80 mb-1">
                            <span>Trim Start: {formatTime(trimRange[0], fps)}</span>
                            <span>Trim End: {formatTime(trimRange[1], fps)}</span>
                        </div>
                        <div className="relative h-1.5">
                            <Slider
                                value={trimRange}
                                min={0}
                                max={durationInFrames}
                                step={1}
                                onValueChange={(vals) => onTrimChange([vals[0], vals[1]])}
                                className="z-20 relative"
                            />
                        </div>
                    </div>
                )}

                {/* Progress Bar */}
                <div className="group relative h-1.5 hover:h-2.5 transition-all cursor-pointer mb-3 rounded-full bg-white/30">
                    <Slider
                        value={[currentFrame]}
                        min={0}
                        max={durationInFrames}
                        step={1}
                        onValueChange={(vals) => {
                            setIsScrubbing(true);
                            onSeek(vals[0]);
                        }}
                        onValueCommit={() => setIsScrubbing(false)}
                        className="absolute inset-0 z-10 opacity-0 transition-opacity"
                    />
                    <div
                        className="absolute top-0 left-0 bottom-0 bg-[#29A6B4] rounded-l-full"
                        style={{ width: `${(currentFrame / durationInFrames) * 100}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#29A6B4] rounded-full scale-0 group-hover:scale-100 transition-transform shadow-lg" />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button
                            onClick={onPlayPause}
                            className="text-white hover:text-white/90 transition-transform hover:scale-110"
                        >
                            {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
                        </button>

                        {/* Volume */}
                        <div className="flex items-center gap-2 group/volume relative">
                            <button
                                onClick={onToggleMute}
                                className="text-white hover:text-white/90"
                            >
                                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                            </button>
                            <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 ease-in-out flex items-center">
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

                        {/* Time */}
                        <div className="text-white text-sm font-medium select-none">
                            <span>{formatTime(currentFrame, fps)}</span>
                            <span className="mx-1 text-white/70">/</span>
                            <span className="text-white/70">{formatTime(durationInFrames, fps)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Trim Toggle */}
                        {/* {onToggleTrim && (
                            <button
                                onClick={onToggleTrim}
                                className={cn(
                                    "text-white hover:text-white/90 transition-transform hover:scale-110",
                                    isTrimming && "text-[#29A6B4]"
                                )}
                                title="Trim Video"
                            >
                                <Scissors className="w-5 h-5" />
                            </button>
                        )} */}

                        {/* Fullscreen */}
                        <button
                            onClick={onFullscreen}
                            className="text-white hover:text-white/90 transition-transform hover:scale-110"
                        >
                            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
