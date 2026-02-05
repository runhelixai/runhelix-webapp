import { Dispatch, SetStateAction, useEffect, useRef, useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Edit, Loader2, X } from "lucide-react";
import { commonSvgIcon } from "@/helpers/commonSvg";
import { Button } from "@/components/ui/button";
import { Generation } from "@/types";
import EditDialog from "./EditDialog";
import { renameUserPrompt } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Player, PlayerRef } from "@remotion/player";
import { SimpleVideo } from "@/remotion/compositions/SimpleVideo";
import { getVideoMetadata } from "@remotion/media-utils";
import VideoTimeline from "./VideoTimeline";

const FullscreenModal = ({ selectedVideo, onClose, onDownload, setGeneratedVideo, setSelectedVideo, shouldBlur }: {
    selectedVideo: Generation | null;

    onClose: () => void;
    onDownload: (url?: string, title?: string, mode?: string, onProgress?: (progress: number) => void, trimOptions?: { start: number; end: number }, videoId?: string) => void;
    setGeneratedVideo?: Dispatch<SetStateAction<any>>;
    setSelectedVideo?: Dispatch<SetStateAction<Generation | null>>;
    shouldBlur?: boolean;
}) => {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [renameModelOpen, setRenameModel] = useState(false);

    /* Trim State */
    const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
    const [videoMetadata, setVideoMetadata] = useState<{
        durationInFrames: number;
        width: number;
        height: number;
        fps: number;
    } | null>(null);

    const handleRename = async (value: string) => {
        try {
            const idStr = String(selectedVideo?.id);
            const res = await renameUserPrompt({ idStr, value });
            setGeneratedVideo?.((prev: any) => prev.map((item: any) => item.id === res[0].id ? { ...item, user_content: value.trim() } : item));

            // Allow immediate update of the modal title
            setSelectedVideo?.((prev: Generation | null) => prev ? { ...prev, user_content: value.trim() } : null);

            toast({
                title: "Success",
                description: "Prompt updated successfully",
                variant: "default",
            });
        } catch (error) {
            console.log(error, "error")
        } finally {
            setRenameModel(false);
        }
    };

    // Fetch metadata when selectedVideo changes
    useEffect(() => {
        if (selectedVideo && selectedVideo.mode !== "image-to-image" && selectedVideo.videoUrl) {
            setVideoMetadata(null); // Reset
            getVideoMetadata(selectedVideo.videoUrl)
                .then((data) => {
                    const meta = {
                        durationInFrames: Math.floor(data.durationInSeconds * 30), // assuming 30fps
                        width: data.width,
                        height: data.height,
                        fps: 30, // Remotion usually defaults to 30 unless specified
                    };
                    setVideoMetadata(meta);
                })
                .catch((err) => {
                    console.error("Failed to load video metadata", err);
                });
        } else {
            setVideoMetadata(null);
        }
    }, [selectedVideo]);

    // Sync trimRange with videoMetadata
    useEffect(() => {
        if (videoMetadata) {
            setTrimRange([0, videoMetadata.durationInFrames]);
        }
    }, [videoMetadata]);

    const handleDownloadClick = async (currentTrimRange: [number, number]) => {
        if (!selectedVideo || !videoMetadata) return;

        try {
            const fps = videoMetadata.fps || 30;
            let trimOptions = undefined;

            // Only apply trim options if the range is different from the full duration
            if (currentTrimRange[0] > 0 || currentTrimRange[1] < videoMetadata.durationInFrames) {
                trimOptions = {
                    start: currentTrimRange[0] / fps,
                    end: currentTrimRange[1] / fps,
                };
            }

            await onDownload(
                selectedVideo.videoUrl || selectedVideo.imageUrl,
                selectedVideo.title,
                selectedVideo.mode,
                undefined,
                trimOptions,
                String(selectedVideo.id)
            );
        } catch (error) {
            console.error("Download error:", error);
        }
    };

    if (!selectedVideo) return null;

    return (
        <>
            <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && onClose()}>
                <DialogContent
                    className={`max-w-[90vw] h-[90vh] p-0 bg-[#000000] border-0 rounded-lg overflow-hidden flex flex-col z-[150] transition-all duration-300`}
                    hideCloseButton={true}
                    onInteractOutside={(e) => e.preventDefault()}  >
                    <div className="relative w-full h-full flex flex-col">
                        {/* Close Button - positioned absolutely over the content or in a header if we had one */}
                        <button onClick={onClose} className="absolute right-4 top-4 z-[200] rounded-full p-2 bg-black/50 text-white hover:bg-white/20 transition-colors" aria-label="Close">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex-1 relative overflow-hidden flex flex-col">
                            <FullscreenPlayer
                                selectedVideo={selectedVideo}
                                shouldBlur={shouldBlur}
                                onClose={onClose}
                                isMobile={isMobile}
                                trimRange={trimRange}
                                setTrimRange={setTrimRange}
                                videoMetadata={videoMetadata}
                                onDownloadRequest={handleDownloadClick}
                                onRename={() => setRenameModel(true)}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <EditDialog
                open={renameModelOpen}
                onClose={() => setRenameModel(false)}
                selectedVideo={selectedVideo}
                onConfirm={handleRename}
                loading={false}
            />
        </>
    );
}

