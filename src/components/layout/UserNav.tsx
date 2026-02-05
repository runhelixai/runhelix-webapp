import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import { CircleUserRound, List, DiamondPercent, LogOut, Clapperboard, Image, User, Home, Coins } from "lucide-react";
import MobileUserMenu from "@/components/MobileUserMenu";
import { useState, useEffect, useRef, useCallback } from "react";
import { getPlanDetails } from "@/services/api";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { supabase } from "@/lib/supabase";
import { PaymentDetailsDialog } from "@/components/PaymentDetailsDialog";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UserNavProps {
    className?: string;
    onProductClick?: () => void; // Optional: fallback if setProductDrawerView not provided
    setIsProductDrawerOpen?: (open: boolean) => void;
    setProductDrawerView?: (view: "list" | "add") => void;
    setIsLogoutDialogOpen?: (open: boolean) => void;
    isMobileMenuOpen?: boolean;
    setIsMobileMenuOpen?: (open: boolean) => void;
}

const UserNav = ({
    className = "",
    setIsProductDrawerOpen,
    setProductDrawerView,
    setIsLogoutDialogOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen
}: UserNavProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userProfile, signOut, refreshProfile } = useAuth();

    const isMobile = useIsMobile();

    // Internal state if props are not provided (fallback for pages like Pricing)
    const [localIsProductDrawerOpen, setLocalIsProductDrawerOpen] = useState(false);
    const [localProductDrawerView, setLocalProductDrawerView] = useState<"list" | "add">("list");
    const [localIsLogoutDialogOpen, setLocalIsLogoutDialogOpen] = useState(false);
    const [localIsMobileMenuOpen, setLocalIsMobileMenuOpen] = useState(false);

    // Use props or local state
    const handleSetIsProductDrawerOpen = setIsProductDrawerOpen || setLocalIsProductDrawerOpen;
    const handleSetProductDrawerView = setProductDrawerView || setLocalProductDrawerView;
    const handleSetIsLogoutDialogOpen = setIsLogoutDialogOpen || setLocalIsLogoutDialogOpen;

    const [currentPlanName, setCurrentPlanName] = useState<string>("Free Plan");
    const [isTopUpDetailsOpen, setIsTopUpDetailsOpen] = useState(false);
    const [isTopUpPaymentOpen, setIsTopUpPaymentOpen] = useState(false);
    const [topUpPlan, setTopUpPlan] = useState<any>("top-up");
    // Logic for Plan Name & Credits
    const usedTokens = Number(userProfile?.exhaust_token || 0);
    // Always use the profile's purchase_token as the source of truth.
    // This allows for "stacking" plans (e.g. 550 + 1000 = 1550) without the UI reverting to the static plan limit (550).
    const totalTokens = Number(userProfile?.purchase_token || 0);

    const remainingVideos = Math.max(0, Math.floor((totalTokens - usedTokens) / 10));
    const remainingImages = Math.max(0, Math.floor(totalTokens - usedTokens));
    const remainingTokens = Math.max(0, Math.floor(totalTokens - usedTokens));

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const hasAutoOpened = useRef(false);

    // Auto-open if not seen yet
    useEffect(() => {
        const hasSeen = userProfile?.has_seen_tokens === true || userProfile?.has_seen_tokens === "true";
        
        if (user && userProfile && !hasSeen && !hasAutoOpened.current) {
            const timer = setTimeout(() => {
                setIsPopoverOpen(true);
                hasAutoOpened.current = true;
                // Mark as seen so it doesn't open again next session
                window.dispatchEvent(new Event('mark-tokens-seen'));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, userProfile, userProfile?.has_seen_tokens]);

    const handleOpenChange = useCallback((open: boolean) => {
        setIsPopoverOpen(open);
    }, []);

    // Listen for events
    useEffect(() => {
        const handleClosePopover = () => {
            if (isPopoverOpen) setIsPopoverOpen(false);
        };
        const handleOpenPopover = () => {
            if (!isPopoverOpen) setIsPopoverOpen(true);
        };

        const handleMarkSeen = async () => {
            if (user && userProfile?.has_seen_tokens !== true) {
                try {
                    await supabase.from('users').update({ has_seen_tokens: true }).eq('id', user.id);
                    refreshProfile();
                } catch (err) {
                    console.error("Failed to mark tokens as seen:", err);
                }
            }
        };

        window.addEventListener('close-token-popover', handleClosePopover);
        window.addEventListener('open-token-popover', handleOpenPopover);
        window.addEventListener('mark-tokens-seen', handleMarkSeen);

        return () => {
            window.removeEventListener('close-token-popover', handleClosePopover);
            window.removeEventListener('open-token-popover', handleOpenPopover);
            window.removeEventListener('mark-tokens-seen', handleMarkSeen);
        };
    }, [isPopoverOpen, user, userProfile, refreshProfile]);

    useEffect(() => {
        const fetchPlanDetailsAndName = async () => {
            try {
                // Always fetch plans to get Top Up details
                const plans = await getPlanDetails();
                console.log("[UserNav] Fetched plans:", plans);

                // Find Top Up Plan
                const foundTopUp = plans?.find((p: any) => p.name.toLowerCase().includes("top up"));
                console.log("[UserNav] Found Top Up plan:", foundTopUp);
                if (foundTopUp) setTopUpPlan(foundTopUp);

                // Determine Current Plan Name
                if (userProfile?.plan_id) {
                    const matchedPlan = plans?.find((p: any) => p.id === userProfile.plan_id);
                    if (matchedPlan) {
                        setCurrentPlanName(matchedPlan.name);
                    } else {
                        setCurrentPlanName(userProfile?.user_type || "Free Plan");
                    }
                } else if (userProfile?.user_type) {
                    setCurrentPlanName(userProfile.user_type);
                } else {
                    setCurrentPlanName("Free Plan");
                }
            } catch (error) {
                console.error("Failed to fetch plan details:", error);
                setCurrentPlanName(userProfile?.user_type || "Free Plan");
            }
        };

        fetchPlanDetailsAndName();
    }, [userProfile]);

    // Auto-sync logic removed.
    // The previous logic forced the user's token balance to match the plan's default,
    // which effectively undid any "top-ups" or "plan stacking".

    const planName = currentPlanName;

    const handleLogout = async () => {
        if (setIsLogoutDialogOpen) {
            setIsLogoutDialogOpen(true);
        } else {
            setLocalIsLogoutDialogOpen(true);
        }
    };

    return (
        <>
            <div className={`flex items-center gap-4 ${className}`}>
                {/* Desktop View */}
                <div className="hidden mobile:flex items-center gap-4">
                    {/* Plan / Token Display Popover */}
                    {user && (
                        <div className="group relative">
                            {/* Tour Target Proxy: Dynamically resizes to cover button + popover */}
                            <div
                                id="tour-token-balance"
                                className="absolute pointer-events-none bg-transparent"
                                style={isPopoverOpen ? {
                                    top: '-10px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '280px',
                                    height: '380px',
                                    zIndex: 50
                                } : {
                                    inset: 0
                                }}
                            />
                            <Popover open={isPopoverOpen} onOpenChange={handleOpenChange}>
                                <PopoverTrigger asChild>
                                    <div className="cursor-pointer group relative">
                                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] rounded-full blur transition duration-300 ${isPopoverOpen ? "opacity-100" : "opacity-75 group-hover:opacity-100"}`}></div>
                                        <div className="relative flex items-center gap-2.5 px-6 py-2.5 bg-white/90 dark:bg-[#111213]/90 backdrop-blur-md rounded-full border border-white/20 dark:border-gray-800/50 shadow-lg hover:shadow-xl transition-all">
                                            <span className="text-sm font-bold bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] bg-clip-text text-transparent uppercase tracking-wide">
                                                TOKENS BALANCE
                                            </span>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent disablePortal className="w-64 p-4 rounded-xl bg-white/95 dark:bg-[#111213]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl">
                                    <div className="space-y-4">
                                        <div className="text-center pb-2 border-b border-gray-100 dark:border-gray-800">
                                            <span className="text-lg font-bold bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] bg-clip-text text-transparent uppercase tracking-wide">
                                                {planName}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                                            <div className="flex items-center gap-2">
                                                <Coins className="w-4 h-4 text-purple-500" />
                                                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Tokens</span>
                                            </div>
                                            <span className="text-lg font-bold text-foreground">{remainingTokens}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                            <div className="flex items-center gap-2">
                                                <Clapperboard className="w-4 h-4 text-blue-500" />
                                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Videos</span>
                                            </div>
                                            <span className="text-lg font-bold text-foreground">{remainingVideos}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                                            <div className="flex items-center gap-2">
                                                <Image className="w-4 h-4 text-emerald-500" />
                                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Images</span>
                                            </div>
                                            <span className="text-lg font-bold text-foreground">{remainingImages}</span>
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                onClick={() => {
                                                    if (topUpPlan) {
                                                        setIsTopUpDetailsOpen(true);
                                                        setIsPopoverOpen(false);
                                                    } else {
                                                        console.warn("[UserNav] Top Up plan not found, navigating to pricing.");
                                                        navigate('/pricing');
                                                    }
                                                }}
                                                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] hover:from-[#2595A2] hover:to-[#8EC0B1] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95"
                                            >
                                                <Coins className="w-4 h-4" />
                                                Refill My Token Balance
                                            </button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    <Dialog open={isTopUpDetailsOpen} onOpenChange={setIsTopUpDetailsOpen}>
                        <DialogContent className="sm:max-w-[425px] bg-card border-border/50 z-[9999]">
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
                                            setIsTopUpPaymentOpen(true);
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
                        isOpen={isTopUpPaymentOpen}
                        onClose={() => setIsTopUpPaymentOpen(false)}
                        planId={topUpPlan?.id || 'top-up-99'}
                        planName={topUpPlan?.name || "Credit Top Up"}
                        price={topUpPlan?.price || "99"}
                        description={
                            <div className="flex flex-col gap-1 items-center">
                                <span className="text-primary font-bold text-lg">{topUpPlan?.tokens ? Number(topUpPlan.tokens).toLocaleString() : "1,000"} Tokens</span>
                                <span className="text-sm text-muted-foreground">Valid for 30 days.</span>
                            </div>
                        }
                        onConfirm={(transId) => {
                            console.log("Top-up confirmed:", transId);
                            window.location.reload();
                        }}
                    />

                    {/* User Menu */}
                    {user ? (
                        <div className="flex items-center gap-3 bg-background backdrop-blur-sm px-4 rounded-full">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="flex items-center gap-2 py-2.5 text-foreground hover:text-gray-200 transition-colors cursor-pointer"
                                        aria-label="User menu">
                                        <span className="text-sm font-medium text-foreground">
                                            {userProfile?.user_name || user.user_metadata?.user_name || user.user_metadata?.full_name}
                                        </span>
                                        <CircleUserRound />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={8} className="w-48 rounded-xl p-2 dark:bg-[#111213] bg-white dark:border-[#1f2123] border-gray-200 text-foreground dark:text-white shadow-lg">
                                    {location.pathname === "/generate" && (
                                        <DropdownMenuItem
                                            onClick={() => {
                                                handleSetProductDrawerView("list");
                                                handleSetIsProductDrawerOpen(true);
                                                // If we are not on generate page (e.g. on Pricing), we might need to navigate there?
                                                // For now assume standard behavior or navigation if props not present.
                                                if (!setProductDrawerView) navigate("/generate");
                                            }}
                                            className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                            <List className="w-4 h-4 mr-2" />
                                            Products
                                        </DropdownMenuItem>
                                    )}
                                    {location.pathname !== "/generate" && (
                                        <DropdownMenuItem asChild>
                                            <Link
                                                to="/generate"
                                                className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full flex items-center"
                                            >
                                                <Home className="w-4 h-4 mr-2" />
                                                Home
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem asChild>
                                        <Link
                                            to="/profile"
                                            className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full flex items-center"
                                        >
                                            <User className="w-4 h-4 mr-2" />
                                            Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link
                                            to="/pricing"
                                            className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full flex items-center"
                                        >
                                            <DiamondPercent className="w-4 h-4 mr-2" />
                                            Pricing
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleLogout}
                                        className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <NavLink to="/auth">
                            <button className="py-2.5 px-7 bg-[linear-gradient(90deg,#29A6B4_0%,#9ED2C3_100%)] hover:bg-[linear-gradient(90deg,#9ED2C3_0%,#29A6B4_100%)] rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg">
                                Login
                            </button>
                        </NavLink>
                    )}
                    <ThemeToggle />
                </div>



                {/* Mobile View */}
                <div className="mobile:hidden">
                    <MobileUserMenu
                        user={user}
                        userProfile={userProfile}
                        isMobile={!!isMobile}
                        setProductDrawerView={handleSetProductDrawerView}
                        setIsProductDrawerOpen={handleSetIsProductDrawerOpen}
                        setIsLogoutDialogOpen={handleSetIsLogoutDialogOpen}
                        isOpen={isMobileMenuOpen !== undefined ? isMobileMenuOpen : localIsMobileMenuOpen}
                        setIsOpen={setIsMobileMenuOpen || setLocalIsMobileMenuOpen}
                    />
                </div>



            </div >
            {!setIsLogoutDialogOpen && (
                <AlertDialog
                    open={localIsLogoutDialogOpen}
                    onOpenChange={setLocalIsLogoutDialogOpen}
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
            )}
        </>
    );
};

export default UserNav;
