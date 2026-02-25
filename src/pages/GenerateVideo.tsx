import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { SimpleVideo } from "@/remotion/compositions/SimpleVideo";
import { VideoControls } from "@/remotion/VideoControls";
import { getVideoMetadata } from "@remotion/media-utils";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import logo from "../../public/assets/images/logo.png";
import { useTheme } from "next-themes";
import lightlogo from "../../public/assets/images/light-logo.png";
import AnimationVide from "../../public/assets/images/logo-animation.webm";
import {
  Loader2,
  X,
  LogOut,
  Play,
  Download,
  Pause,
  VolumeX,
  Volume2,
  List,
  CircleUserRound,
  DiamondPercent,
  Paperclip,
} from "lucide-react";

import PastGenerations from "@/components/PastGenerations";
import { useIsMobile } from "@/hooks/use-mobile";
import { commonSvgIcon } from "@/helpers/commonSvg";
import { GeneratedMedia, Generation, Product } from "@/types";
import { useAuthDownload } from "@/hooks/useAuthDownload";
import {
  dataUrlToBlob,
  mergeGuestVideosOnLogin,
  getProductImage,
  updateProduct,
  deleteProduct,
  scrapeWebsiteLink,
  linkToBase64,
} from "@/lib/utils";
import { trimVideo } from "@/services/api";
import { usePlatformTour } from "@/hooks/usePlatformTour";
import FullscreenModal from "@/components/FullscreenModal ";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductDrawer } from "@/components/ProductDrawer";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AspectRatioDropdown from "../components/AspectRatioDropdown ";
import ProductDropdown from "../components/ProductDropdown";
import VideoTypeDropdown from "../components/VideoTypeDropdown";
import { commonApiEndpoints } from "@/helpers/commonApiEndpoints";
import { config } from "@/lib/config";
import MobileUserMenu from "@/components/MobileUserMenu";
import { CouponModal } from "@/components/CouponModal";
import UserNav from "@/components/layout/UserNav";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import ReferenceTypeDropdown from "@/components/ReferenceTypeDropdown";
import VideoModelDropdown from "@/components/VideoModelDropdown";
import VideoResolutionDropdown from "@/components/VideoResolutionDropdown";
import { VideoModelOption } from "@/hooks/useVideoModels";

const getCurrentUserOrGuestId = async () => {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (user) return { user_id: user.id, session_id: null };
  let session_id = localStorage.getItem("session_id");
  if (!session_id) {
    session_id = crypto.randomUUID();
    localStorage.setItem("session_id", session_id);
  }
  return { user_id: null, session_id };
};