const FullscreenPlayer = ({
    selectedVideo,
    shouldBlur,
    onClose,
    isMobile,
    trimRange,
    setTrimRange,
    videoMetadata,
    onDownloadRequest,
    onRename
}: {
    selectedVideo: Generation;
    shouldBlur?: boolean;
    onClose: () => void;
    isMobile: boolean;
    trimRange: [number, number];
    setTrimRange: Dispatch<SetStateAction<[number, number]>>;
    videoMetadata: {
        durationInFrames: number;
        width: number;
        height: number;
        fps: number;
    } | null;
    onDownloadRequest: (range: [number, number]) => void;
    onRename: () => void;
}) => {
    const videoRef = useRef<PlayerRef>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isPreviewingTrim, setIsPreviewingTrim] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const isTrimActive = trimRange[1] > 0 && (trimRange[0] > 0 || trimRange[1] < (videoMetadata?.durationInFrames || 0));
    // If trimming is active, the Player believes it is playing a shorter video (0 to trimDuration)
    // We must map this "Player Time" back to "Source Time" for the Timeline.

    const inputProps = useMemo(() => ({
        videoUrl: selectedVideo.videoUrl,
        muted: isMuted,
        volume: isMuted ? 0 : volume,
        startFrom: isTrimActive ? trimRange[0] : undefined,
        endAt: isTrimActive ? trimRange[1] : undefined,
    }), [selectedVideo.videoUrl, isMuted, volume, isTrimActive, trimRange]);

    const playerStyle: React.CSSProperties = useMemo(() => ({
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    }), []);

    // Sync current frame
    useEffect(() => {
        let animationFrameId: number;

        const updateFrame = () => {
            if (videoRef.current) {
                const frame = videoRef.current.getCurrentFrame();

                // If trimming is active, frame is relative to 0 (which is trimRange[0] in source)
                // So we add trimRange[0] to get source frame
                const sourceFrame = isTrimActive ? frame + trimRange[0] : frame;

                setCurrentFrame(sourceFrame);
            }
            if (isPlaying) {
                animationFrameId = requestAnimationFrame(updateFrame);
            }
        };

        if (isPlaying) {
            animationFrameId = requestAnimationFrame(updateFrame);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, isTrimActive, trimRange]);


    // Auto-play when metadata loads
    useEffect(() => {
        if (videoMetadata) {
            setIsPlaying(true);
            // Ensure video plays even if autoPlay prop misses (e.g. browser policies or race conditions)
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play();
                }
            }, 100);
        }
    }, [videoMetadata]);

    // Blur handling
    useEffect(() => {
        if (shouldBlur && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                }
            }, 100);
        }
    }, [shouldBlur]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && videoRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    const handleSeek = (sourceFrame: number) => {
        if (videoRef.current) {
            // Map source frame to player frame
            // If sourceFrame < trimRange[0], we clamp or just seek to 0?
            // Usually Timeline allows seeking anywhere.
            // But if Player is trimmed, it CANNOT seek outside 0..trimDuration.
            // If user seeks outside trim range, we probably shouldn't play?
            // OR we temporarily disable trim mode? 
            // Better: If seeking outside, we just jump to the nearest boundary or update trim?
            // For now, let's assume strict preview: The Player ONLY contains the trimmed video.

            let playerFrame = isTrimActive ? sourceFrame - trimRange[0] : sourceFrame;

            // Clamp to valid player range
            if (isTrimActive) {
                if (sourceFrame < trimRange[0]) playerFrame = 0;
                if (sourceFrame > trimRange[1]) playerFrame = trimRange[1] - trimRange[0];
            }

            videoRef.current.seekTo(playerFrame);
            setCurrentFrame(sourceFrame);

            // If we seek while not playing, we might want to stay paused.
            // But if the user drags the scrubber, we update frame.
        }
    };

    const handleTrimChange = (newRange: [number, number]) => {
        const [newStart, newEnd] = newRange;
        const [oldStart, oldEnd] = trimRange;

        setTrimRange(newRange);

        if (videoRef.current) {
            // Pause while trimming to avoid fighting with the play loop
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            }

            if (newStart !== oldStart) {
                // If moving start handle, seek to the absolute beginning of the "new" clip
                // Note: The Player's content shifts when trimRange updates (re-render)
                // seeking to 0 aligns with the new start.
                videoRef.current.seekTo(0);
                setCurrentFrame(newStart);
            } else if (newEnd !== oldEnd) {
                // If moving end handle, seek to the end of the "new" clip
                const newDuration = newEnd - newStart;
                videoRef.current.seekTo(newDuration);
                setCurrentFrame(newEnd);
            }
        }
    };

    const handlePreviewTrim = () => {
        setIsPreviewingTrim(true);
        if (videoRef.current) {
            const seekTarget = isTrimActive ? 0 : trimRange[0];
            videoRef.current.seekTo(seekTarget);
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleReset = () => {
        if (videoMetadata) {
            setTrimRange([0, videoMetadata.durationInFrames]);
            setIsPreviewingTrim(false);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        await onDownloadRequest(trimRange);
        setIsDownloading(false);
    };

    const playerDuration = useMemo(() => {
        if (!videoMetadata) return 1;
        if (isTrimActive) return Math.max(1, trimRange[1] - trimRange[0]);
        return videoMetadata.durationInFrames;
    }, [videoMetadata, isTrimActive, trimRange]);

    return (
        <div className={`w-full h-full flex flex-col bg-black ${shouldBlur ? 'blur-md' : ''}`}>
            {/* Video Area */}
            <div className="relative flex-1 bg-black flex items-center justify-center p-4 overflow-hidden">
                {selectedVideo.mode === "image-to-image" ? (
                    <img
                        src={selectedVideo.videoUrl || selectedVideo.imageUrl}
                        alt={selectedVideo.title}
                        className="max-w-full max-h-full object-contain transition-all duration-300"
                        style={{ filter: shouldBlur ? 'blur(15px)' : 'none' }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    videoMetadata ? (
                        <Player
                            ref={videoRef}
                            component={SimpleVideo}
                            inputProps={inputProps}
                            durationInFrames={playerDuration}
                            compositionWidth={videoMetadata.width}
                            compositionHeight={videoMetadata.height}
                            fps={videoMetadata.fps}
                            controls={false}
                            loop
                            autoPlay
                            style={playerStyle}
                            className="w-full h-full object-contain"
                            clickToPlay={false}
                            doubleClickToFullscreen={false}
                        />
                    ) : (
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    )
                )}

                {/* Title Overlay for Video Area - Optional, to keep context if needed */}
                <div className="absolute top-0 left-0 p-4 z-10 w-full pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <h3 className="text-white text-lg font-semibold drop-shadow-md line-clamp-1 max-w-[80%]">
                            {selectedVideo.user_content}
                        </h3>
                        {/* Edit Icon for Title */}
                        <button onClick={onRename} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <Edit className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    <p className="text-gray-300 text-xs drop-shadow-md">{selectedVideo.date}</p>
                </div>
            </div>

            {/* Timeline / Controls Area */}
            <div className="flex-shrink-0 z-[160]">
                {videoMetadata && (
                    <VideoTimeline
                        videoUrl={selectedVideo.videoUrl || ""}
                        durationInFrames={videoMetadata.durationInFrames}
                        fps={videoMetadata.fps}
                        currentFrame={currentFrame}
                        trimRange={trimRange}
                        onTrimChange={handleTrimChange}
                        onSeek={handleSeek}
                        onPlayPause={handlePlayPause}
                        isPlaying={isPlaying}
                        onReset={handleReset}
                        onDownload={handleDownload}
                        onPreviewTrim={handlePreviewTrim}
                        isDownloading={isDownloading}
                        volume={volume}
                        onVolumeChange={(v) => {
                            setVolume(v);
                            if (v > 0) setIsMuted(false);
                        }}
                        isMuted={isMuted}
                        onToggleMute={() => setIsMuted(!isMuted)}
                    />
                )}
            </div>
        </div>
    );
}

export default FullscreenModal;
