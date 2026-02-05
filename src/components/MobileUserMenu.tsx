
import React from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CircleUserRound, List, DiamondPercent, LogOut, Clapperboard, Image, User, Home } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, NavLink, useLocation } from "react-router-dom";

interface MobileUserMenuProps {
    user: any;
    userProfile: {
        purchase_token: number;
        exhaust_token: number;
    } | null;
    isMobile: boolean;
    setProductDrawerView: (view: "list" | "add") => void;
    setIsProductDrawerOpen: (open: boolean) => void;
    setIsLogoutDialogOpen: (open: boolean) => void;
}

const MobileUserMenu: React.FC<MobileUserMenuProps & { isOpen?: boolean, setIsOpen?: (open: boolean) => void }> = ({
    user,
    userProfile,
    isMobile,
    setProductDrawerView,
    setIsProductDrawerOpen,
    setIsLogoutDialogOpen,
    isOpen,
    setIsOpen
}) => {
    const location = useLocation();

    if (!isMobile) return null;

    return (
        <div className="flex mobile:hidden">
            {user ? (
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <div id="tour-token-balance-mobile" className="relative cursor-pointer group mt-4 mr-3">
                            {/* Attractive glowing effect around the trigger */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] rounded-full opacity-70 blur-sm group-hover:opacity-100 transition duration-300"></div>
                            <div className="relative h-10 w-10 flex items-center justify-center bg-white dark:bg-[#111213] rounded-full border border-gray-100 dark:border-gray-800 shadow-sm">
                                <CircleUserRound className="w-6 h-6 text-foreground" />
                            </div>
                        </div>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] border-l dark:border-gray-800 border-gray-200 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl p-6 flex flex-col gap-6">
                        <SheetHeader>
                            <div className="flex flex-col items-center gap-3 pb-6 border-b border-gray-100 dark:border-gray-800">
                                <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#29A6B4] to-[#9ED2C3] p-[2px]">
                                    <div className="h-full w-full rounded-full bg-white dark:bg-[#111213] flex items-center justify-center overflow-hidden">
                                        <span className="text-3xl font-bold bg-gradient-to-br from-gray-800 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                                            {(user.user_metadata?.user_name || user.user_metadata?.full_name || "U").slice(0, 1).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <SheetTitle className="text-lg font-bold text-foreground">
                                        {user.user_metadata?.user_name || user.user_metadata?.full_name || "User"}
                                    </SheetTitle>
                                    <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
                                </div>
                            </div>
                        </SheetHeader>

                        <div className="flex flex-col gap-4">
                            {/* Token Display */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 flex flex-col items-center gap-2 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider z-10">Videos</span>
                                    <span className="text-2xl font-bold text-foreground z-10">
                                        {userProfile ? Math.floor((userProfile.purchase_token - Number(userProfile.exhaust_token)) / 10 || 0) : 0}
                                    </span>
                                    {/* Decorative Icon */}
                                    <Clapperboard className="absolute -bottom-4 -right-4 w-12 h-12 text-blue-500/20 rotate-[-15deg] pointer-events-none" />
                                </div>

                                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center gap-2 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider z-10">Images</span>
                                    <span className="text-2xl font-bold text-foreground z-10">
                                        {userProfile ? Math.floor((userProfile.purchase_token - Number(userProfile.exhaust_token)) / 1 || 0) : 0}
                                    </span>
                                    {/* Decorative Icon */}
                                    <Image className="absolute -bottom-4 -right-4 w-12 h-12 text-emerald-500/20 rotate-[15deg] pointer-events-none" />
                                </div>
                            </div>

                            <div className="px-1 text-center">
                                <p className="text-[10px] text-muted-foreground">
                                    Total remaining Media for generation
                                </p>
                            </div>

                            {/* Theme Toggle */}
                            <div className="flex items-center justify-between p-2">
                                <span className="text-sm font-medium text-foreground">Dark Mode</span>
                                <ThemeToggle />
                            </div>

                            <div className="h-px bg-foreground/20 my-1" />

                            {/* Menu Items */}
                            <div className="space-y-2">
                                {location.pathname === "/generate" && (

                                    <button
                                        onClick={() => {
                                            setProductDrawerView("list");
                                            setIsProductDrawerOpen(true);
                                        }}
                                        className="w-full flex items-center outline-none gap-3 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="p-2 rounded-md bg-[#29A6B4]/10 text-[#29A6B4]">
                                            <List className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-sm text-foreground">My Products</span>
                                    </button>)}
                                {location.pathname !== "/generate" && (
                                    <Link to="/generate">
                                        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left">
                                            <div className="p-2 rounded-md bg-[#29A6B4]/10 text-[#29A6B4]">
                                                <Home className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-sm text-foreground">Home</span>
                                        </button>
                                    </Link>
                                )}
                                <Link to="/profile">
                                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left">
                                        <div className="p-2 rounded-md bg-[#29A6B4]/10 text-[#29A6B4]">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-sm text-foreground">Profile</span>
                                    </button>
                                </Link>
                                <Link to="/pricing">
                                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left">
                                        <div className="p-2 rounded-md bg-[#9ED2C3]/10 text-[#29A6B4]">
                                            <DiamondPercent className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-sm text-foreground">Pricing</span>
                                    </button>
                                </Link>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <button
                                onClick={() => setIsLogoutDialogOpen(true)}
                                className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Log Out
                            </button>
                        </div>
                    </SheetContent>
                </Sheet>
            ) : (
                <div className="flex items-center gap-2 py-3">
                    <NavLink to="/auth">
                        <button className="py-2.5 px-7 bg-[linear-gradient(90deg,#29A6B4_0%,#9ED2C3_100%)] hover:bg-[linear-gradient(90deg,#9ED2C3_0%,#29A6B4_100%)] rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg">
                            Login
                        </button>
                    </NavLink>
                    <ThemeToggle />
                </div>
            )}
        </div>
    );
};

export default MobileUserMenu;
