import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dna,
  Clapperboard,
  Sparkles,
  ArrowRight,
  Loader2,
  Link as LinkIcon,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CouponModal } from "@/components/CouponModal";
import { scrapeWebsite } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/* ---------------------------------- */
/* Onboarding Steps                    */
/* ---------------------------------- */
const onboardingSteps = [
  {
    id: 1,
    title: "Generate Product DNA",
    description:
      "Enter your website and we'll analyze your brand and products.",
    icon: Dna,
  },
  {
    id: 2,
    title: "Run Helix",
    description:
      "Generate stunning UGC videos, promo reels, digital ads and images.",
    icon: Sparkles,
  },
  {
    id: 3,
    title: "Post. Test. Repeat.",
    description:
      "Post to social. Track Performance. Boost what converts.",
    icon: Clapperboard,
  },
];

const loadingMessages = [
  { text: "Analyzing your product DNA", className: "bg-[#E8F5D6] text-[#2F3D1F]" },
  { text: "Reading your product story", className: "bg-[#D6F5E4] text-[#1F3D2C]" },
  { text: "Studying your product lineup", className: "bg-[#F5F2D6] text-[#3D381F]" },
  { text: "Indexing product details", className: "bg-[#D6F5F5] text-[#1F3D3D]" },
  { text: "Extracting visual signals", className: "bg-[#EFD6F5] text-[#3A1F3D]" },
  { text: "Calibrating creative context", className: "bg-[#E8F5D6] text-[#2F3D1F]" },
  { text: "Connecting the dots", className: "bg-[#D6F5E4] text-[#1F3D2C]" },
  { text: "Preparing creative intelligence", className: "bg-[#F5F2D6] text-[#3D381F]" },
  { text: "Structuring your content engine", className: "bg-[#D6F5F5] text-[#1F3D3D]" },
  { text: "Optimizing for generation", className: "bg-[#EFD6F5] text-[#3A1F3D]" },
  { text: "Almost ready to create", className: "bg-[#E8F5D6] text-[#2F3D1F]" },
  { text: "Finalizing creative setup", className: "bg-[#D6F5E4] text-[#1F3D2C]" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      if (!userProfile.user_type) {
        setShowCouponModal(true);
      }

      // Check if user has already onboarded (has products)
      const checkOnboarding = async () => {
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (count && count > 0) {
          navigate("/generate");
        }
      };

      checkOnboarding();
    }
  }, [user, userProfile, navigate]);

  const handleCouponSuccess = () => {
    setShowCouponModal(false);
    toast({
      title: "Coupon applied!",
      description: "Your account has been updated to VIP.",
    });
  };
  const [website, setWebsite] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [progressText, setProgressText] = useState("Analyzing your product DNA...");

  // Dynamic Loading Messages
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScraping) {
      interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isScraping]);

  /* ---------------------------------- */
  /* Realtime Handling                  */
  /* ---------------------------------- */
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const isCompletedRef = useRef(false);

  const cleanupChannel = async () => {
    if (subscriptionRef.current) {
      await supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupChannel();
    };
  }, []);

  /* ---------------------------------- */
  /* Completion Handler                 */
  /* ---------------------------------- */
  const handleCompletion = async (data: any) => {
    if (isCompletedRef.current) return;

    const status = data?.status?.toLowerCase();
    if (status !== "completed" && status !== "failed") return;

    isCompletedRef.current = true;

    if (status === "completed") {
      // Fetch full data again as requested
      const { data: fullData, error } = await supabase
        .from("website_scrapper")
        .select("*")
        .eq("id", data.id)
        .single();

      if (error || !fullData) {
        console.error("Error fetching full data:", error);
        // Fallback to payload data if fetch fails
        processSuccessData(data);
      } else {
        processSuccessData(fullData);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: "Could not analyze the website. Please try again.",
      });
      setIsScraping(false);
      cleanupChannel();
    }
  };

  const processSuccessData = (data: any) => {
    let details: any = {};
    let productImages: string[] = [];
    let parsedProducts: any[] = [];

    try {
      details = data.platform_details ? JSON.parse(data.platform_details) : {};
    } catch (e) {
      console.error("Failed to parse platform details", e);
    }
    try {
      if (typeof data.platform_details === 'string') {
        details = JSON.parse(data.platform_details);
      } else {
        details = data.platform_details || {};
      }
    } catch (e) {
      console.error("Failed to parse platform details", e);
    }

    try {
      // Parse products to extract images
      if (data.products && Array.isArray(data.products)) {
        data.products.forEach((item: any) => {
          try {
            let prod = item;
            if (typeof item === 'string') {
              prod = JSON.parse(item);
            }

            if (prod.image) productImages.push(prod.image);
            if (prod.images && Array.isArray(prod.images)) {
              productImages.push(...prod.images);
            }
            parsedProducts.push(prod);
          } catch (e) {
            // ignore invalid json in products
          }
        });
      }
    } catch (e) {
      console.error("Failed to parse products", e);
    }

    const allImages = [...(data.images || []), ...productImages];

    setScrapeResult({
      title: data.title,
      description: data.description,
      image: data.image_url || data.logo_url,
      url: data.url,
      logo: data.logos?.[0] || data.logo_url || "",
      images: allImages,
      products: parsedProducts,
      fonts: details.fonts || [],
      colors: details.colors || [],
      status: "success",
    });
    setIsScraping(false);
    cleanupChannel();
  };

  const handleContinue = async () => {
    if (!website.trim() || !user) return;

    // Auto-prepend https:// if missing
    let formattedWebsite = website.trim();
    if (!/^https?:\/\//i.test(formattedWebsite)) {
      formattedWebsite = `https://${formattedWebsite}`;
    }

    await cleanupChannel();
    isCompletedRef.current = false;

    setIsScraping(true);
    setScrapeResult(null);

    try {
      /* 1️⃣ Trigger API */
      const result = await scrapeWebsite({
        url: formattedWebsite,
        user_id: user.id,
      });

      if (!result?.product_id) {
        throw new Error("Failed to start website analysis");
      }

      const productId = result.product_id;

      /* 2️⃣ Immediate DB check (race-condition safe) */
      const { data, error } = await supabase
        .from("website_scrapper")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

      if (error) throw error;

      if (data?.status === "completed" || data?.status === "failed") {
        handleCompletion(data);
        return;
      }

      /* 3️⃣ Subscribe to realtime updates */
      subscriptionRef.current = supabase
        .channel(`website_scrape_${productId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "website_scrapper",
            filter: `id=eq.${productId}`,
          },
          (payload) => {
            handleCompletion(payload.new);
          }
        )
        .subscribe();

      setProgressText("Analyzing your product DNA...");
    } catch (error: any) {
      await cleanupChannel();
      setIsScraping(false);

      toast({
        variant: "destructive",
        title: "Analysis failed",
        description:
          error.message || "Could not analyze the website. Please try again.",
      });
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalContinue = async () => {
    if (isSubmitting) return;

    if (scrapeResult?.products && scrapeResult.products.length > 0 && user) {
      setIsSubmitting(true);

      // Deduplicate: Key by URL if present, otherwise Name
      const uniqueMap = new Map();
      scrapeResult.products.forEach((p: any) => {
        const key = p.url || p.name;
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, p);
        }
      });

      const productsToInsert = Array.from(uniqueMap.values()).map((p: any) => ({
        user_id: user.id,
        name: p.name,
        url: p.url,
        media: p.image || (p.images && p.images.length > 0 ? p.images[0] : null),
        content: p.description
      }));

      try {
        const { error } = await supabase.from('products').insert(productsToInsert);
        if (error) {
          console.error("Error inserting products:", error);
        }
      } catch (e) {
        console.error("Failed to insert products:", e);
      } finally {
        setIsSubmitting(false);
      }
    }

    // Beta user flow: Redirect to $99 plan (Start) if no plan yet
    if (userProfile?.user_type === 'beta') {
      // Check if they already have a plan/tokens (e.g. just paid)
      const hasPlan = userProfile?.plan_id || (userProfile?.purchase_token && Number(userProfile.purchase_token) > 0);
      if (hasPlan) {
        navigate("/generate");
        return;
      }
      navigate("/pricing?plan=Start");
      return;
    }
    if (userProfile?.user_type === 'VIP') {
      navigate("/generate");
      return;
    }


    const redirectAfterOnboarding = localStorage.getItem("auth_redirect");
    if (redirectAfterOnboarding) {
      navigate(redirectAfterOnboarding);
    } else {
      navigate("/pricing");
    }
  };

  const handleSkip = () => {
    // Beta user flow: Redirect to $99 plan (Start) if no plan
    if (userProfile?.user_type === 'beta') {
      const hasPlan = userProfile?.plan_id || (userProfile?.purchase_token && Number(userProfile.purchase_token) > 0);
      if (hasPlan) {
        navigate("/generate");
        return;
      }
      navigate("/pricing?plan=Start");
      return;
    }
    navigate("/generate");
  };

  /* ---------------------------------- */
  /* UI (UNCHANGED)                     */
  /* ---------------------------------- */
  return (
    <div className={cn(
      "min-h-screen bg-[#edfffa9e] dark:bg-[#111213] flex items-center justify-center p-4 relative font-sans transition-colors duration-300",
      showWebsiteModal ? "overflow-hidden h-screen" : "overflow-x-hidden overflow-y-auto"
    )}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 animate-orbitSlow">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-primary/30 blur-[140px] animate-blobSlow" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-white blur-[140px] animate-blobSlow [animation-delay:1.5s]" />
          <div className="absolute bottom-1/2 right-1/2 translate-x-1/2 w-[280px] h-[280px] rounded-full bg-primary blur-[150px] animate-blobSlow [animation-delay:3s]" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-white/30 blur-[130px] animate-blobSlow [animation-delay:4.5s]" />
        </div>
      </div>
      <div className="relative md:fixed md:top-1/2 md:left-0 md:-translate-y-1/2 w-full py-10 md:py-0">
        <div
          className={cn(
            "w-full max-w-5xl mx-auto relative z-10 flex flex-col items-center transition-all duration-500",
            showWebsiteModal && "blur-sm scale-95 opacity-50"
          )}
        >
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-6xl font-medium text-foreground tracking-tight">
              Welcome to Helix
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl font-medium">
              Generate stunning UGC videos, promo reels, & digital ads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16 px-4">
            {onboardingSteps.map((step) => (
              <div
                key={step.id}
                className="bg-white/60 dark:bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-8 flex flex-col items-center text-center group hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 relative shadow-lg hover:shadow-primary/10"
              >
                <div className="absolute -top-4 w-8 h-8 rounded-full bg-white dark:bg-card border border-border flex items-center justify-center text-base dark:text-white  font-mono shadow-sm">
                  {step.id}
                </div>

                <h3 className="text-xl font-bold text-foreground mb-6">
                  {step.title}
                </h3>

                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-md transition-transform group-hover:scale-105 bg-primary/10 text-primary">
                  <step.icon className="w-8 h-8" strokeWidth={2} />
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed max-w-[240px]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => setShowWebsiteModal(true)}
              className="bg-[linear-gradient(90deg,#29A6B4_0%,#9ED2C3_100%)] text-primary-foreground hover:opacity-90 rounded-full px-12 py-7 text-lg font-bold transition-all duration-300 shadow-[0_4px_20px_-5px_hsl(var(--primary)/0.5)] hover:shadow-[0_4px_25px_-5px_hsl(var(--primary)/0.6)] hover:scale-105"
            >
              Let's go!
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground hover:bg-transparent px-8 rounded-full font-medium transition-colors"
            >
              Skip
            </Button>
          </div>
        </div>
      </div>

      {showWebsiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-background/10 backdrop-blur-sm"
            onClick={() =>
              !isScraping && !scrapeResult && setShowWebsiteModal(false)
            }
          />

          <div className="relative p-[2px] overflow-hidden rounded-[34px]">
            {/* Rotating Gradient Border */}
            <div className="absolute inset-[-200%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#0000_0%,hsl(var(--primary))_50%,#0000_100%)] opacity-70" />

            <div className={cn(
              "bg-background/80 dark:bg-[#1A1A1A]/90 backdrop-blur-xl w-full p-6 md:p-10 rounded-2xl md:rounded-[32px] shadow-2xl relative z-10 flex flex-col items-center text-center transition-all duration-300 max-h-[90vh] md:max-h-[95vh] overflow-y-auto custom-scrollbar border border-white/20 dark:border-white/10",
              scrapeResult ? "max-w-6xl" : "max-w-lg"
            )}>
              {/* Close Button */}
              <button
                onClick={() => setShowWebsiteModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              {!isScraping && !scrapeResult ? (
                <>
                  <div className="space-y-3 mb-8 text-center w-full">
                    <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 tracking-tight">
                      Enter your website
                    </h2>
                    <p className="text-muted-foreground text-base md:text-lg font-medium max-w-sm mx-auto">
                      We'll analyze your brand and generate your product DNA
                    </p>
                  </div>

                  <div className="w-full space-y-6">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <LinkIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      </div>
                      <Input
                        placeholder="www.example.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="h-14 md:h-16 pl-12 bg-background/50 dark:bg-black/50 border-2 border-border/50 hover:border-border/80 text-foreground placeholder:text-muted-foreground/50 rounded-2xl text-base md:text-lg transition-all focus-visible:ring-0 focus-visible:border-primary shadow-inner"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                      />
                    </div>

                    <Button
                      onClick={handleContinue}
                      disabled={!website}
                      className="w-full h-14 md:h-16 rounded-2xl bg-[linear-gradient(90deg,#29A6B4_0%,#9ED2C3_100%)] text-white hover:opacity-90 font-bold text-lg md:text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_30px_-10px_#29A6B4] hover:shadow-[0_12px_40px_-12px_#29A6B4] hover:translate-y-[-2px]"
                    >
                      Continue
                      <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                  </div>
                </>
              ) : isScraping && !scrapeResult ? (
                <div className="animate-in fade-in zoom-in duration-500 space-y-8 w-full">
                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-4xl text-foreground tracking-wide leading-tight">
                      Generating your Product <br />
                      <span className="not-italic font-sans font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary animate-pulse">
                        DNA
                      </span>
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                      Helix is analyzing your brand and products. It will take several minutes.
                    </p>
                  </div>

                  <div
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-full border shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)] transition-all duration-500 max-w-full",
                      loadingMessages[currentMessageIndex].className,
                      "border-border/50"
                    )}
                  >
                    <Sparkles className="w-5 h-5 fill-current shrink-0" />
                    <span className="font-medium tracking-wide truncate">
                      {loadingMessages[currentMessageIndex].text}
                    </span>
                  </div>

                  <div className="bg-muted/50 dark:bg-black/40 rounded-xl py-3 px-6 inline-flex items-center gap-3 border border-border/50 text-muted-foreground max-w-full overflow-hidden">
                    <LinkIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate text-sm font-mono">
                      {website}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>{progressText}</span>
                  </div>

                </div>
              ) : (
                // 🧬 Product DNA RESULT STATE 🧬
                <div className="animate-in fade-in zoom-in duration-500 w-full flex flex-col items-center">
                  {/* Header */}
                  <div className="space-y-2 mb-8 text-center">
                    <h2 className="text-2xl md:text-3xl text-foreground tracking-wide">
                      Your Product DNA
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                      Here is a snapshot of your product that we'll use to
                      create social media campaigns. Feel free to edit this at
                      anytime.
                    </p>
                  </div>

                  {/* Main Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full text-left">
                    {/* Left Column */}
                    <div className="space-y-6 flex flex-col h-full lg:max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                      {/* 1. Title & URL Card */}
                      <div className="bg-card dark:bg-[#222] border border-border/50 dark:border-white/5 rounded-3xl p-6 md:p-8 flex flex-col justify-center min-h-[140px] md:min-h-[160px] shrink-0 shadow-sm">
                        <h3
                          className="text-2xl md:text-3xl font-bold text-foreground dark:text-white mb-3 truncate"
                          title={scrapeResult?.title}
                        >
                          {scrapeResult?.title || "My Product"}
                        </h3>
                        <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 dark:bg-black/20 w-fit px-4 py-2 rounded-full border border-border/50 dark:border-white/5 max-w-full">
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                          <a
                            href={scrapeResult?.url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm hover:underline truncate max-w-[200px] md:max-w-[300px]"
                          >
                            {scrapeResult?.url || website}
                          </a>
                        </div>
                      </div>

                      {/* 2. Logo & Fonts Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 shrink-0">
                        {/* Logo */}
                        <div className="bg-card dark:bg-[#222] border border-border/50 dark:border-white/5 rounded-3xl p-6 flex items-center justify-center relative overflow-hidden group aspect-square shadow-sm">
                          {scrapeResult?.logo ? (
                            <img
                              src={scrapeResult.logo}
                              alt="Logo"
                              className="max-w-[80%] max-h-[80%] object-contain"
                            />
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">
                              No Logo
                            </span>
                          )}
                          <div className="absolute top-4 left-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 dark:bg-black/40 px-2 py-1 rounded">
                            Logo
                          </div>
                        </div>

                        {/* Fonts */}
                        <div className="bg-card dark:bg-[#222] border border-border/50 dark:border-white/5 rounded-3xl p-6 flex flex-col relative aspect-square shadow-sm">
                          <div className="absolute top-4 left-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 dark:bg-black/40 px-2 py-1 rounded">
                            Fonts
                          </div>
                          <div className="flex flex-col items-center justify-center h-full gap-2 overflow-y-auto custom-scrollbar pt-6">
                            {scrapeResult?.fonts?.length > 0 ? (
                              scrapeResult.fonts.map(
                                (font: string, i: number) => (
                                  <div key={i} className="text-center">
                                    <span className="text-3xl text-primary font-serif block mb-1">
                                      Aa
                                    </span>
                                    <span className="text-muted-foreground font-medium text-xs break-words px-2">
                                      {font}
                                    </span>
                                  </div>
                                )
                              )
                            ) : (
                              <>
                                <span className="text-4xl text-primary font-serif mb-2">
                                  Aa
                                </span>
                                <span className="text-muted-foreground font-medium text-sm">
                                  Inter
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. Colors Card */}
                      <div className="bg-card dark:bg-[#222] border border-border/50 dark:border-white/5 rounded-3xl p-6 md:p-8 flex flex-col min-h-[140px] md:min-h-[160px] relative shrink-0 shadow-sm">
                        <div className="absolute top-4 left-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 dark:bg-black/40 px-2 py-1 rounded">
                          Colors
                        </div>
                        <div className="flex flex-wrap gap-4 mt-6 overflow-y-auto max-h-[200px] custom-scrollbar">
                          {scrapeResult?.colors?.length > 0
                            ? scrapeResult.colors.map(
                              (color: string, i: number) => (
                                <div
                                  key={i}
                                  className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-border/10 shadow-lg shrink-0"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              )
                            )
                            : // Placeholder colors if none found
                            ["#000", "#FFF", "#333"].map((c, i) => (
                              <div
                                key={i}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-border/10 bg-muted shrink-0"
                              />
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Images */}
                    <div className="bg-card dark:bg-[#222] border border-border/50 dark:border-white/5 rounded-3xl p-6 flex flex-col h-full max-h-[400px] lg:max-h-[600px] overflow-hidden shadow-sm">
                      <div className="flex justify-between items-center mb-4 shrink-0">
                        <h4 className="text-muted-foreground font-medium text-sm">
                          Images
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {scrapeResult?.images?.length || 0} found
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar content-start">
                        {/* Action Placeholders */}
                        {/* <div className="aspect-square rounded-2xl bg-[#2A3818]/50 border border-[#B5D68B]/30 flex flex-col items-center justify-center text-[#B5D68B] cursor-pointer hover:bg-[#2A3818] transition-colors gap-2 shrink-0">
                                                <span className="text-xl">↑</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wide">Upload</span>
                                            </div>
                                            <div className="aspect-square rounded-2xl bg-[#2A3818]/50 border border-[#B5D68B]/30 flex flex-col items-center justify-center text-[#B5D68B] cursor-pointer hover:bg-[#2A3818] transition-colors gap-2 shrink-0">
                                                <Sparkles className="w-5 h-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">Generate</span>
                                            </div> */}

                        {/* Scraped Images */}
                        {scrapeResult?.images?.map(
                          (img: string, idx: number) => (
                            <div
                              key={idx}
                              className="aspect-square rounded-2xl bg-muted dark:bg-black border border-border/50 dark:border-white/5 relative"
                            >
                              <img
                                src={img}
                                alt={`Scaped ${idx}`}
                                className="w-full h-full rounded-2xl object-cover group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <Button
                    onClick={handleFinalContinue}
                    disabled={isSubmitting}
                    className="mt-8 bg-[#B5D68B] hover:bg-[#a3c47a] text-[#fff] rounded-full px-12 py-6 text-lg font-bold transition-all duration-300 shadow-xl hover:shadow-[#B5D68B]/20 w-full md:w-auto min-w-[200px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Looks good"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CouponModal
        isOpen={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        onSuccess={handleCouponSuccess}
      />
    </div>
  );
};

export default Onboarding;
