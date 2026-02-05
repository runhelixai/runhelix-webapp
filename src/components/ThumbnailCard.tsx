import React, { Dispatch, SetStateAction, useState, useEffect } from "react"
import { Download, Edit, Trash2, CloudUpload, Loader2 } from "lucide-react";
import AnimationVide from "../../public/assets/images/logo-animation.webm";
import { Generation } from "@/types";
import { renameUserPrompt } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import EditDialog from "./EditDialog";
import { useToast } from "@/hooks/use-toast";
import { commonApiEndpoints } from "@/helpers/commonApiEndpoints";



const ThumbnailCard = ({ generation, onOpen, onDownload, onDelete, onHoverEnter, onHoverLeave, setRef, messages, videoRef, videoRefs, setGeneratedVideo, userId, driveConnected }: {
    generation: Generation;
    onOpen: (g: Generation) => void;
    onDownload: (url?: string, title?: string, mode?: string, onProgress?: (progress: number) => void) => void;
    onDelete: (g: Generation) => void;
    onHoverEnter: (id: string) => void;
    onHoverLeave: () => void;
    setRef: (el: HTMLVideoElement | null) => void;
    messages: string[] | string;
    videoRefs: any;
    videoRef: any;
    setGeneratedVideo?: Dispatch<SetStateAction<any>>;
    userId?: string;
    driveConnected?: boolean;
}) => {
    const { toast } = useToast();
    const isMobile = useIsMobile()
    const idStr = String(generation.id);
    const isPending = generation.status === "pending";
    const isImage = generation.mode === "image-to-image";
    const [isEditing, setIsEditing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [currentMsgIndex, setCurrentMsgIndex] = useState(0);

    useEffect(() => {
        if (isPending && Array.isArray(messages) && messages.length > 0) {
            const interval = setInterval(() => {
                setCurrentMsgIndex((prev) => (prev + 1) % messages.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isPending, messages]);

    const displayMessage = Array.isArray(messages) 
        ? messages[currentMsgIndex] 
        : messages;

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    const handleRename = async (value: string) => {
        try {
            const res = await renameUserPrompt({ idStr, value });
            setGeneratedVideo?.((prev) => prev.map((item) => item.id === res[0].id ? { ...item, user_content: value.trim() } : item));
            toast({
                title: "Title updated successfully",
                description: "Title updated successfully",
                variant: "default",
            });
        } catch (error) {
            toast({
                title: "Title updated failed",
                description: "Title updated failed",
                variant: "destructive",
            });
        } finally {
            setIsEditing(false);
        }
    }

    const handleDriveUpload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isUploading || !userId || !driveConnected) return;

        setIsUploading(true);
        try {
            const fileUrl = generation.videoUrl || generation.imageUrl;
            if (!fileUrl) throw new Error("No file URL found");

            // Fetch file blob
            const fileRes = await fetch(fileUrl);
            const blob = await fileRes.blob();
            const fileName = generation.title || `helix-generated-${Date.now()}.${isImage ? 'png' : 'mp4'}`;
            const file = new File([blob], fileName, { type: blob.type });

            const formData = new FormData();
            formData.append('files', file);

            // Using VITE_PYTHON_API or the provided ngrok URLmain
            const apiUrl = `${commonApiEndpoints.GOOGLE_DRIVE_UPLOAD}?user_id=${userId}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'accept': 'application/json', },
                body: formData
            });

            if (response.ok) {
                toast({
                    title: "Upload to Drive",
                    description: "Successfully uploaded to Google Drive",
                    variant: "default",
                });
            } else {
                const err = await response.json().catch(() => ({}));
                console.error("Upload error", err);
                toast({
                    title: "Upload to Drive",
                    description: `Upload failed ${err.detail}`,
                    variant: "destructive",
                });
            }

        } catch (error) {
            console.error("Drive upload failed", error);
            toast({
                title: "Upload to Drive",
                description: "Upload failed",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownloadClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log("Thumbnail download clicked");
        if (isDownloading) return;
        setIsDownloading(true);

        try {
            console.log("Calling onDownload from Thumbnail");
            // Trigger actual download without progress callback since we don't show it anymore
            await onDownload(
                generation?.videoUrl || generation?.imageUrl,
                generation.title,
                generation.mode
            );
            console.log("Thumbnail download finished");
        } catch (error) {
            console.error("Download failed in Thumbnail", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div ref={cardRef} key={idStr} className="bg-white rounded-xl dark:bg-[#5b5e6d26] overflow-hidden relative min-h-[520px]">
            <div
                className="relative"
                onMouseEnter={() => !isMobile && onHoverEnter(idStr)}
                onMouseLeave={() => !isMobile && onHoverLeave()}
                onClick={() => generation.status !== "pending" && onOpen(generation)}
            >
                {/* Download Overlay */}
                {isDownloading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
                        <Loader2 className="w-10 h-10 text-white animate-spin mb-2" />
                        <p className="text-white text-xs font-medium">Downloading...</p>
                    </div>
                )}

                {/* Upload to Drive Button (Top Left) */}
                {(driveConnected && userId && generation?.status !== "pending") && (
                    <div
                        onClick={handleDriveUpload}
                        className={`w-10 h-10 bg-white z-[9] flex items-center justify-center cursor-pointer absolute top-2 left-2 rounded-full dark:bg-[#5b5e6d26] hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Upload to Google Drive"
                    >
                        {isUploading ? (
                            <Loader2 className="text-[#29A6B4] dark:text-white w-5 h-5 animate-spin" />
                        ) : (
                            <CloudUpload className="text-[#29A6B4] dark:text-white w-5 h-5" />
                        )}
                    </div>
                )}

                {/* Download button */}
                <div
                    onClick={handleDownloadClick}
                    className="w-10 h-10 bg-white z-[9] flex items-center justify-center cursor-pointer absolute top-2 rounded-full dark:bg-[#5b5e6d26] right-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                    title={generation.mode === "image-to-image" ? "Download Image" : "Download Video"}  >
                    <Download className="text-[#29A6B4] dark:text-white w-5 h-5" />
                </div>

                {/* Delete button */}
                <div
                    onClick={(e) => { e.stopPropagation(); onDelete(generation); }}
                    className="w-10 h-10 bg-white z-[9] flex items-center justify-center cursor-pointer absolute top-2 rounded-full dark:bg-[#5b5e6d26] right-14 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" >
                    <Trash2 className="text-red-500 dark:text-red-400 w-5 h-5" />
                </div>

                {/* bottom label */}
                <div className="absolute bottom-0 bg-[rgba(0,0,0,0.2)] rounded-b-xl left-0 w-full p-2.5">
                    <div className="flex items-start justify-between">
                        <p className="text-sm text-white font-semibold line-clamp-2">
                            {generation.user_content}
                        </p>
                        {generation?.user_content ? <span className="z-[9] cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}> <Edit className="w-5 h-5 z flex-shrink-0 ml-2 text-white" /> </span> : ""}
                    </div>
                </div>

                {/* Content */}
                {isPending ? (
                    <div className="h-[520px] flex flex-col items-center justify-center bg-black/5 relative">
                        <div className="absolute top-4 left-4 bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                            Generating...
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mb-4" />
                            <p className="text-base text-foreground text-center font-medium">{displayMessage}</p>
                        </div>
                        <video src={AnimationVide} loop autoPlay muted playsInline className="mt-4" />
                    </div>
                ) : !isVisible ? (
                    <div className="h-[520px] w-full bg-gray-100 dark:bg-[#1a1b1e] animate-pulse rounded-xl" />
                ) : isImage ? (<img
                    src={generation.videoUrl || generation.imageUrl}
                    alt={generation.title}
                    loading="lazy"
                    className="w-full h-[520px] rounded-xl block object-cover" />
                ) : (
                    !isMobile ?
                        <video
                            ref={(el) => { setRef(el); videoRef.current = el }}
                            src={generation.videoUrl}
                            className="w-full h-[520px] rounded-xl block object-cover"
                            muted
                            playsInline
                            webkit-playsinline
                            preload="metadata"
                            onLoadedMetadata={(e) => {
                                const video = e.currentTarget;
                                if (video && video.currentTime < 0.5) {
                                    video.currentTime = 0.5;
                                }
                            }}
                        />
                        :
                        <video
                            ref={(el) => {
                                setRef(el);
                                videoRef.current = el;
                            }}
                            // ✅ continuously play on mobile
                            loop
                            autoPlay
                            className="w-full h-[520px] rounded-xl block object-cover"
                            muted
                            playsInline
                            preload="metadata"                       // ✅ iOS-safe
                            onLoadedMetadata={(e) => {
                                const video = e.currentTarget;
                                if (video && video.currentTime < 0.5) {
                                    video.currentTime = 0.5;
                                }
                            }}
                        >
                            <source src={generation.videoUrl} type="video/mp4" />
                        </video>
                )}
            </div>
            <EditDialog
                open={isEditing}
                onClose={() => setIsEditing(false)}
                selectedVideo={generation}
                onConfirm={handleRename}
                loading={false}
                blur={true}
            />
        </div>
    );
};

export default ThumbnailCard;