const downloadDirectly = async (downloadUrl: string, filename: string) => {
  console.log("Starting downloadDirectly", { downloadUrl, filename });

  try {
    const bucketName = "trim_videos"; // User confirmed bucket name
    let path = downloadUrl;

    // Robust path extraction
    try {
      const urlObj = new URL(downloadUrl);
      const pathParts = urlObj.pathname.split(`/${bucketName}/`);
      if (pathParts.length > 1) {
        path = pathParts[1];
      } else {
        // Fallback for different URL structures, try to find bucket name in path
        const regex = new RegExp(`.*${bucketName}/`);
        path = downloadUrl.replace(regex, '');
      }
    } catch (e) {
      console.warn("URL parsing failed, using string manipulation", e);
      if (downloadUrl.includes(bucketName)) {
        path = downloadUrl.split(`${bucketName}/`)[1];
      }
    }

    // Clean path
    path = decodeURIComponent(path.split('?')[0]);
    if (path.startsWith('/')) path = path.slice(1);

    console.log("Extracted path for signing:", { path, bucketName });

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, 60, {
        download: filename,
      });

    if (error) {
      console.error("Supabase createSignedUrl error:", error);
      throw error;
    }

    console.log("Generated signed URL:", data.signedUrl);

    // Create a temporary link to simulate a click
    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = filename; // This attribute usually only works for same-origin or blob: URLs, but 'download' option in signed URL should handle headers
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // slight delay before cleanup to ensure click registers
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);

  } catch (error) {
    console.error("Signed URL download failed, falling back to direct link:", error);

    // Fallback: try to download via Blob (if CORS allows) or just open
    try {
      console.log("Attempting fallback fetch/blob download...");
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("Fallback fetch failed");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

    } catch (fallbackError) {
      console.error("Fallback Blob download failed:", fallbackError);
      // Ultimate fallback: Open in new tab (user experience: "better than nothing")
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};

const GenerateVideo = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut, refreshProfile, isLoading } = useAuth();
  const canUpload = ["admin", "super_admin"].includes(userProfile?.role);
  const isMobile = useIsMobile();
  const { handleDownload } = useAuthDownload();
  const { toast } = useToast();
  const videoRef = useRef<PlayerRef>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subscriptionRef = useRef<any>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedMedia | null>(
    null
  );
  // trimRequestId moved to handleVideoDownload to avoid stale closures

  const [videoStatus, setVideoStatus] = useState<
    "idle" | "pending" | "completed" | "failed"
  >("idle");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<{
    durationInFrames: number;
    width: number;
    height: number;
    fps: number;
  } | null>(null);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [pastGenerations, setPastGenerations] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"image-to-video" | "image-to-image">(
    "image-to-video"
  );
  const [videoType, setVideoType] = useState<string>("");
  const [videoModel, setVideoModel] = useState<string>("sora-2");
  const [videoCreditId, setVideoCreditId] = useState<string>("");
  const [videoResolution, setVideoResolution] = useState<string | null>(null);
  const [videoResolutionOptions, setVideoResolutionOptions] = useState<VideoModelOption[]>([]);
  const [aspectRatio, setAspectRatio] = useState<string>("portrait");
  const [referenceType, setReferenceType] = useState<"reference" | "frames">("reference");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logout, setLogout] = useState<boolean>(false);

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [promoFrames, setPromoFrames] = useState<{
    start: string | null;
    end: string | null;
  }>({ start: null, end: null });

  const { startTour, hasSeenTour, isTourLoading } = usePlatformTour();

  useEffect(() => {
    // If still loading profile/tour data, do NOT try to start tour yet.
    // We don't want to assume false (not seen) while data is missing.
    if (isTourLoading) {
      console.log("[GenerateVideo] Tour data loading... waiting.");
      return;
    }

    const seen = hasSeenTour();
    console.log("[GenerateVideo] Checking tour status:", seen);
    if (!seen) {
      console.log("[GenerateVideo] Starting tour in 1s...");
      // Small delay to ensure elements are rendered
      setTimeout(() => {
        console.log("[GenerateVideo] Calling startTour()");
        startTour();
      }, 1000);
    }
  }, [isTourLoading]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Remove auto-open effect
  const startFrameRef = useRef<HTMLInputElement>(null);
  const endFrameRef = useRef<HTMLInputElement>(null);

  // useEffect(() => {
  //   if (videoType === "Promotional" && selectedProduct?.logo) {
  //     const processLogo = async () => {
  //       try {
  //         const logoInput = selectedProduct.logo;
  //         let base64String = "";

  //         if (typeof logoInput === 'string') {
  //           // Use helper to handle URL or existing base64
  //           base64String = await linkToBase64(logoInput);
  //         } else if (logoInput instanceof Blob || logoInput instanceof File) {
  //           // Convert File/Blob to base64
  //           base64String = await new Promise<string>((resolve, reject) => {
  //             const reader = new FileReader();
  //             reader.onloadend = () => resolve(reader.result as string);
  //             reader.onerror = reject;
  //             reader.readAsDataURL(logoInput);
  //           });
  //         }

  //         if (base64String) {
  //           setPromoFrames(prev => ({ ...prev, start: base64String }));
  //         }
  //       } catch (e) {
  //         console.error("Failed to sync product logo", e);
  //       }
  //     };
  //     processLogo();
  //   }
  // }, [videoType, selectedProduct]);

  const handlePromoFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPromoFrames(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = "";
  };

  const handlePromoDrop = (e: React.DragEvent<HTMLDivElement>, type: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPromoFrames(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handlePromoModalClose = () => {
    setIsPromoModalOpen(false);
    if (!promoFrames.start || !promoFrames.end) {
      // Revert if close without confirming both images
      // Or just let it be, but user needs to re-select to open modal or we add a button to open it.
      // Ideally, if they cancel, we switch back to UGC Testimonials or keep it but they can't generate.
      // Let's reset to UGC Testimonials if no frames are set to avoid confusion
      setVideoType("UGC Testimonials");
    }
  };

  const handlePromoConfirm = (start: string, end: string) => {
    setPromoFrames({ start, end });
    setIsPromoModalOpen(false);
    // Keep videoType as Promotional
  };

  useEffect(() => {
    if (mode === "image-to-video" && aspectRatio === "square") {
      setAspectRatio("portrait");
    }
  }, [mode, aspectRatio]);

  // Reset model to sensible default when video type changes
  useEffect(() => {
    if (videoType === "Promotional") {
      setVideoModel("veo-3.1");
    } else {
      setVideoModel("sora-2");
    }
    // Reset resolution state when type changes
    setVideoResolution(null);
    setVideoResolutionOptions([]);
  }, [videoType]);



  // Sync trimRange with videoMetadata
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);


  // Sync current frame
  useEffect(() => {
    let animationFrameId: number;

    const updateFrame = () => {
      if (videoRef.current) {
        const currentFrameVal = videoRef.current.getCurrentFrame();
        setCurrentFrame(currentFrameVal);
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
  }, [isPlaying]);



  const toggleFullscreen = () => {
    if (!productRef.current) return;
    if (!document.fullscreenElement) {
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const [selectedVideo, setSelectedVideo] = useState<Generation | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);


  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [productDrawerView, setProductDrawerView] = useState<"list" | "add">("list");
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showCloneBanner, setShowCloneBanner] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, reloading video...");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const loadingMessages = [
    "Sequencing your product's visual DNA...",
    "Whispering sweet nothings to your brand.",
    "Assembling molecular storytelling strands.",
    "Writing your product's Oscar speech.",
    "Making your competitors nervous.",
    "Synthesizing art from atoms.",
    "Injecting imagination into the code.",
    "Splicing genius into your visuals.",
    "Wooing your pixels until they flirt back.",
    "Generating the next 'you'll never guess it's AI' moment.",
    "Delivering something you're about to brag about.",
    "The genome of storytelling is almost complete.",
  ];
  const { theme } = useTheme();

  const cleanupChannel = async () => {
    if (subscriptionRef.current) {
      await supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const toDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    const newImages: string[] = [];
    for (const file of fileArray) {
      const dataUrl = await toDataUrl(file);
      newImages.push(dataUrl);
    }
    setUploadedImages((prev) => [...prev, ...newImages]);
  };

  const handleVideoDeleted = (deletedVideoId: string | number) => {
    setPastGenerations((prev) => {
      const updated = prev.filter((gen) => gen.id !== deletedVideoId);
      if (generatedVideo?.id === deletedVideoId) {
        if (updated.length > 0) {
          const nextVideo = updated[0];
          setGeneratedVideo({
            id: nextVideo.id,
            url: nextVideo.videoUrl || nextVideo.imageUrl || "",
            title: nextVideo.title,
            created_at: nextVideo.created_at || new Date().toISOString(),
            mode: nextVideo.mode || "image-to-video",
          });
          setVideoId(nextVideo.id);
          setVideoStatus("completed");
        } else {
          setGeneratedVideo(null);
          setVideoStatus("idle");
          setVideoId(null);
        }
      }
      return updated;
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAddProduct = async (product: Product) => {
    try {
      setLoading(true);
      const mediaLink = product.media ?? "";
      const toInsert: any = {
        title: product.name,
        media: mediaLink,
        user_id: user?.id ?? null,
      };
      if (product.url) toInsert.url = product.url;
      if (product.dimensions) toInsert.dimensions = product.dimensions;

      try {
        const res = await scrapeWebsiteLink(toInsert);
        if (!res?.success) {
          console.error("Scrape failed:", res);
          toast({
            title: res?.error || "Add product failed",
            description: res?.details || "Something went wrong while adding the product.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Product added",
            description: "Product created successfully.",
            variant: "default",
          });
          const newProducts = await getProductImage(user?.id || "");
          setProducts(newProducts || []);
          setIsProductDrawerOpen(false);
        }
      } catch (err: any) {
        console.error("Scrape error:", err);
        toast({
          title: err?.error || "Add product failed",
          description: err?.details || "Something went wrong while adding the product.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const message = "Something went wrong while adding the product.";
      toast({
        title: "Add product failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`products_realtime_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedProduct = payload.new as Product;
            setProducts((prev) =>
              prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Helper to get formatted time for filename
  const getFormattedDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const handleVideoDownload = useCallback(
    async (url?: string, title?: string, mode?: string, onProgress?: (progress: number) => void, overrideTrimOptions?: { start: number; end: number }, targetVideoId?: string) => {
      if (!url) return;

      // Check limits logic (existing) ...
      const hasPlan = userProfile?.plan_id || (userProfile?.purchase_token && Number(userProfile.purchase_token) > 0);

      // VIP users get 33 free tokens, so purchase_token > 0 is true for them.
      // We must strictly check plan_id for VIPs to enforce limits.
      const isVIP = userProfile?.user_type === "VIP";
      const vipHasPlan = isVIP && !!userProfile?.plan_id;

      // If user is VIP and does NOT have a real plan (ignoring the free tokens)
      if (isVIP && !vipHasPlan) {
        // ... (existing VIP checks)
        if (mode === "image-to-video" || mode === "text-to-video") {
          const successfulVideos = pastGenerations.filter(
            (gen) =>
              (gen.mode === "image-to-video" || gen.mode === "text-to-video") &&
              gen.status === "completed"
          ).length;

          // 3rd video should not download -> Block if count is 3 or more
          if (successfulVideos >= 3) {
            navigate("/pricing");
            return;
          }
        } else if (mode === "image-to-image") {
          const successfulImages = pastGenerations.filter(
            (gen) => gen.mode === "image-to-image" && gen.status === "completed"
          ).length;

          // 3rd image should not download -> Block if count is 3 or more
          if (successfulImages >= 3) {
            navigate("/pricing");
            return;
          }
        }
      }

      // Check if trimming is active
      // Use targetVideoId if provided, otherwise fallback to generatedVideo.id (for backward compatibility or main video)
      const videoIdToUse = targetVideoId || generatedVideo?.id;

      if (overrideTrimOptions && videoIdToUse) {
        return new Promise<void>(async (resolve, reject) => {
          try {
            const trimRequestId = crypto.randomUUID();
            toast({
              title: "Trimming Video",
              description: "Processing your trim request...", // Updated message
              variant: "default",
            });

            // 1. Get the latest existing record timestamp from DB to establish a baseline
            // This avoids client-server clock skew issues
            const { data: latestExisting } = await supabase
              .from("video_trim")
              .select("created_at")
              .eq("video_id", videoIdToUse)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const previousLatestTime = latestExisting?.created_at || new Date(0).toISOString();
            console.log("Baseline time for new trim:", previousLatestTime);

            // Call trim API
            const trimResponse = await trimVideo({
              video_id: String(videoIdToUse),
              trim_startat: overrideTrimOptions.start,
              trim_endat: overrideTrimOptions.end,
              trim_request_id: trimRequestId,
            });

            console.log("Trim started:", trimResponse);

            // Real-time subscription instead of polling
            const channelName = `video_trim_${trimRequestId}`;
            const channel = supabase.channel(channelName);

            // Timeout safety
            const timeoutId = setTimeout(() => {
              supabase.removeChannel(channel);
              toast({
                title: "Trim Timeout",
                description: "Operation timed out. Please try again.",
                variant: "destructive",
              });
              reject(new Error("Timeout"));
            }, 60000); // 60s timeout

            channel
              .on(
                'postgres_changes',
                {
                  event: '*', // Listen for INSERT or UPDATE
                  schema: 'public',
                  table: 'video_trim',
                  filter: `trim_request_id=eq.${trimRequestId}`,
                },
                async (payload) => {
                  const data = payload.new as any;
                  if (data && data.status === 'completed' && data.trim_video_url) {
                    clearTimeout(timeoutId);
                    supabase.removeChannel(channel);

                    toast({
                      title: "Trim Completed",
                      description: "Downloading your video...",
                      duration: 3000,
                    });

                    let downloadUrl = data.trim_video_url;
                    console.log("Trim completed via realtime:", downloadUrl);
                    if (!downloadUrl.startsWith("http")) {
                      const baseUrl = config.supabaseURL?.replace(/\/+$/, "");
                      const path = downloadUrl.startsWith("/") ? downloadUrl : `/${downloadUrl}`;
                      downloadUrl = `${baseUrl}${path}`;
                    }

                    try {
                      await downloadDirectly(downloadUrl, `${title || "video"} (Trimmed).mp4`);
                      resolve();
                    } catch (e) {
                      reject(e);
                    }
                  } else if (data && data.status === 'failed') {
                    clearTimeout(timeoutId);
                    supabase.removeChannel(channel);
                    toast({
                      title: "Trim Failed",
                      description: data.message || "Unable to process video.",
                      variant: "destructive",
                    });
                    reject(new Error(data.message || "Trim failed"));
                  }
                }
              )
              .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                  console.log("Listening for trim updates...");
                }
              });

          } catch (error: any) {
            console.error("Trim failed", error);
            toast({
              title: "Trim Failed",
              description: error.message || "Could not trim video.",
              variant: "destructive",
            });
            reject(error);
          }
        });
      }

      await handleDownload(url, title, mode, onProgress, overrideTrimOptions);
    },
    [userProfile, pastGenerations, handleDownload, videoMetadata, navigate, generatedVideo, toast]
  );




  const handleUpdateProduct = async (product: Product) => {
    try {
      setLoading(true);

      const originalProduct = products.find((p) => p.id === product.id);
      if (!originalProduct) throw new Error("Product not found");

      const toUpdate: any = {
        product_id: product.id,
      };

      if (product.name !== originalProduct.name) {
        toUpdate.title = product.name;
      }

      if (product.url !== originalProduct.url) {
        toUpdate.url = product.url;
      }

      // Check dimensions
      if (product?.dimensions?.includes("*")) {
        toUpdate.dimensions = product.dimensions;
      }

      // Check Media - Send if it's a File (new upload)
      let isMediaUpdated = false;
      if (product.media instanceof File) {
        toUpdate.media = product.media;
        isMediaUpdated = true;
      }

      const updated = await updateProduct(toUpdate);

      if (!updated) {
        throw new Error("Failed to update product");
      }

      toast({
        title: "Product updated",
        description: `${product.name} was updated successfully.`,
      });
      const newProducts = await getProductImage(user?.id || "");

      // If media was updated, append timestamp to force cache bust
      if (isMediaUpdated) {
        setProducts((newProducts || []).map((p: any) => {
          if (p.id === product.id && p.media) {
            return { ...p, media: `${p.media}?t=${Date.now()}` };
          }
          return p;
        }));
      } else {
        setProducts(newProducts || []);
      }

      // setIsProductDrawerOpen(false);
    } catch (error: any) {
      console.error("handleUpdateProduct error:", error);
      toast({
        title: "Update failed",
        description: error?.message || "Could not update product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setLoading(true);
      await deleteProduct(productId);

      toast({
        title: "Product deleted",
        description: "Product was successfully deleted.",
      });

      setProducts((prev) => prev.filter((p) => p.id !== productId));

      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
      }
    } catch (error: any) {
      console.error("handleDeleteProduct error:", error);
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (
      (mode === "image-to-image" &&
        userProfile?.purchase_token - Number(userProfile?.exhaust_token) < 1) ||
      (mode === "image-to-video" &&
        userProfile?.purchase_token - Number(userProfile?.exhaust_token) < 10)
    ) {
      // toast({ title: "Upgrade Required", description: "Please purchase or upgrade your plan to continue using this feature.", variant: "destructive" });
      setShowLimitModal(true);
      // navigate("/pricing");
      return;
    }
    if (userProfile?.user_type === "VIP") {
      // Check 7-day expiry logic
      if (user?.created_at) {
        const joinDate = new Date(user.created_at);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate.getTime() - joinDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 7) {
          toast({
            title: "Trial Expired",
            description:
              "Your 7-day trial has ended. Please purchase a plan to continue.",
            variant: "destructive",
          });
          return;
        }
      }

      const successfulVideos = pastGenerations.filter(
        (gen) => gen.mode === "image-to-video" && gen.status === "completed"
      ).length;
      const successfulImages = pastGenerations.filter(
        (gen) => gen.mode === "image-to-image" && gen.status === "completed"
      ).length;

      // if (mode === "image-to-video" && successfulVideos >= 2) {
      //   setShowLimitModal(true);
      //   return;
      // }

      // if (mode === "image-to-image" && successfulImages >= 3) {
      //   setShowLimitModal(true);
      //   return;
      // }
    } else if (
      !(userProfile?.purchase_token - Number(userProfile?.exhaust_token))
    ) {
      toast({
        title: "Upgrade Required",
        description:
          "Please purchase or upgrade your plan to continue using this feature.",
        variant: "destructive",
      });
      // navigate("/pricing");
      return;
    }
    const isPromotional = videoType === "Promotional";
    const hasMedia = isPromotional && referenceType === "frames"
      ? promoFrames.start && promoFrames.end
      : selectedProduct?.id || uploadedImages.length > 0;

    if (!hasMedia || !description.trim() || isGenerating) return;
    const tempId = `temp-${Date.now()}`;
    const title = description.trim().slice(0, 80);

    const currentImages = [...uploadedImages];
    const currentDescription = description.trim();

    setUploadedImages([]);
    setDescription("");
    setSelectedProduct(null);
    setPromoFrames({ start: null, end: null });
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      // const baseApi = import.meta.env.VITE_PYTHON_API;
      const imageEndpoint = commonApiEndpoints.IMAGE_GENERATION;
      const videoWebhookEndpoint = commonApiEndpoints.VIDEO_WEBHOOK;
      // --- Clean: convert all uploaded images to Blobs ---
      const blobs = currentImages.map((img) => dataUrlToBlob(img));
      const { user_id, session_id } = await getCurrentUserOrGuestId();
      let endpoint: string;
      let body: BodyInit;
      let headers: HeadersInit | undefined;

      setIsGenerating(true);
      setVideoStatus("pending");
      setPastGenerations((prev) => [
        {
          id: tempId,
          title,
          status: "pending",
          created_at: new Date().toISOString(),
          videoUrl: null,
          imageUrl: null,
          mode,
          isTemp: true,
          user_content: "",
        },
        ...prev.filter((gen) => !gen.isTemp && gen.status !== "pending"),
      ]);

      if (mode === "image-to-video") {
        // JSON payload
        if (videoType === "Promotional" && referenceType === "frames") {
          endpoint = commonApiEndpoints.PROMO_TRANSITION_VIDEO_WEBHOOK;
          const payload: any = {
            user_content: currentDescription || "Create a seamless transition video",
            first_frame_base64: promoFrames.start?.split(",")[1] || "",
            last_frame_base64: promoFrames.end?.split(",")[1] || "",
            image_ratio: aspectRatio || "portrait",
            promo_type: "animation",
            language: "english",
            model: videoModel,
          };
          if (videoResolution) payload.resolution = videoResolution;
          if (user_id) payload.user_id = user_id;
          else if (session_id) payload.session_id = session_id;
          if (selectedProduct?.id) payload.product_id = selectedProduct.id;
          if (videoCreditId) payload.credit_id = videoCreditId;

          headers = { "Content-Type": "application/json" };
          body = JSON.stringify(payload);

        } else {
          if (videoType === "UGC Testimonials") {
            endpoint = videoWebhookEndpoint;
          } else if (videoType === "Promotional") {
            // New Promotional Reference mode logic
            endpoint = commonApiEndpoints.GEMINI_PROMO_VIDEO_WEBHOOK;
          } else {
            endpoint = commonApiEndpoints.PROMO_VIDEO_WEBHOOK;
          }

          const payload: any = {
            user_content: currentDescription,
            image_ratio: String(aspectRatio),
            model: videoModel,
          };
          if (videoResolution) payload.resolution = videoResolution;

          if (videoType === "Promotional" && referenceType === "reference") {
            // Specific payload for Promotional Reference mode
            payload.promo_type = "animation";
            payload.language = "english";
            payload.seed = 42;
            payload.product_id = selectedProduct?.id || "";
            if (videoCreditId) payload.credit_id = videoCreditId;

            let finalBase64 = "";
            let base64Full: string | null = null;

            if (selectedProduct?.media) {
              // If product is selected, prioritize product media
              try {
                // linkToBase64 returns a data URL string
                base64Full = await linkToBase64(selectedProduct.media as string);
              } catch (e) {
                console.error("Failed to convert product media to base64", e);
              }
            } else if (blobs.length > 0) {
              // Fallback to uploaded images if no product
              base64Full = await blobToBase64(blobs[0]);
            }

            if (base64Full) {
              finalBase64 = base64Full.includes(",") ? base64Full.split(",")[1] : base64Full;
            }

            payload.image_base64 = finalBase64;
            // Ensure verify user_content is set correctly if empty
            if (!currentDescription) {
              payload.user_content = "Create a promotional video";
            }
          } else {
            // UGC Testimonials
            payload.promo_type = "animation";
            payload.language = "english";
            payload.seed = 42;
            if (videoCreditId) payload.credit_id = videoCreditId;

            const dataUrls = await Promise.all(blobs.map((b) => blobToBase64(b)));
            const base64Only = dataUrls.map((url) => url.split(",")[1]);

            if (selectedProduct?.id) {
              payload.product_id = selectedProduct?.id;
            } else {
              payload.image_base64 = base64Only[0] || "";
            }
          }

          if (user_id) payload.user_id = user_id;
          else if (session_id) payload.session_id = session_id;
          headers = { "Content-Type": "application/json" };
          body = JSON.stringify(payload);
        }
      } else {
        // FormData for image-to-image
        endpoint = imageEndpoint;
        const formData = new FormData();
        formData.append("user_content", currentDescription);
        formData.append("image_ratio", String(aspectRatio));
        if (selectedProduct?.id) {
          formData.append("product_id", selectedProduct?.id);
        } else {
          blobs.forEach((blob, index) => {
            const file = new File([blob], `image-${index + 1}.jpg`, {
              type: blob.type || "image/jpeg",
            });
            formData.append("file", file);
          });
        }
        if (user_id) formData.append("user_id", user_id);
        else if (session_id) formData.append("session_id", session_id);

        body = formData;
        headers = undefined;
      }
      // CLEAN fetch
      const response = await fetch(endpoint, { method: "POST", headers, body });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast({
          title: "Generation failed",
          description: err?.error || err?.detail || "Generation failed",
          variant: "destructive",
        });
        throw new Error(err?.detail || "Generation failed");
      }
      const responseData = await response.json();
      const mediaId = responseData.video_id || responseData.image_id;
      if (!mediaId) throw new Error("No media ID returned");

      // Set the media ID for tracking
      setVideoId(mediaId);

      // Update the temporary generation with the real ID
      setPastGenerations((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((gen) => gen.id === tempId);
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            id: mediaId,
            status: "pending",
            mode: mode, // Ensure mode is set correctly
          };
        }
        return updated;
      });

      // Define status handler to be used by both initial check and subscription
      const handleStatusUpdate = async (data: any) => {
        if (!data) return;
        setVideoStatus(data.status);

        // ✅ Completed case for both image and video
        if (data.status === "completed" && data.location) {
          const mediaUrl = data.location.startsWith("http")
            ? data.location
            : `${import.meta.env.VITE_SUPABASE_URL
            }/storage/v1/object/public/${data.location}`;
          const isImage = data.mode === "image-to-image";
          const mediaTitle =
            data.title ||
            (isImage ? "Your Generated Image" : "Your Generated Video");
          const mediaMode =
            (data.mode as "image-to-video" | "image-to-image") ||
            "image-to-video";
          const mediaCreatedAt =
            data.created_at || new Date().toISOString();
          const user_content = data.user_content;

          // Create a completely new object to force re-render
          const newMedia = {
            id: mediaId, // Use mediaId from closure
            url: mediaUrl,
            title: mediaTitle,
            created_at: mediaCreatedAt,
            mode: mediaMode,
            videoUrl: isImage ? null : mediaUrl,
            imageUrl: isImage ? mediaUrl : null,
            status: "completed" as const,
            user_content,
          };

          // Update states in a single batch
          setIsGenerating(false);
          setVideoStatus("completed");
          setGeneratedVideo(newMedia);

          // Update past generations by replacing the temp entry or adding a new one
          setPastGenerations((prev) => {
            // Create a new array to force re-render
            const updated = [...prev];

            // Find and update the temp entry or existing entry with the same ID
            const tempIndex = updated.findIndex((gen) => gen.isTemp);
            const existingIndex = updated.findIndex(
              (gen) => gen.id === mediaId
            );

            if (tempIndex !== -1 || existingIndex !== -1) {
              // Replace the temp or existing entry
              const indexToUpdate =
                tempIndex !== -1 ? tempIndex : existingIndex;
              updated[indexToUpdate] = { ...newMedia };
            } else {
              // Add as new entry if not found (shouldn't happen, but just in case)
              updated.unshift(newMedia);
            }

            // Remove any other pending generations for the same content
            return updated.filter((gen, index, self) => {
              // Keep only the first occurrence of each ID
              return index === self.findIndex((g) => g.id === gen.id);
            });
          });

          // Force a re-render of the component
          setTimeout(() => {
            setGeneratedVideo((prev) => (prev ? { ...prev } : null));
            console.log(
              "[GenerateVideo] Generation complete. Refreshing profile to update tokens..."
            );
            refreshProfile(); // Update user tokens
          }, 100);

          // Clean up the channel after a short delay
          setTimeout(() => {
            cleanupChannel();
          }, 200);
        }

        // ❌ Failed case
        if (data.status === "failed") {
          setIsGenerating(false);
          setVideoStatus("failed");
          setGeneratedVideo(null);
          setPastGenerations((prev) => prev.filter((gen) => gen.id !== mediaId));

          // Refund Logic REMOVED - Backend handles this.


          // Attempt to delete the failed record from DB to potentially refund/correct tokens
          supabase.from("generated_videos").delete().eq("id", mediaId).then(({ error }) => {
            if (error) console.error("Failed to delete failed video record:", error);
            else refreshProfile(); // Refresh profile to show correct tokens
          });

          toast({
            title: "Generation failed",
            description: "Something went wrong while generating your video. Please try again.",
            variant: "default",
          });
          console.error("❌ Video generation failed");
          cleanupChannel();
        }
      };

      // 🧹 Cleanup old channel before creating new one
      await cleanupChannel();

      // Check if record already exists and has a status
      const { data: existingRecord } = await supabase
        .from("generated_videos")
        .select("*")
        .eq("id", mediaId)
        .single();

      let shouldSubscribe = true;

      if (existingRecord) {
        // If record exists, check its status immediately
        if (existingRecord.status === "completed" || existingRecord.status === "failed") {
          handleStatusUpdate(existingRecord);
          // If finalized, do not subscribe
          shouldSubscribe = false;
        } else {
          // It exists but is pending (or other), just subscribe
          // No need to upsert as it's already there
        }
      } else {
        // If record does NOT exist, insert 'pending' row
        const videoData: any = {
          id: mediaId,
          status: "pending",
          created_at: new Date().toISOString(),
          title: currentDescription.slice(0, 80),
          mode,
        };
        if (user_id) {
          videoData.user_id = user_id;
        } else if (session_id) {
          videoData.session_id = session_id;
        }
        await supabase
          .from("generated_videos")
          .upsert([videoData], { onConflict: "id" });
      }

      if (shouldSubscribe) {
        // 2️⃣ Subscribe to realtime updates for this video_id
        const channel = supabase
          .channel(`generated_videos_${mediaId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "generated_videos",
              filter: `id=eq.${mediaId}`,
            },
            (payload: any) => {
              handleStatusUpdate(payload.new);
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              console.log(`✅ Subscribed to generated_videos_${mediaId}`);
            }
          });

        subscriptionRef.current = channel;
      }
    } catch (error: any) {
      console.error("🔥 Error generating video:", error);
      setIsGenerating(false);
      setPastGenerations((prev) => prev.filter((gen) => gen.id !== tempId));
      // Refund Logic REMOVED - Backend handles this.

    }
  };

  // Helper to convert Blob → base64 (used only for video mode)
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });

  const fetchLatestVideo = async ({
    user_id,
    session_id,
  }: {
    user_id: string;
    session_id: any;
  }) => {
    try {
      // If no user_id or session_id, clear any existing video and return
      if (!user_id && !session_id) {
        setGeneratedVideo(null);
        setVideoStatus("idle");
        setIsGenerating(false);
        return;
      }

      // Build the query based on whether we have a user_id or session_id
      let query = supabase
        .from("generated_videos")
        .select("*")
        .neq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (user_id) {
        query = query.eq("user_id", user_id);
      } else if (session_id) {
        query = query.eq("session_id", session_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching latest video:", error);
        return;
      }

      if (
        data &&
        data.length > 0 &&
        data[0].status === "completed" &&
        data[0].location
      ) {
        const mediaUrl = data[0].location.startsWith("http")
          ? data[0].location
          : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${data[0].location
          }`;
        const mediaData = {
          id: data[0].id || `temp-${Date.now()}`,
          url: mediaUrl,
          title: data[0].title || "Generated Media",
          created_at: data[0].created_at || new Date().toISOString(),
          mode: (data[0].mode || "image-to-video") as
            | "image-to-image"
            | "image-to-video",
          videoUrl: data[0].mode === "image-to-video" ? mediaUrl : null,
          imageUrl: data[0].mode === "image-to-image" ? mediaUrl : null,
          status: "completed",
          user_content: data[0].user_content ?? "",
        };

        // Update the past generations list with the correct mode
        setPastGenerations((prev) => {
          const existingIndex = prev.findIndex((gen) => gen.id === data[0].id);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = mediaData;
            return updated;
          }
          return [mediaData, ...prev];
        });
        setGeneratedVideo(mediaData);
        setVideoStatus("completed");
        setIsGenerating(false);
      } else {
        setGeneratedVideo(null);
        setVideoStatus("idle");
      }
    } catch (error) {
      console.error("Error in fetchLatestVideo:", error);
      setGeneratedVideo(null);
      setVideoStatus("idle");
      setIsGenerating(false);
    }
  };
  const fetchPastGenerations = async ({
    user_id,
    session_id,
    page = 0,
  }: {
    user_id: string;
    session_id: any;
    page?: number;
  }) => {
    // Skip if we don't have either user_id or session_id
    if (!user_id && !session_id) return;

    if (page === 0) {
      // If refreshing or first load
    } else {
      // already set in handleLoadMore
    }

    const from = page * 20;
    const to = (page + 1) * 20 - 1;

    const { data, error } = await supabase
      .from("generated_videos")
      .select("*")
      .neq("status", "failed")
      .or(user_id ? `user_id.eq.${user_id}` : `session_id.eq.${session_id}`)
      .order("created_at", { ascending: false })
      .range(from, to);

    setIsFetchingMore(false);

    if (error) {
      console.error("Error fetching past generations:", error);
      return;
    }

    if (data.length < 20) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }

    const formatted = data.map((video) => {
      const isPending = video.status === "pending";
      return {
        id: video.id,
        title:
          video.title ||
          `Video ${new Date(video.created_at).toLocaleDateString()}`,
        date: new Date(video.created_at).toLocaleDateString(),
        videoUrl: video.location,
        status: isPending ? "pending" : video.status,
        created_at: video.created_at,
        mode: video.mode || "image-to-video", // Ensure mode is included
        user_content: video.user_content ?? "",
      };
    });



    setPastGenerations((prev) => {
      if (page === 0) return formatted;
      // Avoid duplicates if any
      const existingIds = new Set(prev.map(p => p.id));
      const newItems = formatted.filter(f => !existingIds.has(f.id));
      return [...prev, ...newItems];
    });
    // Set up real-time subscription for any pending videos
    const pendingVideos = data.filter((video) => video.status === "pending");
    if (pendingVideos.length > 0) {
      pendingVideos.forEach((video) => {
        const channel = supabase
          .channel(`generated_videos_${video.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "generated_videos",
              filter: `id=eq.${video.id}`,
            },
            (payload: any) => {
              const updatedVideo = payload.new;
              if (updatedVideo.status === "completed") {
                const videoUrl = updatedVideo.location.startsWith("http")
                  ? updatedVideo.location
                  : `${import.meta.env.VITE_SUPABASE_URL
                  }/storage/v1/object/public/${updatedVideo.location}`;
                setPastGenerations((prev) =>
                  prev.map((v) =>
                    v.id === updatedVideo.id
                      ? {
                        ...v,
                        status: "completed",
                        videoUrl: videoUrl,
                      }
                      : v
                  )
                );

                // Clean up the channel after completion
                supabase.removeChannel(channel);
              } else if (updatedVideo.status === "failed") {
                setPastGenerations((prev) =>
                  prev.map((v) =>
                    v.id === updatedVideo.id
                      ? {
                        ...v,
                        status: "failed",
                      }
                      : v
                  )
                );

                // Refund Logic REMOVED - Backend handles this.


                supabase.removeChannel(channel);
              }
            }
          )
          .subscribe();
      });
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || isFetchingMore) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    const { user_id, session_id } = await getCurrentUserOrGuestId();
    await fetchPastGenerations({ user_id, session_id, page: nextPage });
  };

  // Fetch past generations on component mount
  // Effect to cycle through loading messages
  useEffect(() => {
    if (videoStatus === "pending") {
      const interval = setInterval(() => {
        setCurrentMessage((prev) => (prev + 1) % loadingMessages.length);
      }, 3000); // Change message every 3 seconds
      return () => clearInterval(interval);
    }
  }, [videoStatus, loadingMessages.length]);

  useEffect(() => {
    if (isLoading) return;
    (async () => {
      const { user_id, session_id } = await getCurrentUserOrGuestId();
      await fetchLatestVideo({ user_id, session_id });
      setPage(0);
      setHasMore(true);
      await fetchPastGenerations({ user_id, session_id, page: 0 });
    })();
  }, [user?.id, isLoading]);

  // Protect Route: Redirect to /pricing if user has 0 tokens
  useEffect(() => {
    if (!isLoading && user && userProfile) {
      // Check if user has purchase_tokens
      const tokens = Number(userProfile.purchase_token || 0);
      if (tokens <= 0) {
        toast({
          title: "Upgrade required",
          description: "Please upgrade your plan to generate videos.",
          variant: "default", // or "destructive" if you want red
        });
        navigate("/pricing");
      }
    }
  }, [isLoading, user, userProfile, navigate, toast]);

  useEffect(() => {
    // Check if we need to show the coupon modal
    // Only show if user is logged in AND user_type is NOT set
    if (user && userProfile && !userProfile.user_type) {
      // Logic handled in Onboarding or globally, but checking here contextually
    }
  }, [user, userProfile]);

  useEffect(() => {
    return () => {
      cleanupChannel();
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (user?.id) {
        const products = await getProductImage(user.id);
        setProducts(products);
      }
    })();
  }, [user?.id]);

  // Effect to handle cleanup and sync generated video with pastGenerations
  useEffect(() => {
    // Clear generated video when pastGenerations changes to avoid showing stale data
    // ONLY if pastGenerations has loaded (check if we have fetched at least once or assume non-empty means loaded)
    // Actually, checking length > 0 is risky if user genuinely has 0 videos.
    // But since we just fetched, it should be fine.
    // Better: Only run this if we have pastGenerations logic stable.

    // If pastGenerations is empty, it might mean we haven't loaded yet OR user has no videos.
    // If user has no videos, generatedVideo shouldn't exist unless it's the one we just made?
    // But if we just made it, it SHOULD be in pastGenerations by now (realtime).
    if (generatedVideo?.id && pastGenerations.length > 0) {
      const videoStillExists = pastGenerations.some(
        (gen) => gen.id === generatedVideo.id
      );
      if (!videoStillExists) {
        setGeneratedVideo(null);
        setVideoStatus("idle");
      }
    }
  }, [pastGenerations, generatedVideo]);

  // Fetch metadata when generatedVideo changes (and is a video)
  const lastVideoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (generatedVideo && generatedVideo.mode === "image-to-video" && generatedVideo.url) {
      // Avoid resetting if URL matches last fetched URL
      if (lastVideoUrlRef.current === generatedVideo.url) {
        return;
      }

      setVideoMetadata(null); // Reset
      lastVideoUrlRef.current = generatedVideo.url;

      getVideoMetadata(generatedVideo.url)
        .then((data) => {
          const duration = Math.floor(data.durationInSeconds * 30);
          setVideoMetadata({
            durationInFrames: duration, // assuming 30fps
            width: data.width,
            height: data.height,
            fps: 30, // Remotion usually defaults to 30 unless specified
          });
          setTrimRange([0, duration]);
          setIsPlaying(true); // Auto-play when ready
        })
        .catch((err) => {
          console.error("Failed to load video metadata", err);
          // Fallback?
        });
    }
  }, [generatedVideo?.url, generatedVideo?.mode]);
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    // Remotion Player doesn't expose simple 'ended' event via ref in the same way.
    // However, if loop is true (which it is in our implementation), it won't end.
    // If loop is false, we can use subscribeToStateChange?

    // For now, if we use loop={true}, we don't strictly need onEnded logic unless we want to stop exactly at end.
    // But original code had:
    // video.addEventListener("ended", handleEnded);

    // With Remotion Player and loop={true}, it just loops.
    // If we want to simulate the previous behavior (reset to 0.5s), we might not need it if it loops.

    // If we DO want to track 'isPlaying' state:
    // Remotion Player manages its own state.
    // Use subscribeToStateChange to sync local isPlaying state if needed?

    // Let's assume loop logic is fine and we don't need explicit 'ended' handler.

  }, [generatedVideo?.url]);

  const onDownload = useCallback(
    async (
      url?: string,
      title: string = "media",
      mode: string = "image-to-video"
    ) => {
      if (!url) return;
      await handleDownload(url, title, mode);
    },
    [handleDownload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!imageFiles.length) {
      return;
    }

    // Convert all dropped image files to data URLs
    const readers = imageFiles.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers)
      .then((dataUrls) => {
        setUploadedImages((prev) => [...prev, ...dataUrls]);
        setVideoStatus("idle");
        setVideoId(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      })
      .catch((err) => {
        console.error("Error reading dropped files:", err);
      });
  };

  const handleLoadedMetadata = (e: any) => {
    // Logic from ThumbnailCard to force a preview frame
    const video = e.currentTarget;
    if (video && video.currentTime < 0.5) {
      video.currentTime = 0.5;
    }

    // Keep autoplay for GenerateVideo page
    if (video) {
      // We already set currentTime to 0.5 above if needed
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err: any) => {
            console.error("Autoplay failed:", err);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleDownloadMedia = async () => {
    if (isDownloading || !generatedVideo) return;

    setIsDownloading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const increment = Math.random() < 0.3 ? 0 : 1;
        return Math.min(prev + increment, 95);
      });
    }, 50);

    try {
      await onDownload(
        generatedVideo.url,
        `generated-${generatedVideo.mode === "image-to-image" ? "image" : "video"
        }`,
        generatedVideo.mode
      );
      setProgress(100);
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setIsDownloading(false);
        setProgress(0);
      }, 500);
    }
  };

  const openFullscreen = useCallback((g: GeneratedMedia) => {
    const data: Generation = {
      id: g.id,
      title: g.title,
      date: new Date(g.created_at).toLocaleDateString(),
      status: "completed",
      user_content: g.user_content,
    };
    if (g.mode === "image-to-image") {
      data["imageUrl"] = g.url;
      data["mode"] = "image-to-image";
    } else {
      data["videoUrl"] = g.url;
      data["mode"] = "image-to-video";
    }
    setSelectedVideo(data);
    setIsPlaying(false);
    videoRef?.current?.pause();
    setTimeout(() => {
      // noop - modal handles its own play logic
    }, 50);
  }, []);

  const closeFullscreen = useCallback(() => setSelectedVideo(null), []);

  useEffect(() => {
    (async () => {
      const rawHash = window.location.hash || "";
      const params = new URLSearchParams(rawHash.replace("#", "?"));
      const access_token = params.get("access_token");
      if (access_token) {
        await mergeGuestVideosOnLogin();
      }
    })();
  }, []);
  const usedTokens = Number(userProfile?.exhaust_token || 0);
  const totalTokens = Number(userProfile?.purchase_token || 0);

  const remainingVideo = Math.max(
    0,
    Math.floor((totalTokens - usedTokens) / 10)
  );

  const remainingImage = Math.max(0, Math.floor(totalTokens - usedTokens));

  const inputProps = useMemo(() => ({
    videoUrl: generatedVideo?.url || "",
    muted: isMuted,
    volume: isMuted ? 0 : volume,
  }), [generatedVideo?.url, isMuted, volume]);

  return (
    <>
      <div className="bg-[#edfffa9e] relative dark:bg-[#111213]">
        {showCloneBanner && (
          <div className="bg-gradient-to-r relative  text-center from-[#29A6B4] to-[#9ED2C3] text-white p-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full ">
            <div className="flex-1 flex flex-col justify-center sm:flex-row sm:items-center gap-3 max-mobile:gap-1">
              <p className="text-xs font-bold">
                Coming Soon — Digital Clones & Actors.
              </p>
              <ul className="list-disc font-medium list-inside text-xs flex flex-col sm:flex-row max-mobile:gap-1 gap-3 max-w-[900px]">
                <li>
                  Make a digital clone of yourself the actor in every video, or
                  create your own product influencer
                </li>
                <li>Currently in beta — releasing soon.</li>
              </ul>
            </div>
          </div>
        )}
        <section
          className={` transition-all ease-in-out duration-300 max-mobile:min-h-[800px] relative overflow-hidden flex items-end w-full ${showCloneBanner
            ? "min-h-[calc(100dvh-32px)] max-mobile:min-h-screen"
            : "min-h-[calc(100dvh-0px)] max-mobile:min-h-screen"
            }`}
        >
          <div className="pt-[100px] max-mobile:pl-5 max-mobile:pt-[22px] max-laptop:pt-20 max-laptop:px-20 pl-[64px] absolute top-0 z-10">
            <div>
              <div className="flex max-mobile:pb-4 justify-start pb-4">
                <img
                  src={theme === "dark" ? logo : lightlogo}
                  alt="Run Helix"
                  className=" object-contain max-w-[150px] max-mobile:max-w-[100px] cursor-pointer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = theme === "dark" ? logo : lightlogo;
                  }}
                // onClick={() => navigate("/dashboard")}
                />
              </div>
              <p
                className={`text-sm max-mobile:text-xs leading-normal text-center dark:text-white font-medium text-[#292929] transition-opacity duration-300 ${isGenerating ? "max-mobile:hidden" : ""
                  }`}
              >
                The DNA of Product Storytelling
              </p>
            </div>
          </div>
          <div className="absolute right-5 top-5 max-mobile:right-2 max-mobile:top-2 z-50 flex items-center gap-4 max-mobile:gap-2">
            {/* Replaced manual header with UserNav component */}
            <UserNav
              setIsProductDrawerOpen={setIsProductDrawerOpen}
              setProductDrawerView={setProductDrawerView}
              setIsLogoutDialogOpen={setIsLogoutDialogOpen}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          </div>

          <div className="bg-[url('/assets/images/banner-img.png')] bg-animation-keyframe dark:bg-[url('/assets/images/dark-mode.png')]  absolute bottom-0 left-0 w-full bg-cover bg-center h-full"></div>
          <div className="w-full pb-6 relative">
            <div className="max-w-[1400px] w-full mx-auto px-5 max-mobile:px-2 pt-[100px]">
              {generatedVideo || isGenerating ? (
                <div className="relative w-full max-w-[260px] mx-auto mb-5 rounded-xl overflow-hidden bg-white dark:bg-[#5b5e6d26] shadow-lg">
                  {isGenerating ? (
                    <div className="h-[390px] max-mobile:h-[390px] flex flex-col items-center justify-center bg-black/5 relative">
                      <div className="absolute top-4 left-4 bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1.5 rounded-full">
                        Generating...
                      </div>
                      <div className="flex flex-col items-center">
                        <video
                          src={AnimationVide}
                          loop
                          autoPlay
                          muted
                          playsInline
                          className="mt-6"
                        />
                        <div className="text-center space-y-2">
                          <p className="text-sm font-medium px-1.5 text-foreground">
                            {loadingMessages[currentMessage]}
                          </p>
                          <div className="flex flex-col items-center leading-snug text-muted-foreground text-xs font-medium">
                            <span>Helix is now running.</span>
                            <span>Videos generation takes a few minutes.</span>
                            <span>Please enjoy a snack.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative w-full max-mobile:h-[320px] h-[380px] overflow-hidden group">


                        {/* {generatedVideo.mode === "image-to-image" ? (
                          <img
                            src={generatedVideo.url}
                            alt={generatedVideo.title}
                            onClick={() => openFullscreen(generatedVideo)}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <video
                            ref={videoRef}
                            src={generatedVideo.url}
                            className="w-full h-full object-cover rounded-lg"
                            muted={isMuted}
                            playsInline
                            onMouseEnter={() => setHovered(true)}
                            onMouseLeave={() => setHovered(false)}
                            onClick={() => openFullscreen(generatedVideo)}
                            onEnded={() => setIsPlaying(false)}
                            onLoadedMetadata={handleLoadedMetadata}
                          />
                        )} */}
                        {generatedVideo.mode === "image-to-image" ? (
                          <img
                            src={generatedVideo.url}
                            alt={generatedVideo.title}
                            onClick={() => openFullscreen(generatedVideo)}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div
                            className="relative w-full h-full bg-black rounded-lg overflow-hidden group cursor-pointer"
                            onClick={(e) => {
                              // Prevent opening if clicking on controls (if controls stop propagation, this might not be needed, but good safety)
                              // Actually, simply adding the click handler to the container restores the "click video to open" behavior
                              // which was likely on the <video> tag before.
                              openFullscreen(generatedVideo);
                            }}
                          >
                            {/* Only render Player if metadata is loaded. Show spinner or placeholder otherwise. */}
                            {videoMetadata ? (
                              <>
                                <Player
                                  ref={videoRef}
                                  component={SimpleVideo}
                                  inputProps={inputProps}
                                  durationInFrames={videoMetadata.durationInFrames}
                                  compositionWidth={videoMetadata.width}
                                  compositionHeight={videoMetadata.height}
                                  fps={videoMetadata.fps}
                                  controls={false}
                                  loop
                                  autoPlay
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                  }}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <VideoControls
                                  isPlaying={isPlaying}
                                  isMuted={isMuted}
                                  currentFrame={currentFrame}
                                  durationInFrames={videoMetadata.durationInFrames}
                                  fps={videoMetadata.fps}
                                  volume={volume}
                                  onPlayPause={() => {
                                    if (videoRef.current) {
                                      if (isPlaying) {
                                        videoRef.current.pause();
                                        setIsPlaying(false);
                                      } else {
                                        videoRef.current.play();
                                        setIsPlaying(true);
                                      }
                                    }
                                  }}
                                  onSeek={(frame) => {
                                    if (videoRef.current) {
                                      videoRef.current.seekTo(frame);
                                      setCurrentFrame(frame);
                                    }
                                  }}
                                  onVolumeChange={(newVolume) => {
                                    setVolume(newVolume);
                                    if (newVolume > 0 && isMuted) setIsMuted(false);
                                    if (newVolume === 0) setIsMuted(true);
                                  }}
                                  onToggleMute={() => setIsMuted(!isMuted)}
                                  // Trim props
                                  isTrimming={isTrimming}
                                  trimRange={trimRange}
                                  onToggleTrim={() => setIsTrimming((prev) => !prev)}
                                  onTrimChange={setTrimRange}
                                  // Fullscreen logic needs a specific container ref, but for now we can toggle the modal or use simple fullscreen
                                  onFullscreen={() => openFullscreen(generatedVideo)}
                                  isFullscreen={false} // The modal is a "fullscreen" view of sorts
                                />
                              </>
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="absolute top-4 right-4 z-[60]">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (isDownloading) return;
                            setIsDownloading(true);
                            try {
                              await handleVideoDownload(
                                generatedVideo.url,
                                generatedVideo.title,
                                generatedVideo.mode,
                                undefined,
                                isTrimming ? { start: trimRange[0], end: trimRange[1] } : undefined,
                                String(generatedVideo.id)
                              );
                            } catch (e) {
                              console.error("Download failed", e);
                            } finally {
                              setIsDownloading(false);
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white text-[#29A6B4] rounded-full shadow-md transition-all hover:scale-105"
                          title={`Download ${generatedVideo.mode === "image-to-image"
                            ? "image"
                            : "video"
                            }`}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
              <div className="flex justify-center pb-2 max-mobile:pb-2">
                <div id="tour-media-section" className="inline-flex shadow-sm gap-7" role="group">

                  <button
                    type="button"
                    className={`px-6 py-2 min-w-[80px] rounded-sm ${mode === "image-to-video"
                      ? "bg-primary text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      }`}
                    onClick={() => setMode("image-to-video")}
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    className={`px-6 min-w-[80px] py-2 rounded-sm ${mode === "image-to-image"
                      ? "bg-primary text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      }`}
                    onClick={() => setMode("image-to-image")}
                  >
                    Image
                  </button>
                </div>
              </div>
              <div
                id="tour-media-upload"
                className="rounded-2xl border dark:border-[#1f2123] border-[#29A6B4] dark:bg-[linear-gradient(0deg,#0A0A0A_20%,#1A1A1A_100%)] bg-[linear-gradient(0deg,#E7F3F4_20%,#FFF_100%)]"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {(uploadedImages.length > 0 || selectedProduct?.media) && !(videoType === "Promotional" && referenceType === "frames") ? (
                  <div className="px-5 pt-5 flex flex-wrap gap-3">
                    {uploadedImages.map((img, index) => (
                      <div
                        key={index}
                        className="w-20 h-20 cursor-pointer relative"
                      >
                        <img
                          className="w-20 h-20 rounded-md object-cover"
                          src={img}
                        />
                        <button
                          type="button"
                          className="bg-white w-fit absolute right-1 top-1 rounded-full p-[2px]"
                          onClick={() => {
                            setUploadedImages((prev) =>
                              prev.filter((_, i) => i !== index)
                            );
                            if (uploadedImages.length === 1) {
                              setVideoStatus("idle");
                              setVideoId(null);
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }
                          }}
                          aria-label="Remove uploaded image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {selectedProduct?.media && (
                      <div
                        className="w-20 h-20 cursor-pointer relative"
                      >
                        <img
                          className="w-20 h-20 rounded-md object-cover"
                          src={typeof selectedProduct.media === 'string' ? selectedProduct.media : URL.createObjectURL(selectedProduct.media)}
                          alt={selectedProduct.name}
                        />
                        <button
                          type="button"
                          className="bg-white w-fit absolute right-1 top-1 rounded-full p-[2px]"
                          onClick={() => {
                            setSelectedProduct(null);
                          }}
                          aria-label="Remove selected product"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {videoType === "Promotional" && referenceType === "frames" ? (
                  <div className="px-5 pt-5 flex flex-wrap gap-3">
                    {/* Start Frame Slot */}
                    <div
                      className="w-20 h-20 relative text-center group bg-black/5 dark:bg-white/5 rounded-md flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#29A6B4] transition-colors cursor-pointer"
                      onClick={() =>
                        !promoFrames.start &&
                        startFrameRef.current?.click()
                      }
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) =>
                        handlePromoDrop(e, "start")
                      }
                    >
                      {promoFrames.start ? (
                        <>
                          <img
                            className="w-full h-full rounded-md object-cover border border-[#29A6B4]"
                            src={promoFrames.start}
                            alt="Start"
                          />
                          <div className="absolute bottom-0 w-full bg-black/60 text-white text-[10px] text-center py-0.5 rounded-b-md">
                            Start Frame
                          </div>
                          <button
                            className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-200 dark:border-gray-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromoFrames((prev) => ({
                                ...prev,
                                start: null,
                              }));
                            }}
                          >
                            <X className="w-3 h-3 text-gray-500" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 gap-1">
                          <span className="text-[10px] uppercase font-semibold">
                            Start Frame
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={startFrameRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handlePromoFrameUpload(e, "start")}
                      />
                    </div>

                    {/* End Frame Slot */}
                    <div
                      className="w-20 h-20 relative cursor-pointer group bg-black/5 dark:bg-white/5 rounded-md flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#29A6B4] transition-colors"
                      onClick={() =>
                        !promoFrames.end && endFrameRef.current?.click()
                      }
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => handlePromoDrop(e, "end")}
                    >
                      {promoFrames.end ? (
                        <>
                          <img
                            className="w-full h-full rounded-md object-cover border border-[#29A6B4]"
                            src={promoFrames.end}
                            alt="End"
                          />
                          <div className="absolute bottom-0 w-full bg-black/60 text-white text-[10px] text-center py-0.5 rounded-b-md">
                            End Frame
                          </div>
                          <button
                            className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-200 dark:border-gray-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromoFrames((prev) => ({
                                ...prev,
                                end: null,
                              }));
                            }}
                          >
                            <X className="w-3 h-3 text-gray-500" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 gap-1">
                          <span className="text-[10px] uppercase font-semibold">
                            End Frame
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={endFrameRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handlePromoFrameUpload(e, "end")}
                      />
                    </div>
                  </div>
                ) : null}

                <textarea
                  id="tour-prompt-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-none resize-none dark:text-white w-full min-h-20 overflow-auto sizing-content max-h-[180px] bg-transparent text-black  font-medium placeholder:font-normal outline-none px-5 py-5 text-base placeholder:text-base"
                  placeholder="Describe your next video or paste a script..."
                  required
                />
                {/* <div className="hidden max-mobile:block max-mobile:px-3 max-mobile:pb-2">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="inline-flex max-mobile:text-xs w-[120px] justify-center  items-center gap-2 rounded-full px-5 py-2.5 max-mobile:px-2.5 text-sm font-semibold text-white border bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] hover:bg-[#29A6B4]/10 transition-colors focus:outline-none focus:ring-2 shadow-sm"
                  >
                    <Paperclip className="w-4 h-4 shrink-0" />
                    <span>Media</span>
                  </button>
                </div> */}
                <div
                  className={`flex justify-between pb-4 max-mobile:px-3 max-mobile:flex-col max-mobile:gap-2 px-5 ${isMobile && user?.id
                    ? "flex-col gap-5 items-start"
                    : "items-center"
                    }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    {/* <button
                      type="button"
                      onClick={triggerFileInput}
                      className="inline-flex max-mobile:text-xs max-mobile:hidden items-center gap-2 rounded-full px-5 py-2.5 max-mobile:px-2.5 text-sm font-semibold text-white border bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3]             hover:bg-[#29A6B4]/10 transition-colors focus:outline-none focus:ring-2 shadow-sm"
                    >
                      <Paperclip className="w-4 h-4 shrink-0" />
                      <span>Media</span>
                    </button> */}
                    {!user?.id ? (
                      <VideoTypeDropdown
                        mode={mode}
                        videoType={videoType}
                        setVideoType={setVideoType}
                        isMobile={isMobile}
                      />
                    ) : (
                      <>
                        <ProductDropdown
                          userId={user?.id}
                          products={products}
                          selectedProduct={selectedProduct}
                          onAddProduct={() => {
                            setProductDrawerView("add");
                            setIsProductDrawerOpen(true);
                          }}
                          onViewAll={() => {
                            setProductDrawerView("list");
                            setIsProductDrawerOpen(true);
                          }}
                          isMobile={isMobile}
                        />
                        {videoType === "Promotional" && (
                          <ReferenceTypeDropdown
                            value={referenceType}
                            onChange={setReferenceType}
                            isMobile={isMobile}
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div
                    id="tour-settings-section"
                    ref={productRef}
                    className={`flex items-center gap-2 max-mobile:overflow-x-auto max-mobile:pb-0.5`}
                  >
                    {user?.id && (
                      <VideoTypeDropdown
                        mode={mode}
                        videoType={videoType}
                        setVideoType={setVideoType}
                        isMobile={isMobile}
                      />
                    )}
                    {user?.id && mode === "image-to-video" && (
                      <VideoModelDropdown
                        videoModel={videoModel}
                        setVideoModel={(model) => {
                          setVideoModel(model);
                          // Reset resolution when model changes manually
                          setVideoResolution(null);
                        }}
                        setVideoCreditId={setVideoCreditId}
                        onResolutionsChange={(resolutions) => {
                          setVideoResolutionOptions(resolutions);
                          // Auto-select first resolution when model changes
                          if (resolutions.length >= 2) {
                            setVideoResolution(resolutions[0].resolution);
                            setVideoCreditId(resolutions[0].creditId);
                          } else {
                            setVideoResolution(null);
                          }
                        }}
                        videoType={videoType}
                        isMobile={isMobile}
                        defaultModelValue={
                          videoType === "UGC Testimonials" ? "sora-2" : undefined
                        }
                      />
                    )}
                    {user?.id && mode === "image-to-video" && videoResolutionOptions.length >= 2 && (
                      <VideoResolutionDropdown
                        resolutions={videoResolutionOptions}
                        selectedResolution={videoResolution}
                        onResolutionChange={(resolution, creditId) => {
                          setVideoResolution(resolution);
                          setVideoCreditId(creditId);
                        }}
                        isMobile={isMobile}
                      />
                    )}
                    <ProductDrawer
                      open={isProductDrawerOpen}
                      onOpenChange={setIsProductDrawerOpen}
                      products={products}
                      onAddProduct={handleAddProduct}
                      onUpdateProduct={handleUpdateProduct}
                      onDeleteProduct={handleDeleteProduct}
                      loading={loading}
                      initialView={productDrawerView}
                      onSelectProduct={(product) => {
                        setSelectedProduct(product);
                        setIsProductDrawerOpen(false);
                        setIsMobileMenuOpen(false);
                      }}
                      selectedProductId={selectedProduct?.id}
                    />

                    <AspectRatioDropdown
                      aspectRatio={aspectRatio}
                      setAspectRatio={setAspectRatio}
                      isMobile={isMobile}
                      mode={mode}
                    />

                    <button
                      id="tour-generate-button"
                      type="button"
                      onClick={handleGenerate}
                      disabled={
                        (videoType === "Promotional"
                          ? referenceType === "frames"
                            ? !(promoFrames.start && promoFrames.end)
                            : !(selectedProduct?.id || uploadedImages.length)
                          : selectedProduct?.id
                            ? false
                            : !uploadedImages.length) ||
                        !description.trim() ||
                        isGenerating
                      }
                      className={`py-2.5 px-5 max-mobile:px-3 max-mobile:text-xs rounded-full text-sm font-semibold flex items-center border border-solid border-[#29A6B4] gap-1.5 whitespace-nowrap shrink-0 ${(videoType === "Promotional"
                        ? referenceType === "frames"
                          ? !(promoFrames.start && promoFrames.end)
                          : !(selectedProduct?.id || uploadedImages.length)
                        : selectedProduct?.id
                          ? false
                          : !uploadedImages.length) ||
                        !description.trim() ||
                        isGenerating
                        ? " cursor-not-allowed text-[#29A6B4]"
                        : "bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] hover:opacity-90 transition-opacity"
                        }`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="max-mobile:hidden">Running Helix...</span>
                          <span className="hidden max-mobile:inline">Running...</span>
                        </>
                      ) : (
                        <>
                          {isMobile ? "" : "Run Helix"}
                          {commonSvgIcon("play")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {generatedVideo || pastGenerations.length > 0 ? (
              <a href="#past-generations">
                <div className="flex cursor-pointer items-center relative top-4 justify-center px-5 h-8">
                  <div>
                    <div className="line"></div>
                  </div>
                  {commonSvgIcon("down-arrow")}
                </div>
              </a>
            ) : (
              ""
            )}
          </div>
        </section >
      </div >
      <div id="past-generations">
        {pastGenerations.length == 0 ? (
          ""
        ) : (
          <PastGenerations
            generations={pastGenerations}
            onVideoDeleted={handleVideoDeleted}
            setGeneratedVideo={setGeneratedVideo}
            messages={loadingMessages}
            userId={user?.id}
            onDownload={handleVideoDownload}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            loading={isFetchingMore}
          />
        )}
      </div>
      <FullscreenModal
        selectedVideo={selectedVideo}
        onClose={closeFullscreen}
        onDownload={handleVideoDownload}
        shouldBlur={showLimitModal}
        setGeneratedVideo={setPastGenerations}
        setSelectedVideo={setSelectedVideo}
      />

      <AlertDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
      >
        <AlertDialogContent className="dark:bg-[#111213] dark:border-[#1f2123] max-w-[400px] p-8 rounded-2xl gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="h-12 w-12 rounded-full bg-[#29A6B4]/10 flex items-center justify-center mb-2">
              <LogOut className="h-6 w-6 text-[#29A6B4]" />
            </div>
            <AlertDialogHeader className="space-y-2">
              <AlertDialogTitle className="text-xl font-bold dark:text-white text-center">
                Are you sure you want to logout?
              </AlertDialogTitle>
              <AlertDialogDescription className="dark:text-gray-400 text-center text-base">
                You will be signed out of your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="flex-row gap-3 sm:justify-center w-full">
            <AlertDialogCancel className="flex-1 dark:bg-transparent dark:text-white dark:hover:bg-white/10 h-11 rounded-xl border border-gray-200 dark:border-gray-800 mt-0 hover:bg-gray-300 text-base font-medium transition-all">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await signOut();
                  navigate("/generate");
                  setLogout(!logout);
                } catch (error) {
                  console.error("Error signing out:", error);
                }
              }}
              className="flex-1 bg-[#29A6B4] hover:bg-[#29A6B4]/90 text-white h-11 rounded-xl text-base font-medium shadow-lg shadow-[#29A6B4]/20 transition-all hover:scale-[1.02]"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LimitReachedModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
      />
    </>
  );
};

export default GenerateVideo;