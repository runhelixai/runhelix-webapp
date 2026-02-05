import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Home, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import logo from "../../public/assets/images/logo.png";
import lightlogo from "../../public/assets/images/light-logo.png";
import { getTransactionDetails } from "@/services/paymentService";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { theme } = useTheme();
    const { userProfile, refreshProfile } = useAuth(); // Destructure required values
    const [showModal, setShowModal] = useState(true);
    const transactionId = searchParams.get("transId");
    const [loading, setLoading] = useState(true);
    const [transactionDetails, setTransactionDetails] = useState(null);

    useEffect(() => {
        console.log("[PaymentSuccess] Mounted. Transaction ID:", transactionId);
        // Redirect to home if no transaction ID
        if (!transactionId) {
            console.log("[PaymentSuccess] No transaction ID found. Redirecting to /generate");
            navigate("/generate");
            return;
        }

        console.log("[PaymentSuccess] Fetching details for transaction:", transactionId);
        getTransactionDetails(transactionId)
            .then(async (response) => {
                console.log("[PaymentSuccess] Transaction details fetched:", response);
                setTransactionDetails(response);
                setLoading(false);

                // Identify the user: prefer logged-in user, fallback to email lookup
                let targetUserId = userProfile?.id;
                let targetUserType = userProfile?.user_type;

                if (!targetUserId && response?.customer_email) {
                    const { data: userData } = await supabase
                        .from("users")
                        .select("id, user_type")
                        .eq("email", response.customer_email)
                        .single();
                    if (userData) {
                        targetUserId = userData.id;
                        targetUserType = userData.user_type;
                    }
                }

                if (targetUserId) {
                    // Update email_drip_status
                    // Update or Insert email_drip_status
                    supabase
                        .from("email_drip_status")
                        .update({ plan_purchased: true })
                        .eq("user_id", targetUserId)
                        .select()
                        .then(async ({ data, error }) => {
                            if (error) {
                                console.error("Error updating drip status:", error);
                            } else if (!data || data.length === 0) {
                                // If no row updated, insert one
                                console.log("No dip status found, creating one.");
                                const { error: insertError } = await supabase
                                    .from("email_drip_status")
                                    .insert({
                                        user_id: targetUserId,
                                        plan_purchased: true
                                    });
                                if (insertError) console.error("Error inserting drip status:", insertError);
                            }
                        });

                    // Update tokens for Beta users (and now general logic for rollover)
                    if (targetUserType === 'beta') {
                        console.log("[PaymentSuccess] User is beta, checking for token adjustment...");
                        const planId = response?.plan_id || response?.plan?.id;

                        if (planId) {
                            if (planId === 'top-up-99') {
                                console.log("[PaymentSuccess] Handling Top Up Plan...");

                                const { data: currentUserData, error: userFetchError } = await supabase
                                    .from('users')
                                    .select('purchase_token, rollover_token')
                                    .eq('id', targetUserId)
                                    .single();

                                if (!userFetchError && currentUserData) {
                                    const tokenAmount = 1000;
                                    const newTotalTokens = (currentUserData.purchase_token || 0) + tokenAmount;
                                    const newRolloverTokens = (currentUserData.rollover_token || 0) + tokenAmount;

                                    // Set expiry to 30 days from now
                                    const expiryDate = new Date();
                                    expiryDate.setDate(expiryDate.getDate() + 30);
                                    const rolloverExpiry = expiryDate.toISOString();

                                    const updates = {
                                        purchase_token: newTotalTokens,
                                        rollover_token: newRolloverTokens,
                                        rollover_expiry: rolloverExpiry
                                    };

                                    console.log(`[PaymentSuccess] Top Up: Adding ${tokenAmount} tokens. New Total: ${newTotalTokens}. Expiry: ${rolloverExpiry}`);

                                    const { error: tokenError } = await supabase
                                        .from('users')
                                        .update(updates)
                                        .eq('id', targetUserId);

                                    if (tokenError) {
                                        console.error("[PaymentSuccess] Error updating top-up tokens:", tokenError);
                                    } else {
                                        console.log("[PaymentSuccess] Top-up tokens updated successfully.");
                                        if (userProfile?.id === targetUserId) refreshProfile();
                                    }
                                }
                            } else {
                                const { data: planData, error: planError } = await supabase
                                    .from('plan')
                                    .select('tokens_for_beta, tokens, type')
                                    .eq('id', planId)
                                    .single();

                                if (planError) {
                                    console.error("[PaymentSuccess] Error fetching plan details:", planError);
                                } else {
                                    // Fallback to standard tokens if tokens_for_beta is 0 or null
                                    const tokenAmount = planData.tokens_for_beta || planData.tokens;

                                    if (tokenAmount) {
                                        console.log(`[PaymentSuccess] Updating beta user tokens to ${tokenAmount}`);

                                        // Rollover Logic
                                        // 1. Fetch current user state BEFORE update
                                        const { data: currentUserData, error: userFetchError } = await supabase
                                            .from('users')
                                            .select('purchase_token, exhaust_token')
                                            .eq('id', targetUserId)
                                            .single();

                                        let rolloverExpiry = null;

                                        if (!userFetchError && currentUserData) {
                                            // 2. Determine Expiry based on PREVIOUS plan
                                            // Fetch payment history to find the PREVIOUS success payment
                                            const { data: payments } = await supabase
                                                .from('payments')
                                                .select('created_at, plan_id, response_code, transaction_id')
                                                .eq('user_id', targetUserId)
                                                .eq('response_code', '1') // valid payments
                                                .neq('transaction_id', transactionId) // exclude current one if present
                                                .order('created_at', { ascending: false })
                                                .limit(1);

                                            if (payments && payments.length > 0) {
                                                const prevPayment = payments[0];
                                                const prevPaymentDate = new Date(prevPayment.created_at);

                                                // Fetch previous plan type to know duration
                                                const { data: prevPlan } = await supabase
                                                    .from('plan')
                                                    .select('type')
                                                    .eq('id', prevPayment.plan_id)
                                                    .single();

                                                if (prevPlan) {
                                                    const expiryDate = new Date(prevPaymentDate);
                                                    if (prevPlan.type === 'yearly') {
                                                        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                                                    } else {
                                                        // Default to monthly for 'monthly' or any other type
                                                        expiryDate.setMonth(expiryDate.getMonth() + 1);
                                                    }
                                                    rolloverExpiry = expiryDate.toISOString();
                                                    console.log(`[PaymentSuccess] Calculated rollover expiry: ${rolloverExpiry}`);
                                                }
                                            } else {
                                                // No previous payment found, but tokens exist? 
                                                // Maybe manual grant or something. 
                                                // If we can't determine strict expiry, maybe default to 1 month from NOW?
                                                // Or just don't set expiry? 
                                                // For now, let's default to 30 days from now if we can't find history, purely as a fallback to avoid infinite tokens.
                                                const fallbackDate = new Date();
                                                fallbackDate.setDate(fallbackDate.getDate() + 30);
                                                rolloverExpiry = fallbackDate.toISOString();
                                                console.log(`[PaymentSuccess] No previous payment found. Defaulting rollover expiry to 30 days: ${rolloverExpiry}`);
                                            }
                                        }

                                        // NEW LOGIC: Stack tokens. 
                                        // newTotal = oldTotal + newAmount
                                        // rolloverToken = oldTotal (mark the boundary of what might expire)
                                        // Do NOT reset exhaust_token.
                                        if (!currentUserData) {
                                            console.error("[PaymentSuccess] Failed to fetch current user tokens. Aborting to prevent replacement.");
                                            return;
                                        }
                                        const currentPurchaseToken = currentUserData.purchase_token || 0;
                                        const newTotalTokens = currentPurchaseToken + tokenAmount;

                                        const updates: any = {
                                            purchase_token: newTotalTokens,
                                            // exhaust_token: 0, // REMOVED: Do not reset usage
                                            rollover_token: currentPurchaseToken, // The entire previous balance is the "rollover" baseline
                                            rollover_expiry: rolloverExpiry
                                        };

                                        const { error: tokenError } = await supabase
                                            .from('users')
                                            .update(updates)
                                            .eq('id', targetUserId);

                                        if (tokenError) {
                                            console.error("[PaymentSuccess] Error updating beta tokens:", tokenError);
                                        } else {
                                            console.log("[PaymentSuccess] Beta tokens updated successfully.", updates);
                                            if (userProfile?.id === targetUserId) {
                                                refreshProfile(); // Refresh UI immediately if it's the current user
                                            }
                                        }
                                    } else {
                                        console.log("[PaymentSuccess] No tokens found for this plan.");
                                    }
                                }
                            }
                        } else {
                            console.warn("[PaymentSuccess] Could not find plan ID in transaction details");
                        }
                    }
                }
            })
            .catch(error => {
                console.error('[PaymentSuccess] Failed to fetch transaction details:', error);
                setLoading(false);
                navigate("/generate")
            });
    }, [transactionId, navigate, userProfile, refreshProfile]);

    const handleGoHome = () => {
        setShowModal(false);
        setTimeout(() => navigate("/generate"), 300);
    };

    return (
        <div className="min-h-screen dark:bg-[#0F0F0F] bg-white relative overflow-hidden flex items-center justify-center">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px]" />
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={handleGoHome}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 30 }}
                            transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
                            className="relative w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Success Card */}
                            <div className="relative bg-gradient-to-b from-card to-background/95 border border-border/50 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                {/* Top accent bar with gradient animation */}
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 animate-gradient-x" />

                                {/* Decorative elements */}
                                <div className="absolute top-10 right-10 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
                                <div className="absolute bottom-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />

                                <div className="relative p-8 space-y-6">
                                    {/* Logo */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="flex justify-center"
                                    >
                                        <img
                                            src={theme === 'dark' ? logo : lightlogo}
                                            alt="Run Helix"
                                            className="h-8 w-auto object-contain"
                                        />
                                    </motion.div>

                                    {loading ? (
                                        // Loading State
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex flex-col items-center justify-center py-12 space-y-4"
                                        >
                                            <div className="relative">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{
                                                        duration: 1,
                                                        repeat: Infinity,
                                                        ease: "linear",
                                                    }}
                                                >
                                                    <Loader2 className="w-16 h-16 text-primary" />
                                                </motion.div>
                                                <motion.div
                                                    animate={{
                                                        scale: [1, 1.2, 1],
                                                        opacity: [0.3, 0.6, 0.3],
                                                    }}
                                                    transition={{
                                                        duration: 2,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                    }}
                                                    className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                                                />
                                            </div>
                                            <p className="text-muted-foreground text-base">Processing your payment...</p>
                                        </motion.div>
                                    ) : (
                                        // Success State
                                        <>
                                            {/* Success Icon with Animation */}
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                                                className="flex justify-center"
                                            >
                                                <div className="relative">
                                                    {/* Pulsing background glow */}
                                                    <motion.div
                                                        animate={{
                                                            scale: [1, 1.3, 1],
                                                            opacity: [0.3, 0.6, 0.3],
                                                        }}
                                                        transition={{
                                                            duration: 2,
                                                            repeat: Infinity,
                                                            ease: "easeInOut",
                                                        }}
                                                        className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl"
                                                    />

                                                    {/* Rotating ring */}
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{
                                                            duration: 3,
                                                            repeat: Infinity,
                                                            ease: "linear",
                                                        }}
                                                        className="absolute inset-0 flex items-center justify-center"
                                                    >
                                                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-green-500/30" />
                                                    </motion.div>

                                                    {/* Success icon */}
                                                    <div className="relative z-10 bg-green-500/10 rounded-full p-4 border border-green-500/20">
                                                        <CheckCircle2 className="w-16 h-16 text-green-500" strokeWidth={1.5} />
                                                    </div>

                                                    {/* Sparkles */}
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: 0.5 }}
                                                        className="absolute -top-2 -right-2"
                                                    >
                                                        <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                                    </motion.div>
                                                </div>
                                            </motion.div>

                                            {/* Success Message */}
                                            <div className="text-center space-y-2">
                                                <motion.h2
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.3 }}
                                                    className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent"
                                                >
                                                    Payment Successful!
                                                </motion.h2>
                                                <motion.p
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.4 }}
                                                    className="text-muted-foreground text-base"
                                                >
                                                    Your subscription has been activated successfully
                                                </motion.p>
                                            </div>

                                            {/* Transaction ID */}
                                            {transactionId && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.5 }}
                                                    className="relative overflow-hidden bg-muted/50 rounded-xl p-4 border border-border/30"
                                                >
                                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 to-transparent" />
                                                    <div className="relative">
                                                        <p className="text-xs text-muted-foreground text-center mb-1 font-medium">
                                                            Transaction ID
                                                        </p>
                                                        <p className="text-sm font-mono text-foreground text-center break-all bg-background/50 rounded-lg px-3 py-2">
                                                            {transactionId}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Action Buttons */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6 }}
                                                className="space-y-3 pt-2"
                                            >
                                                <Button
                                                    onClick={handleGoHome}
                                                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg shadow-primary/25 transition-all group relative overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                                    <Home className="w-5 h-5 mr-2 relative z-10" />
                                                    <span className="relative z-10">Go to Home</span>
                                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform relative z-10" />
                                                </Button>
                                            </motion.div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PaymentSuccess;
