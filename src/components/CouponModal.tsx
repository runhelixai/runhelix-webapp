import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Tag } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { sendVipWelcomeEmail, sendNormalWelcomeEmail } from "@/services/emailService";

interface CouponModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CouponModal: React.FC<CouponModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user, refreshProfile } = useAuth();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { toast } = useToast();

    const handleValidate = async () => {
        if (!code.trim()) {
            setError("Please enter a VIP Code");
            return;
        }
        setLoading(true);
        setError("");

        const envCode = import.meta.env.VITE_COUPON_CODE;
        const isValid = code.trim() === envCode;

        if (isValid) {
            try {
                if (!user?.id) throw new Error("User not found");

                // Get current profile to safely update tokens if needed, 
                // or just set it to 33 (3 videos * 10 + 3 images * 1).
                // Assuming new user has 0.
                const { error: updateError } = await supabase
                    .from("users")
                    .update({
                        user_type: "VIP",
                        purchase_token: 33 // 3 Videos (30) + 3 Images (3)
                    })
                    .eq("id", user.id);

                if (updateError) {
                    console.error("[CouponModal] Error updating user tokens:", updateError);
                    throw updateError;
                }

                // Trigger VIP Welcome Email since they are now a VIP user
                // if (user.email) {
                //     const fullName = user.user_metadata.full_name || user.user_metadata.name || "User";
                //     sendVipWelcomeEmail(user.email, fullName).catch(e => console.error("Failed to send VIP welcome email:", e));
                // }

                if (user.email) {
                    const fullName = user.user_metadata.full_name || user.user_metadata.name || "User";
                    sendNormalWelcomeEmail(user.email, fullName).catch(e => console.error("Failed to send Normal welcome email:", e));
                }

                await refreshProfile();
                onSuccess();
            } catch (err: any) {
                console.error("Error updating user:", err);
                setError("Failed to apply coupon. Please try again.");
            }
        } else {
            setError("Invalid VIP Code");
            toast({
                title: "Invalid Code",
                description: "The VIP Code you entered is incorrect.",
                variant: "destructive"
            });
        }
        setLoading(false);
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            if (!user?.id) throw new Error("User not found");

            const { error: updateError } = await supabase
                .from("users")
                .update({ user_type: "standard" })
                .eq("id", user.id);

            if (updateError) throw updateError;

            // Trigger Normal Welcome Email since they skipped the coupon
            if (user.email) {
                const fullName = user.user_metadata.full_name || user.user_metadata.name || "User";
                sendNormalWelcomeEmail(user.email, fullName).catch(e => console.error("Failed to send Normal welcome email:", e));
            }

            await refreshProfile();
            onClose();
        } catch (err: any) {
            console.error("Error updating user:", err);
            // Even if it fails, we might want to close the modal or show error
            // show error for now
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-0 rounded-2xl p-6 shadow-xl z-[100]">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="rounded-full bg-primary/10 p-4 transition-all duration-300 transform hover:scale-110">
                        <Tag className="h-8 w-8 text-primary" />
                    </div>

                    <div className="space-y-2 w-full">
                        <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                            Exclusive Access
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                            Do you have a referral or VIP Code? Enter it below to unlock premium features.
                        </DialogDescription>
                    </div>

                    <div className="w-full space-y-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="coupon" className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter VIP Access Code</Label>
                            <Input
                                id="coupon"
                                placeholder="e.g. HELIX2025"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                disabled={loading}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleValidate();
                                }}
                                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary transition-all"
                            />
                            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                        </div>

                        <div className="flex w-full justify-between gap-4 pt-2">
                            <Button
                                variant="outline"
                                onClick={handleSkip}
                                disabled={loading}
                                className="flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200 py-2 px-4 rounded-lg"
                            >
                                Skip
                            </Button>
                            <Button
                                onClick={handleValidate}
                                disabled={loading}
                                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors duration-200 py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
