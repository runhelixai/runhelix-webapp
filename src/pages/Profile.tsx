import { useAuth } from "@/lib/auth";
import { getPlanDetails, getPaymentHistory } from "@/services/api";
import AppHeader from "@/components/layout/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreditCard, Clock, CheckCircle2, User, Mail, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

// Mock data for billing history until API is available
// Mock data for billing history removed - using real API data
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentDetailsDialog } from "@/components/PaymentDetailsDialog";
import { Plus } from "lucide-react";

const Profile = () => {
    const { user, userProfile } = useAuth();

    // Calculate tokens
    const usedTokens = Number(userProfile?.exhaust_token || 0);
    const totalTokens = Number(userProfile?.purchase_token || 0);
    const remainingVideos = Math.max(0, Math.floor((totalTokens - usedTokens) / 10));
    const remainingImages = Math.max(0, Math.floor(totalTokens - usedTokens));

    const usagePercentage = totalTokens > 0 ? (usedTokens / totalTokens) * 100 : 0;
    const remainingPercentage = 100 - usagePercentage;
    const [currentPlanName, setCurrentPlanName] = useState<string>("Free Plan");
    const [billingHistory, setBillingHistory] = useState<any[]>([]);
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Top Up State
    const [isTopUpDetailsOpen, setIsTopUpDetailsOpen] = useState(false);
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [topUpPlan, setTopUpPlan] = useState<any>(null);

    const handleTopUpConfirm = (transId: string) => {
        console.log(`[Profile] Top Up Payment confirmed. Transaction ID: ${transId}`);
        window.location.href = `/payment-success?transId=${transId}`;
    };

    useEffect(() => {
        const fetchProfileData = async () => {
            // Always fetch plans for history mapping
            try {
                const plans = await getPlanDetails();
                setAllPlans(plans || []);

                // Set current plan name logic
                if (userProfile?.plan_id) {
                    const matchedPlan = plans?.find((p: any) => p.id === userProfile.plan_id);
                    if (matchedPlan) {
                        setCurrentPlanName(matchedPlan.name);
                    } else {
                        setCurrentPlanName(userProfile.user_type || "Free Plan");
                    }
                } else if (userProfile?.user_type) {
                    setCurrentPlanName(userProfile.user_type);
                }

                // Find Top Up Plan
                const foundTopUpPlan = plans?.find((p: any) => p.name.toLowerCase().includes("top up"));
                if (foundTopUpPlan) {
                    setTopUpPlan(foundTopUpPlan);
                }
            } catch (error) {
                console.error("Failed to fetch plan details:", error);
                setCurrentPlanName(userProfile?.user_type || "Free Plan");
            }

            // Fetch Billing History
            if (user?.id) {
                try {
                    const payments = await getPaymentHistory(user?.id);
                    setBillingHistory(payments);
                } catch (error) {
                    console.error("Failed to fetch payment history:", error);
                }
            }
        };

        fetchProfileData();
    }, [user, userProfile]);

    const planName = currentPlanName;

    const joinDate = user?.created_at ? format(new Date(user.created_at), "MMMM d, yyyy") : "-";

    const totalPages = Math.ceil(billingHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = billingHistory.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
            {/* Background Effects matching Dashboard */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="bg-[url('/assets/images/banner-img.png')] bg-animation-keyframe dark:bg-[url('/assets/images/dark-mode.png')] absolute bottom-0 left-0 w-full bg-cover bg-center h-full opacity-20 dark:opacity-10"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#29A6B4]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-1000"></div>
            </div>

            <AppHeader className="relative z-10" />

            <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl space-y-8">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] bg-clip-text text-transparent w-fit">
                        Account Settings
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">Manage your profile, subscription, and billing details.</p>
                </div>

                <div className="grid gap-4 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {/* User Profile Card */}
                    <div className="md:col-span-1">
                        <Card className="h-full border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#111213]/50 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3]"></div>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#29A6B4] to-[#9ED2C3] p-[2px]">
                                        <div className="h-full w-full rounded-full bg-white dark:bg-[#111213] flex items-center justify-center overflow-hidden">
                                            <User className="h-5 w-5 text-[#29A6B4]" />
                                        </div>
                                    </div>
                                    Profile Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</span>
                                    <div className="font-medium text-lg">{user?.user_metadata?.full_name || user?.user_metadata?.user_name || "User"}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</span>
                                    <div className="font-medium flex items-center gap-2 text-sm md:text-base break-all">
                                        <Mail className="w-4 h-4 text-[#29A6B4]" />
                                        {user?.email}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member Since</span>
                                    <div className="font-medium flex items-center gap-2 text-sm md:text-base">
                                        <Calendar className="w-4 h-4 text-[#29A6B4]" />
                                        {joinDate}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Subscription & Credits Card */}
                    <div className="md:col-span-1 lg:col-span-2">
                        <Card className="h-full border-0 relative overflow-hidden text-white shadow-xl">
                            {/* Card Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a] dark:from-[#111213] dark:to-[#000000] z-0"></div>
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,107,158,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-shine pointer-events-none z-0"></div>
                            {/* Decorative Circles */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#29A6B4]/20 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

                            <CardHeader className="relative z-10 border-b border-white/10">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <CardTitle className="flex items-center gap-2 text-white text-lg md:text-xl">
                                        <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-[#29A6B4]" />
                                        Subscription & Usage
                                    </CardTitle>

                                    <div className="flex items-center gap-3">
                                        {userProfile?.plan_id && (
                                            <button
                                                onClick={() => setIsTopUpDetailsOpen(true)}
                                                className="relative overflow-hidden group px-4 py-1.5 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
                                            >
                                                <Plus className="w-3.5 h-3.5 text-[#29A6B4]" />
                                                <span className="text-xs font-bold bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] bg-clip-text text-transparent uppercase tracking-wide">
                                                    Purchase Tokens
                                                </span>
                                            </button>
                                        )}

                                        <Badge variant="secondary" className="w-fit px-2 py-0.5 md:px-3 md:py-1 uppercase text-[10px] md:text-xs font-bold tracking-widest bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] text-white border-0 shadow-lg">
                                            {planName}
                                        </Badge>
                                    </div>
                                </div>

                            </CardHeader>
                            <CardContent className="relative z-10 space-y-6 md:space-y-8 pt-4 md:pt-6">
                                <div className="grid gap-6 md:gap-8 sm:grid-cols-2">
                                    {/* Video Credits */}
                                    <div className="space-y-3 group">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-medium text-gray-300">Video Remaining</span>
                                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200 group-hover:scale-105 transition-transform">{remainingVideos}</span>
                                        </div>
                                        <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 ease-out"
                                                style={{ width: `${remainingPercentage}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400">Approx. {remainingVideos} generations remaining</p>
                                    </div>

                                    {/* Image Credits */}
                                    <div className="space-y-3 group">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-medium text-gray-300">Image Remaining</span>
                                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-200 group-hover:scale-105 transition-transform">{remainingImages}</span>
                                        </div>
                                        <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out"
                                                style={{ width: `${remainingPercentage}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400">Approx. {remainingImages} generations remaining</p>
                                    </div>
                                </div>
                                {(() => {
                                    return null;
                                })()}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Billing History */}
                <Card className="border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#111213]/50 backdrop-blur-md shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#29A6B4]/10">
                                <Clock className="w-5 h-5 text-[#29A6B4]" />
                            </div>
                            Billing History
                        </CardTitle>
                        <CardDescription>View your past transactions and invoices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white/50 dark:bg-black/20">
                            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-gray-50/80 dark:bg-gray-900/50 text-muted-foreground font-medium">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Plan</th>
                                            <th className="px-6 py-4">Transaction ID</th>
                                            <th className="px-6 py-4">Tokens</th>
                                            <th className="px-6 py-4">Expiry Date</th>
                                            <th className="px-6 py-4">Payment Method</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {paginatedHistory.length > 0 ? (
                                            paginatedHistory.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4">{format(new Date(item.created_at), "MMM d, yyyy")}</td>
                                                    <td className="px-6 py-4 font-medium">
                                                        {(() => {
                                                            const planName = allPlans.find((p: any) => p.id === item.plan_id)?.name || "-";
                                                            const lowerName = planName.toLowerCase();
                                                            let badgeStyles = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";

                                                            if (lowerName.includes("start")) {
                                                                badgeStyles = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
                                                            } else if (lowerName.includes("scale")) {
                                                                badgeStyles = "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800";
                                                            } else if (lowerName.includes("agency")) {
                                                                badgeStyles = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800";
                                                            }

                                                            return (
                                                                <Badge variant="outline" className={`px-2.5 py-0.5 border ${badgeStyles}`}>
                                                                    {planName}
                                                                </Badge>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs">{item.transaction_id || "-"}</td>
                                                    <td className="px-6 py-4 font-medium">
                                                        {(() => {
                                                            const plan = allPlans.find((p: any) => p.id === item.plan_id);
                                                            if (!plan) return "-";
                                                            const tokens = userProfile?.user_type === 'beta' && plan.tokens_for_beta
                                                                ? plan.tokens_for_beta
                                                                : plan.tokens;
                                                            return tokens ? Number(tokens).toLocaleString() : "-";
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs text-red-500">
                                                        {(() => {
                                                            const planName = allPlans.find((p: any) => p.id === item.plan_id)?.name || "-";
                                                            // For Top Up, as per screenshot and typically known behavior assuming 30 days but let's check plan type if possible or just use a standard rule.
                                                            // The user screenshot showed "Top Up" having an expiry date.
                                                            // Let's reuse the logic: monthly -> +1 month, yearly -> +1 year.
                                                            // If it's a Top Up (usually one-time), the screenshot implies it has an expiry. The dialog says "Valid for 30 days".

                                                            const plan = allPlans.find((p: any) => p.id === item.plan_id);
                                                            if (!plan) return "-";

                                                            const paymentDate = new Date(item.created_at);
                                                            const expiryDate = new Date(paymentDate);

                                                            if (plan.type === 'monthly') {
                                                                expiryDate.setMonth(expiryDate.getMonth() + 1);
                                                            } else if (plan.type === 'yearly') {
                                                                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                                                            } else if (plan.name.toLowerCase().includes("top up")) {
                                                                // Assuming Top Ups are 30 days as per dialog text
                                                                expiryDate.setDate(expiryDate.getDate() + 30);
                                                            } else {
                                                                return "-";
                                                            }

                                                            return format(expiryDate, "d MMM yyyy");
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                                                            <span>{item.account_type} {item.account_number}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">${item.amount}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge
                                                            variant="outline"
                                                            className={`px-2 py-0.5 rounded-full border ${item.response_code === "1"
                                                                ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/20"
                                                                : "text-red-600 border-red-200 bg-red-50 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20"
                                                                }`}
                                                        >
                                                            {item.response_code === "1" ? "Paid" : "Failed"}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                                    No billing history found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, billingHistory.length)} of {billingHistory.length} results
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-medium">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main >

            <Dialog open={isTopUpDetailsOpen} onOpenChange={setIsTopUpDetailsOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
                    <div className="flex flex-col gap-4 py-4">
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold text-foreground">Credit Top Up</h2>
                            <p className="text-muted-foreground">Add more tokens to your account.</p>
                        </div>

                        <div className="bg-muted/30 p-6 rounded-xl border border-border/50 flex flex-col items-center gap-3 text-center">
                            <span className="text-4xl font-bold text-primary">
                                {topUpPlan?.tokens ? Number(topUpPlan.tokens).toLocaleString() : "1,000"}
                            </span>
                            <span className="font-medium text-foreground">Tokens</span>
                            <div className="h-px w-full bg-border/50 my-1" />
                            <span className="text-sm text-muted-foreground">
                                Valid for 30 days. <br /> Unused tokens expire.
                            </span>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => {
                                    setIsTopUpDetailsOpen(false);
                                    setIsTopUpModalOpen(true);
                                }}
                                className="w-full bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] hover:from-[#29A6B4]/90 hover:to-[#9ED2C3]/90 text-white font-bold h-11"
                            >
                                Purchase for ${topUpPlan?.price || "99"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <PaymentDetailsDialog
                isOpen={isTopUpModalOpen}
                onClose={() => setIsTopUpModalOpen(false)}
                planId={topUpPlan?.id || 'top-up-99'}
                planName={topUpPlan?.name || "Credit Top Up"}
                price={topUpPlan?.price || "99"}
                onConfirm={handleTopUpConfirm}
                description={
                    <div className="flex flex-col gap-1 items-center">
                        <span className="text-primary font-bold text-lg">{topUpPlan?.tokens ? Number(topUpPlan.tokens).toLocaleString() : "1,000"} Tokens</span>
                        <span className="text-sm text-muted-foreground">Valid for 30 days.</span>
                    </div>
                }
            />
        </div >
    );
};

export default Profile;
