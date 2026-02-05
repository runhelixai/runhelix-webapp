import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import DeleteDialog from "./DeleteDialog";
import FullscreenModal from "./FullscreenModal ";
import ThumbnailCard from "./ThumbnailCard";
import { supabase } from "@/lib/supabase";
import { useAuthDownload } from "@/hooks/useAuthDownload";
import { useHoverPlayback } from "@/hooks/useHoverPlayback";
import { useIsMobile } from "@/hooks/use-mobile";
import { Generation } from "@/types";
import { GoogleDriveSingle } from "./GoogleDriveSingle";
import { LimitReachedModal } from "./LimitReachedModal";
import { useAuth } from "@/lib/auth";
interface PastGenerationsProps {
  generations: Generation[];
  messages: any;
  onVideoDeleted?: (videoId: string | number) => void;
  setRename?: Dispatch<SetStateAction<boolean>>;
  setGeneratedVideo?: Dispatch<SetStateAction<any>>;
  userId?: string;
  onDownload?: (url?: string, title?: string, mode?: string, onProgress?: (progress: number) => void, trimOptions?: { start: number; end: number }) => Promise<void>;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loading?: boolean;
}

const PastGenerations = ({ generations, messages, onVideoDeleted, setGeneratedVideo, userId, onDownload: onDownloadProp, hasMore, onLoadMore, loading }: PastGenerationsProps) => {
  const { handleDownload } = useAuthDownload();
  const { setRef, playForHover, pauseAndSave, videoRefs } = useHoverPlayback();
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Generation | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Generation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sentinel ref for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, onLoadMore]);

  const [mode, setMode] = useState<"image-to-video" | "image-to-image">("image-to-video");
  // const [displayCount, setDisplayCount] = useState(48); // Removed client-side pagination

  const isMobile = useIsMobile();
  const { userProfile } = useAuth();


  const openFullscreen = useCallback((g: Generation) => {
    setSelectedVideo(g);
    setTimeout(() => {
    }, 50);
  }, []);


  const closeFullscreen = useCallback(() => {
    setSelectedVideo(null);

    // On mobile, explicitly resume all videos in case OS paused them
    if (isMobile && videoRefs.current) {
      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.play().catch(() => { });
        }
      });
    }
  }, [isMobile, videoRefs]);
  const requestDelete = useCallback((g: Generation) => {
    setVideoToDelete(g);
  }, []);


  const confirmDelete = useCallback(async () => {
    if (!videoToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("generated_videos").delete().eq("id", videoToDelete.id);
      if (error) throw error;
      if (onVideoDeleted) onVideoDeleted(videoToDelete.id);
      setVideoToDelete(null);
    } catch (err) {
      console.error("delete err", err);
    } finally {
      setIsDeleting(false);
    }
  }, [videoToDelete, onVideoDeleted]);

  const onDownload = useCallback(async (url?: string, title?: string, mode?: string, onProgress?: (progress: number) => void, trimOptions?: { start: number; end: number }, videoId?: string) => {
    if (!url) return;


    if (onDownloadProp) {
      await onDownloadProp(url, title, mode, onProgress, trimOptions, videoId);
    } else {
      await handleDownload(url, title, mode, onProgress, trimOptions);
    }
  }, [handleDownload, onDownloadProp]);


  useEffect(() => {
    // Clear generated video when pastGenerations changes to avoid showing stale data
    if (selectedVideo?.id) {
      const videoStillExists = generations.some(
        (gen) => gen.id === selectedVideo.id
      );
      if (!videoStillExists) {
        setSelectedVideo(null);
      }
    }
  }, [generations, selectedVideo]);

  useEffect(() => {
    if (hoveredVideo) {
      playForHover(hoveredVideo);
    }
    return () => {
      if (hoveredVideo) pauseAndSave(hoveredVideo);
    };
  }, [hoveredVideo, playForHover, pauseAndSave]);

  return (
    <>
      <div className="bg-[linear-gradient(0deg,#E7F3F4_20%,#FFFFFF_100%)] py-20 dark:bg-[linear-gradient(0deg,#0A0A0A_20%,#000000_100%)]">
        <div className=" px-16 max-laptop:px-10 max-tab:px-5 max-mobile:px-3">
          <div className="mb-10">
            <h2 className="text-4xl mb-8 text-black dark:text-white font-semibold text-center">Helix Library</h2>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b dark:border-gray-800 pb-4">
              <div className="flex-1">
                <h4 className="text-2xl font-semibold text-black dark:text-white">Recent Media</h4>
                <p className="text-base text-gray-500 dark:text-gray-400 font-normal mt-1">
                  Store up to 10 recent assets in your Helix Library. Export or sync to Google Drive to keep creating.
                </p>
              </div>
              {/* Google drive integration */}
              {/* {userId && (
                <div className="shrink-0">
                  <GoogleDriveSingle user={{ id: userId }} setDriveConnected={setDriveConnected} />
                </div>
              )} */}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-5 max-tab:grid-cols-3 max-tabsmall:grid-cols-2 max-mobile:grid-cols-1  max-laptop:grid-cols-4 ">
            {generations.map((g) => (
              <ThumbnailCard
                key={String(g.id)}
                generation={g}
                onOpen={openFullscreen}
                onDownload={onDownload}
                onDelete={(gen) => requestDelete(gen)}
                onHoverEnter={(id) => setHoveredVideo(id)}
                onHoverLeave={() => setHoveredVideo(null)}
                setRef={setRef(g.id)}
                messages={messages}
                videoRefs={videoRefs}
                videoRef={videoRef}
                setGeneratedVideo={setGeneratedVideo}
                userId={userId}
                driveConnected={driveConnected}
              />
            ))}
          </div>
          {/* Use sentinel element for infinite scroll */}
          <div ref={observerTarget} className="h-10 w-full flex justify-center items-center mt-8">
            {loading && (
              <div className="text-gray-500 text-sm">Loading more...</div>
            )}
          </div>

          <FullscreenModal
            selectedVideo={selectedVideo}

            onClose={closeFullscreen}
            onDownload={onDownload}
            setGeneratedVideo={setGeneratedVideo}
            shouldBlur={showLimitModal}
          />
        </div>
      </div>


      <LimitReachedModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
      />
      <DeleteDialog
        open={!!videoToDelete}
        onClose={() => setVideoToDelete(null)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        title={videoToDelete?.mode === "image-to-image" ? "Delete Image" : "Delete Video"}
      />
    </>
  );
};

export default PastGenerations;