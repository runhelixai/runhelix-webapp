import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export function useAuthDownload() {
  const pendingDownload = useRef<{ url: string; title: string; mode?: string; onProgress?: (progress: number) => void; trimOptions?: { start: number; end: number } } | null>(null);
  const navigate = useNavigate();
  const [loader, setloder] = useState(false)
  const { toast } = useToast();

  const checkAuth = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  }, []);

  const performDownload = useCallback(
    async (url: string, title = "media", mode = "image-to-video", onProgress?: (progress: number) => void, trimOptions?: { start: number; end: number }) => {
      console.log("performDownload started", { url, mode, trimOptions });
      try {
        setloder(true);
        // IMAGE (unchanged)
        if (mode === "image-to-image") {
          console.log("Download mode: image");
          onProgress?.(10);
          const res = await fetch(url);
          if (!res.ok) throw new Error("Fetch failed");
          onProgress?.(50);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `${title.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          onProgress?.(100);

          // Wait for 1s so user sees 100%
          await new Promise((resolve) => setTimeout(resolve, 1000));

          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            setloder(false);
          }, 100);
          return true;
        }

        // ------- VIDEO -------
        // If trimOptions are provided and encompass a range less than full duration (we can't easily check duration here without loading metadata, 
        // but typically trimOptions will be undefined/null if it's a full download request).
        // Let's rely on the presence of trimOptions to decide. 
        // If trimOptions is null/undefined, we go DIRECT.
        // If trimOptions is present, we go RECORDER.

        const hasTrimOptions = trimOptions && (trimOptions.start > 0 || trimOptions.end > 0);

        // On iOS, we always force direct because of MediaRecorder issues, unless we really want to try (but codebase said it's flaky).
        // The previous code forced iOS direct. Let's keep that safely or just treat everyone as direct if no trim.
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        if (!hasTrimOptions || isIOS) {
          console.log(`Download mode: video (Direct - ${isIOS ? 'iOS' : 'No Trim'})`);
          onProgress?.(10);
          const res = await fetch(url);
          if (!res.ok) throw new Error("Fetch failed");

          const contentLength = res.headers.get("Content-Length");
          const total = contentLength ? parseInt(contentLength, 10) : 0;
          let loaded = 0;

          // Using a reader to simulate progress for better UX
          const reader = res.body?.getReader();
          const chunks: Uint8Array[] = [];

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                chunks.push(value);
                loaded += value.length;
                if (total) {
                  // Map download progress to 10-90% range
                  const p = 10 + Math.floor((loaded / total) * 80);
                  onProgress?.(p);
                }
              }
            }
          } else {
            // Fallback if reader not available
            const blob = await res.blob();
            const buffer = await blob.arrayBuffer();
            chunks.push(new Uint8Array(buffer));
            onProgress?.(90);
          }

          const blob = new Blob(chunks as BlobPart[], { type: "video/mp4" });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `${title.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.mp4`;
          document.body.appendChild(a);
          a.click();
          onProgress?.(100);

          // Wait for 1s so user sees 100%
          await new Promise((resolve) => setTimeout(resolve, 1000));

          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            setloder(false);
          }, 100);
          return true;
        }

        // --- OLD RECORDER LOGIC FOR TRIMMING ---
        console.log("Download mode: video (Recorder - Trimming Active)");
        onProgress?.(5);
        const response = await fetch(url);
        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);

        // Create hidden video (attached to DOM to ensure rendering priority)
        const video = document.createElement("video");
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;
        // Optimization: Use opacity > 0 to trick browser into prioritizing painting
        video.style.position = "fixed";
        video.style.top = "0";
        video.style.left = "0";
        video.style.width = "1px";
        video.style.height = "1px";
        video.style.opacity = "0.01"; // Trick browser
        video.style.pointerEvents = "none";
        video.style.zIndex = "-9999";
        document.body.appendChild(video);

        // Load metadata
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            console.log("Metadata loaded. Duration:", video.duration);
            onProgress?.(20);
            resolve(true);
          };
          video.onerror = (e) => {
            console.error("Video error", e);
            reject(e);
          };
        });

        // Determine start and end times
        const startTime = trimOptions ? trimOptions.start : 0;
        const endTime = trimOptions && trimOptions.end ? trimOptions.end : video.duration;
        const durationToRecord = Math.max(0, endTime - startTime);

        console.log(`Trimming: Start=${startTime}, End=${endTime}, Duration=${durationToRecord}`);

        // Seek to startTime
        await new Promise((resolve) => {
          video.currentTime = startTime;
          video.onseeked = () => {
            console.log(`Seeked to ${startTime}s`);
            onProgress?.(25);
            resolve(true);
          };
        });

        // Capture stream directly from video
        // Request 30fps if browser supports it
        const stream = (video as any).captureStream ? (video as any).captureStream(30) : (video as any).mozCaptureStream(30);

        const supportsMp4 = MediaRecorder.isTypeSupported('video/mp4;codecs="avc1.42E01E"');
        const mimeType = supportsMp4 ? 'video/mp4;codecs="avc1.42E01E"' : "video/webm";

        // Use a reasonable average bitrate. 5Mbps is a safe bet for 720p/1080p web use.
        // Too high might cause encoding lag on weaker clients.
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });

        const chunksRec: BlobPart[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRec.push(e.data);
        };

        const stopped = new Promise((resolve) => (recorder.onstop = resolve));
        recorder.start(100); // Request data every 100ms
        console.log("Recording started (Direct Video)");

        // Play video
        await video.play().catch((e) => console.log("Play catch", e));

        // Estimated duration for progress
        const recordStartTime = Date.now();

        const progressInterval = setInterval(() => {
          const elapsed = (Date.now() - recordStartTime) / 1000;
          const p = Math.min(30 + (elapsed / durationToRecord) * 60, 90);
          onProgress?.(Math.floor(p));

          if (video.currentTime >= endTime) {
            console.log("Reached end time, stopping");
            video.pause();
            if (recorder.state !== "inactive") recorder.stop();
          }
        }, 100);

        video.onended = () => {
          console.log("Video ended naturally, stopping input");
          if (recorder.state !== "inactive") recorder.stop();
        };

        await stopped;
        clearInterval(progressInterval);
        onProgress?.(95);

        // Final trimmed blob
        const trimmedBlob = new Blob(chunksRec, { type: mimeType });
        const outUrl = URL.createObjectURL(trimmedBlob);
        console.log("Blob created", outUrl);

        // Detect extension
        const ext = supportsMp4 ? "mp4" : "webm";

        // Download
        const aRec = document.createElement("a");
        aRec.href = outUrl;
        aRec.download = `${title.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.${ext}`;
        document.body.appendChild(aRec);
        aRec.click();
        onProgress?.(100);

        // Wait for 1s so user sees 100%
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setTimeout(() => {
          document.body.removeChild(aRec);
          if (document.body.contains(video)) {
            document.body.removeChild(video);
          }
          URL.revokeObjectURL(videoUrl);
          URL.revokeObjectURL(outUrl);
          setloder(false);
        }, 500);

        return true;
      } catch (err) {
        console.error("download error", err);
        // Fallback: show toast with button to open manually (avoids popup blockers)
        toast({
          title: "Download failed",
          description: "Could not process video. Click to open original.",
          variant: "destructive",
          action: (
            <ToastAction altText="Open" onClick={() => window.open(url, "_blank")}>
              Open
            </ToastAction>
          ),
        });
        setloder(false);
        return false;
      }
    },
    []
  );

  // Public: will either download immediately or set pending + redirect to auth
  const handleDownload = useCallback(
    async (url: string, title = "media", mode = "image-to-video", onProgress?: (progress: number) => void, trimOptions?: { start: number; end: number }) => {
      const authenticated = await checkAuth();
      if (!authenticated) {
        pendingDownload.current = { url, title, mode, onProgress, trimOptions }; // trimOptions included
        sessionStorage.setItem("returnTo", window.location.pathname);
        navigate("/auth");
        return;
      }
      await performDownload(url, title, mode, onProgress, trimOptions);
    },
    [checkAuth, navigate, performDownload]
  );

  useEffect(() => {
    // on auth change, check pending and run
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" && pendingDownload.current) {
        const { url, title, mode, onProgress, trimOptions } = pendingDownload.current; // trimOptions included
        pendingDownload.current = null;
        await performDownload(url, title, mode, onProgress, trimOptions);
      }
    });

    // also check immediately if already signed in and there is a pending (rare)
    (async () => {
      if (pendingDownload.current) {
        const auth = await checkAuth();
        if (auth) {
          const { url, title, mode, onProgress, trimOptions } = pendingDownload.current; // trimOptions included
          pendingDownload.current = null;
          await performDownload(url, title, mode, onProgress, trimOptions);
        }
      }
    })();

    return () => subscription.unsubscribe();
  }, [checkAuth, performDownload]);

  return { handleDownload, checkAuth, loader };
}