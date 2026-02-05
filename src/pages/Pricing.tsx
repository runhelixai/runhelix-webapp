  import { motion } from "framer-motion";
import { Check, Loader2, Info, CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AppHeader from "@/components/layout/AppHeader";
import { PaymentDetailsDialog } from "@/components/PaymentDetailsDialog";
import { getPlanDetails } from "@/services/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip"; // Added this import for TooltipPrimitive.Portal

const CreditUsageTooltip = ({
  type,
  tier,
  monthlyPrice,
  videoCount,
  imageCount
}: {
  type: "video" | "image",
  tier: string,
  monthlyPrice: string,
  videoCount: number,
  imageCount: number
}) => {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <CircleHelp className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-[#29a6b4] transition-colors" />
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="bg-white dark:bg-[#0f1115] text-gray-900 dark:text-slate-200 border-gray-200 dark:border-white/10 p-0 shadow-2xl min-w-[320px] rounded-xl overflow-hidden"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
            <Info className="w-4 h-4 text-[#29a6b4]" />
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              {type === "video" ? "Video Generation Math" : "Image Generation Math"}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            {/* Base Cost */}
            {type === "video" && (
              <div className="space-y-2 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 text-xs">Sora 2 <span className="text-[10px] text-gray-400 dark:text-slate-500">(:12s)</span></span>
                  <span className="font-mono font-bold text-[#29a6b4] text-xs">10 Tokens</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 text-xs">Veo 3.1 <span className="text-[10px] text-gray-400 dark:text-slate-500">(:08s)</span></span>
                  <span className="font-mono font-bold text-[#29a6b4] text-xs">10 Tokens</span>
                </div>
              </div>
            )}
            {type === "image" && (
              <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                <span className="text-gray-500 dark:text-slate-400 text-xs">Cost per Image <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">(Gemini 2.5)</span></span>
                <span className="font-mono font-bold text-[#29a6b4]">1 Token</span>
              </div>
            )}

            {/* Plan Breakdown */}
            <div className="pt-2">
              <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-2">{tier} Plan Capacity</p>
              {type === "video" && (
                <div className="space-y-2 bg-gray-50 dark:bg-[#1a1d24] p-3 rounded-lg border border-gray-100 dark:border-white/5 text-xs">
                  {/* <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Price</span>
                    <span className="text-white font-mono">{monthlyPrice}</span>
                  </div> */}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Total Tokens</span>
                    <span className="text-[#29a6b4] font-mono">{videoCount * 10} Tokens</span>
                  </div>
                  <div className="my-1 h-px bg-gray-200 dark:bg-white/5" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-300">Total Videos</span>
                    <span className="text-gray-900 dark:text-white font-bold font-mono">{videoCount}</span>
                  </div>
                </div>
              )}
              {type === "image" && (
                <div className="space-y-2 bg-gray-50 dark:bg-[#1a1d24] p-3 rounded-lg border border-gray-100 dark:border-white/5 text-xs">
                  {/* <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Price</span>
                    <span className="text-white font-mono">{monthlyPrice}</span>
                  </div> */}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Total Tokens</span>
                    <span className="text-[#29a6b4] font-mono">{imageCount * 1} Tokens</span>
                  </div>
                  <div className="my-1 h-px bg-gray-200 dark:bg-white/5" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-300">Total Images</span>
                    <span className="text-gray-900 dark:text-white font-bold font-mono">{imageCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};


import { supabase } from "@/lib/supabase";
import { ScaleSuggestionModal } from "@/components/ScaleSuggestionModal";

const Pricing = () => {
  const navigate = useNavigate();
  const { signOut, userProfile } = useAuth();
  const { theme } = useTheme();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [showScaleSuggestion, setShowScaleSuggestion] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ id: string; name: string; price: string } | null>(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<{
    id: string;
    name: string;
    price: string;
  } | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [plans, setPlans] = useState<any>([]);

  const openPaymentModal = (planId: string, planName: string, price: string) => {
    console.log(`[Pricing] Opening payment modal for: ${planName}`);
    setSelectedPlanForPayment({ id: planId, name: planName, price });
    setPaymentModalOpen(true);
  };

  const handleSubscribe = async (planId: string, planName: string, price: string) => {

    // Check if it's the Start Plan
    if (planName.toLowerCase().includes("start")) {
      // Check purchase history
      const userId = userProfile?.id;
      if (userId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count, error } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('response_code', '1')
          .gte('created_at', thirtyDaysAgo.toISOString())
          // Filter specifically for Start Plan (assuming planName check is consistent or using planId if reliable)
          // Using planId which we have
          .eq('plan_id', planId);

        if (!error && count !== null && count >= 3) {
          setPendingPlan({ id: planId, name: planName, price }); // Save original intent
          setShowScaleSuggestion(true);
          return;
        }
      }
    }

    // Normal flow
    openPaymentModal(planId, planName, price);
  };

  const handleDismissSuggestion = () => {
    setShowScaleSuggestion(false);
    if (pendingPlan) {
      openPaymentModal(pendingPlan.id, pendingPlan.name, pendingPlan.price);
      setPendingPlan(null);
    }
  };

  const handleUpgradeToScale = () => {
    setShowScaleSuggestion(false);
    setPendingPlan(null);
    // Find Scale Plan
    // Assuming Scale Plan exists in the current list
    const scalePlan = plans.find((p: any) => p.name.toLowerCase().includes("scale") && p.type === billingCycle);
    if (scalePlan) {
      let priceToDisplay = scalePlan.price;
      // Check for beta user overrides
      if (userProfile?.user_type === 'beta' && scalePlan.price_for_beta) {
        priceToDisplay = scalePlan.price_for_beta;
      }

      if (billingCycle === "yearly") { // Recalculate if needed, but we pass raw strings usually? 
        // The PaymentDetailsDialog likely expects the raw price or display price? 
        // Looking at existing usage: plan.price is passed.
      }
      openPaymentModal(scalePlan.id, scalePlan.name, priceToDisplay);
    } else {
      console.error("[Pricing] Scale Plan not found!");
    }
  };

  const handlePaymentConfirm = (transId: string) => {
    console.log(`[Pricing] Payment confirmed. Transaction ID: ${transId}`);
    window.location.href = `/payment-success?transId=${transId}`;
  };

  useEffect(() => {
    (async () => {
      const planDetails = await getPlanDetails();
      setPlans(planDetails);

      // Check for 'plan' query param
      const params = new URLSearchParams(window.location.search);
      const planNameParam = params.get("plan"); // e.g. "Start"
      const billingParam = params.get("billing"); // "monthly" or "yearly"

      if (planNameParam && planDetails?.length) {
        // Enforce monthly or yearly billing based on query param
        const targetCycle = billingParam === "yearly" ? "yearly" : "monthly";
        setBillingCycle(targetCycle);

        // Find the matching plan within plans of the TARGET cycle
        const targetPlans = planDetails.filter((p: any) => p.type === targetCycle);
        const found = targetPlans.find((p: any) => p.name.toLowerCase() === planNameParam.toLowerCase());

        if (found) {
          handleSubscribe(found.id, found.name, found.price);
        }
      }
    })();
  }, []);

  if (!plans) return null;
  console.log(plans);
  return (
    <>
      <div className="min-h-screen dark:bg-[#0F0F0F] bg-white relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
        </div>

        {/* App Header with User Profile and Credits */}
        <AppHeader />
        <div
          id="pricing"
          className="
    relative overflow-hidden
    bg-[radial-gradient(circle_at_50%_0%,#f9fcff_0%,#f0f4f8_100%)]
    dark:bg-[radial-gradient(circle_at_50%_0%,#0b1220_0%,#020617_100%)]
    py-[60px] sm:py-[100px]
  "
        >
          <div className="container mx-auto px-4">
            {/* TITLE */}
            <div className="relative z-10 mb-[40px] sm:mb-[60px] text-center flex flex-col items-center">
              <h1
                className="
          mb-6 sm:mb-10 text-[42px] sm:text-[64px] leading-[1.1]
          font-extrabold tracking-[-2px]
          bg-gradient-to-br from-[#1a1a1a] to-[#4a5568]
          dark:from-white dark:to-slate-300
          bg-clip-text text-transparent
        "
              >
                Pricing
              </h1>

              {/* TOGGLE */}
              <div
                className="
          flex items-center rounded-full border p-1 shadow-sm
          bg-white border-gray-200
          dark:bg-white/5 dark:border-white/10 dark:backdrop-blur
        "
              >
                <div
                  onClick={() => setBillingCycle("monthly")}
                  className={`
            cursor-pointer rounded-full px-4 py-2 sm:px-6 transition
            ${billingCycle === 'monthly'
                      ? 'bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] text-white shadow-md'
                      : 'hover:bg-gray-100 dark:hover:bg-white/10'
                    }
          `}
                >
                  <p className={`text-[14px] sm:text-[16px] font-medium ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-600 dark:text-slate-300'}`}>
                    Monthly Billing
                  </p>
                </div>

                <div
                  onClick={() => setBillingCycle("yearly")}
                  className={`
            cursor-pointer flex items-center gap-2 rounded-full px-4 py-2 sm:px-6 transition
             ${billingCycle === 'yearly'
                      ? 'bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] text-white shadow-md'
                      : 'hover:bg-gray-100 dark:hover:bg-white/10'
                    }
          `}
                >
                  <p className={`text-[14px] sm:text-[16px] font-semibold ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-600 dark:text-slate-300'}`}>
                    Yearly Billing
                  </p>
                  {userProfile?.user_type !== 'beta' && (
                    <div className="rounded-full bg-white px-2 py-[2px]">
                      <span className="text-[10px] sm:text-[12px] font-bold uppercase bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] bg-clip-text text-transparent">
                        Save 20%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-10 max-w-[90%] sm:max-w-[700px] text-[16px] sm:text-[18px] leading-[26px] sm:leading-[28px] text-gray-600 dark:text-slate-400">
                VIDEOS: UGC · Ads · Promotional · Educational · Short-form ·
                Long-form IMAGES: Photoshoot · Lifestyle · Model · Infographic
              </p>
            </div>

            {/* GRID */}
            <div className="relative grid max-w-[1400px] mx-auto grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
              {/* BACKGROUND BLOB */}
              <div
                className="
          pointer-events-none absolute inset-1/2
          -translate-x-1/2 -translate-y-1/2
          w-[600px] h-[600px] rounded-full animate-pulse
          bg-[radial-gradient(circle,rgba(41,166,180,0.6)_0%,rgba(158,210,195,0.35)_50%,rgba(255,255,255,0.25)_70%)]
          dark:bg-[radial-gradient(circle,rgba(41,166,180,0.35)_0%,rgba(15,23,42,0.6)_60%,rgba(2,6,23,0.9)_100%)]
        "
              />

              {plans
                ?.filter((plan: any) => plan.type === billingCycle && !plan.name.toLowerCase().includes("top up"))
                .map((plan: any, index: number) => {
                  let priceToDisplay = plan.price;
                  if (plan.type === "yearly") {
                    if (userProfile?.user_type === 'beta' && plan.price_for_beta) {
                      // For beta users with a specific beta price, amortize THAT price
                      priceToDisplay = Math.round(plan.price_for_beta / 12);
                    } else {
                      // For standard users (or beta users without override), show the amortized yearly price
                      priceToDisplay = Math.round(plan.price / 12);
                    }
                  }

                  const isBetaUser = userProfile?.user_type === 'beta';
                  // Calculate effective yearly price for "Billed $X yearly" text
                  const effectiveYearlyPrice = (isBetaUser && plan.type === 'yearly' && plan.price_for_beta !== undefined && plan.price_for_beta !== null)
                    ? plan.price_for_beta
                    : plan.price;

                  const monthlyPriceStr = `$${priceToDisplay}`;

                  // Dynamic usage limits
                  let tokens = (userProfile?.user_type === 'beta' && plan.tokens_for_beta)
                    ? plan.tokens_for_beta
                    : plan.tokens;


                  // Define the period label for display
                  const periodLabel = billingCycle === 'yearly' ? '/ year' : '/ month';

                  // Fallback values if tokens are missing (should not happen if DB is correct)
                  const safeTokens = tokens || (plan.name.toLowerCase().includes("agency") ? 4500 : plan.name.toLowerCase().includes("scale") ? 1500 : 300);

                  const videoCount = Math.floor(safeTokens / 10);
                  const imageCount = safeTokens;

                  return (
                    <div
                      key={plan.name}
                      className={`
            relative z-10 flex flex-col rounded-2xl
            bg-white/80 border 
            backdrop-blur-xl shadow-lg transition-all
            hover:-translate-y-3 hover:shadow-xl

            dark:bg-white/5 dark:border-white/10
            dark:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]
            ${plan.name.toLowerCase().includes("scale") ? "border-teal-400 dark:border-teal-500 ring-1 ring-teal-400/50" : "border-white/60"}
          `}
                    >
                      {userProfile?.plan_id === plan.id && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg z-20">
                          Current Plan
                        </div>
                      )}
                      {plan.name.toLowerCase().includes("scale") && userProfile?.plan_id !== plan.id && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                          Most Popular
                        </div>
                      )}
                      {/* HEADER */}
                      <div
                        className="
              border-b px-6 py-6 md:px-8 text-center
              bg-gradient-to-b rounded-t-lg from-white to-gray-50
              dark:from-white/10 dark:to-transparent
              dark:border-white/10
            "
                      >
                        <h3 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] bg-clip-text text-transparent">
                          {plan.name}
                        </h3>
                        <div className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mt-4">
                          {monthlyPriceStr}{" "}
                          <span className="text-base md:text-lg font-medium text-gray-400 dark:text-slate-400">
                            / month
                          </span>
                        </div>
                        {billingCycle === "yearly" && (
                          <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
                            Billed ${effectiveYearlyPrice} yearly
                          </p>
                        )}
                      </div>

                      {/* BUTTON */}
                      <button
                        onClick={() => handleSubscribe(plan.id, plan.name, effectiveYearlyPrice)}
                        className="
              mx-6 md:mx-8 mt-5 rounded-full py-4 text-center text-sm
              font-bold uppercase tracking-wide text-white
              bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3]
              shadow-md transition hover:scale-[1.02] w-[calc(100%-3rem)] md:w-[calc(100%-4rem)]
            "
                      >
                        {userProfile?.plan_id === plan.id
                          ? "Current Plan"
                          : plan.name.toLowerCase().includes("start")
                            ? "Get Started"
                            : plan.name.toLowerCase().includes("scale")
                              ? "Choose Scale"
                              : plan.name.toLowerCase().includes("agency")
                                ? "Choose Agency"
                                : "Subscribe"}
                      </button>

                      {/* BODY */}
                      <div className="flex-1 px-6 py-6 md:px-8">
                        <p className="font-bold mb-4 text-gray-900 dark:text-white">
                          {plan.name} includes:
                        </p>
                        {plan.name.toLowerCase().includes("start") && (
                          <>
                            <ul className="space-y-4 text-sm md:text-base text-gray-600 dark:text-slate-300">
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{safeTokens.toLocaleString()} Tokens {periodLabel}</span>
                                  <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-[#29a6b4] transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white dark:bg-[#0f1115] text-gray-700 dark:text-slate-200 border-gray-200 dark:border-white/10 p-3 shadow-2xl rounded-xl"
                                    >
                                      <p className="text-xs font-medium">Unused tokens don't roll over to the next {billingCycle === 'yearly' ? 'year' : 'month'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </li>
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span>Up to {videoCount} videos{periodLabel} <span className="text-xs text-muted-foreground">(:12 second video)</span></span>
                                  <CreditUsageTooltip
                                    type="video"
                                    tier="Start"
                                    monthlyPrice={monthlyPriceStr}
                                    videoCount={videoCount}
                                    imageCount={imageCount}
                                  />
                                </div>
                              </li>
                              {/* <li className="flex gap-3 text-left">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <span>:12, :24, :48 second video options</span>
                              </li> */}
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span>Up to {imageCount} Free Images</span>
                                  <CreditUsageTooltip
                                    type="image"
                                    tier="Start"
                                    monthlyPrice={monthlyPriceStr}
                                    videoCount={videoCount}
                                    imageCount={imageCount}
                                  />
                                </div>
                              </li>
                              <li className="flex gap-3 text-left">
                                <span className="text-[#29a6b4] shrink-0 font-bold">
                                  <Info />
                                </span>
                                <span>Ideal for founders, solo operators, early launches</span>
                              </li>
                              <li className="flex gap-3 text-left">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <span>No contracts. Cancel anytime.</span>
                              </li>
                            </ul>

                            <div className="my-6 h-px bg-gray-200 dark:bg-white/10" />

                            {/* SAVINGS - START */}
                            <div className="relative rounded-xl border p-4 border-[#29a6b4] bg-[#8eccc024] dark:bg-[#29a6b410]">
                              <div className="absolute left-0 top-0 h-full w-1 bg-[#29a6b4]" />
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] md:text-xs font-extrabold uppercase text-[#29a6b4]">Monthly Savings</span>
                                <span className="text-lg md:text-xl font-extrabold text-[#29a6b4]">$7,400 <span className="text-[10px] md:text-xs">/mo</span></span>
                              </div>
                              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                                <strong className="dark:text-slate-200">Traditional Cost:</strong> 30 UGC videos × $250
                                <br />= $7,500/ month
                                <br /><span className="text-xs text-muted-foreground italic">paid to affiliates & creators</span>
                              </p>
                            </div>
                          </>
                        )}

                        {plan.name.toLowerCase().includes("scale") && (
                          <>
                            <ul className="space-y-4 text-sm md:text-base text-gray-600 dark:text-slate-300">
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{safeTokens.toLocaleString()} Tokens {periodLabel}</span>
                                  <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-[#29a6b4] transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white dark:bg-[#0f1115] text-gray-700 dark:text-slate-200 border-gray-200 dark:border-white/10 p-3 shadow-2xl rounded-xl"
                                    >
                                      <p className="text-xs font-medium">Unused tokens don't roll over to the next {billingCycle === 'yearly' ? 'year' : 'month'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </li>
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span>Up to {videoCount} videos{periodLabel} <span className="text-xs text-muted-foreground">(:12 second video)</span></span>
                                  <CreditUsageTooltip
                                    type="video"
                                    tier="Scale"
                                    monthlyPrice={monthlyPriceStr}
                                    videoCount={videoCount}
                                    imageCount={imageCount}
                                  />
                                </div>
                              </li>
                              {/* <li className="flex gap-3 text-left">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <span>:12, :24, :48 second video options</span>
                              </li> */}
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span>Up to {imageCount} Free Images</span>
                                  <CreditUsageTooltip
                                    type="image"
                                    tier="Scale"
                                    monthlyPrice={monthlyPriceStr}
                                    videoCount={videoCount}
                                    imageCount={imageCount}
                                  />
                                </div>
                              </li>
                              <li className="flex gap-3 text-left">
                                <span className="text-[#29a6b4] shrink-0 font-bold">
                                  <Info />
                                </span>
                                <span>Built for scaling DTC brands and product teams</span>
                              </li>
                              <li className="flex gap-3 text-left">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <span>Consistent daily content across social & ads</span>
                              </li>
                            </ul>

                            <div className="my-6 h-px bg-gray-200 dark:bg-white/10" />

                            {/* SAVINGS - SCALE */}
                            <div className="relative rounded-xl border p-4 border-[#29a6b4] bg-[#8eccc024] dark:bg-[#29a6b410]">
                              <div className="absolute left-0 top-0 h-full w-1 bg-[#29a6b4]" />
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] md:text-xs font-extrabold uppercase text-[#29a6b4]">Monthly Savings</span>
                                <span className="text-lg md:text-xl font-extrabold text-[#29a6b4]">$37,000 <span className="text-[10px] md:text-xs">/mo</span></span>
                              </div>
                              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                                <strong className="dark:text-slate-200">Traditional Cost:</strong> 150 UGC videos × $250
                                <br />= $37,500/ month
                                <br /><span className="text-xs text-muted-foreground italic">paid to affiliates & creators</span>
                              </p>
                            </div>
                          </>
                        )}

                        {plan.name.toLowerCase().includes("agency") && (
                          <>
                            <ul className="space-y-4 text-sm md:text-base text-gray-600 dark:text-slate-300">
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{safeTokens.toLocaleString()} Tokens {periodLabel}</span>
                                  <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-[#29a6b4] transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white dark:bg-[#0f1115] text-gray-700 dark:text-slate-200 border-gray-200 dark:border-white/10 p-3 shadow-2xl rounded-xl"
                                    >
                                      <p className="text-xs font-medium">Unused tokens don't roll over to the next {billingCycle === 'yearly' ? 'year' : 'month'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </li>
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span>Up to {videoCount} videos{periodLabel} <span className="text-xs text-muted-foreground">(:12 second video)</span></span>
                                  <CreditUsageTooltip
                                    type="video"
                                    tier="Agency"
                                    monthlyPrice={monthlyPriceStr}
                                    videoCount={videoCount}
                                    imageCount={imageCount}
                                  />
                                </div>
                              </li>
                              {/* <li className="flex gap-3 text-left">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <span>:12, :24, :48 second video options</span>
                              </li> */}
                              <li className="flex gap-3 text-left items-center">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span>Up to {imageCount} Free Images</span>
                                  <CreditUsageTooltip
                                    type="image"
                                    tier="Agency"
                                    monthlyPrice={monthlyPriceStr}
                                    videoCount={videoCount}
                                    imageCount={imageCount}
                                  />
                                </div>
                              </li>
                              <li className="flex gap-3 text-left">
                                <span className="text-[#29a6b4] shrink-0 font-bold">
                                  <Info />
                                </span>
                                <span>Designed for agencies & in-house brand teams</span>
                              </li>
                              <li className="flex gap-3 text-left">
                                <Check className="h-5 w-5 text-[#29a6b4] shrink-0" />
                                <span>Serve multiple clients without adding headcount</span>
                              </li>
                            </ul>

                            <div className="my-6 h-px bg-gray-200 dark:bg-white/10" />

                            {/* SAVINGS - AGENCY */}
                            <div className="relative rounded-xl border p-4 border-[#29a6b4] bg-[#8eccc024] dark:bg-[#29a6b410]">
                              <div className="absolute left-0 top-0 h-full w-1 bg-[#29a6b4]" />
                              <div className="flex flex-col mb-2">
                                <span className="text-[10px] md:text-xs font-extrabold uppercase text-[#29a6b4]">Monthly Savings</span>
                                <span className="text-lg md:text-xl font-extrabold text-[#29a6b4] leading-tight">$20K–111K <span className="text-[10px] md:text-xs">/mo</span></span>
                                <span className="text-[10px] text-muted-foreground">depending on approach</span>
                              </div>
                              <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 space-y-2">
                                <div>
                                  <strong className="dark:text-slate-200">Traditional Cost:</strong>
                                </div>
                                <div className="pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                  <strong>Option A — Outsourcing:</strong><br />
                                  450 videos × $250 = $112,500/mo
                                </div>
                                <div className="pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                  <strong>Option B — In-house:</strong><br />
                                  - 2 video editors (~$11,600/mo)<br />
                                  - 2 UGC creators (~$10,000/mo)<br />
                                  = ~$21,600/ month
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {selectedPlanForPayment && (
            <PaymentDetailsDialog
              isOpen={paymentModalOpen}
              onClose={() => setPaymentModalOpen(false)}
              planId={selectedPlanForPayment.id}
              planName={selectedPlanForPayment.name}
              price={selectedPlanForPayment.price}
              onConfirm={handlePaymentConfirm}
            />
          )}
          <ScaleSuggestionModal
            isOpen={showScaleSuggestion}
            onClose={handleDismissSuggestion}
            onUpgrade={handleUpgradeToScale}
          />
        </div>
      </div >
    </>
  );
};

export default Pricing;
