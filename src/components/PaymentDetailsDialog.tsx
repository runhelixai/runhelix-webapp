import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, CreditCard, Landmark } from "lucide-react";
import { getClientKey, processCustomPayment, sendPaymentConfirmation } from "@/services/paymentService";
import { useAuth } from "@/lib/auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentDetailsDialogProps } from "@/types";
import { commonApiEndpoints } from "@/helpers/commonApiEndpoints";
import { supabase } from "@/lib/supabase";

// Declare Authorize.Net Accept.js types
declare global {
    interface Window {
        Accept: {
            dispatchData: (
                data: {
                    authData: { clientKey: string; apiLoginID: string };
                    cardData: { cardNumber: string; month: string; year: string; cardCode: string };
                },
                callback: (response: any) => void
            ) => void;
        };
    }
}
export const PaymentDetailsDialog: React.FC<PaymentDetailsDialogProps & { description?: React.ReactNode }> = ({ isOpen, onClose, planId, planName, price, onConfirm, description }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [generalError, setGeneralError] = useState("");

    const paymentSchema = z.object({
        email: z.string().email("Invalid email address"),
        cardNumber: z.string().min(1, "Card number is required").regex(/^\d+$/, "Must be digits"),
        month: z.string().min(1, "Month is required").regex(/^(0?[1-9]|1[0-2])$/, "Invalid month"),
        year: z.string().min(1, "Year is required").regex(/^\d{2}$/, "Invalid year"),
        cardCode: z.string().min(3, "CVC required").max(4),
    });
    type PaymentFormValues = z.infer<typeof paymentSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            email: user?.email || "",
            cardNumber: "",
            month: "",
            year: "",
            cardCode: "",
        },
        mode: "onBlur"
    });

    // Update email if user changes (though usually user is constant in this context)
    useEffect(() => {
        if (user?.email) {
            setValue("email", user.email);
        }
    }, [user, setValue]);

    const onSubmit = async (data: PaymentFormValues) => {
        setIsLoading(true);
        setGeneralError("");
        try {
            const clientKeyResponse = await getClientKey();
            const authData = {
                clientKey: clientKeyResponse.data.clientKey,
                apiLoginID: clientKeyResponse.data.apiLoginID,
            };

            const cardData = {
                cardNumber: data.cardNumber,
                month: data.month,
                year: data.year,
                cardCode: data.cardCode,
            };

            window?.Accept?.dispatchData(
                { authData, cardData },
                async (response: any) => {
                    if (response.messages.resultCode === "Error") {
                        console.error("[PaymentDetailsDialog] Accept.js Error:", response.messages.message);
                        setGeneralError(response.messages.message[0].text);
                        setIsLoading(false);
                        return;
                    }

                    try {
                        let result = await processCustomPayment({
                            amount: Number(price),
                            paymentNonce: response.opaqueData.dataValue,
                            dataDescriptor: response.opaqueData.dataDescriptor,
                            email: data.email,
                            planId,
                        });

                        if (typeof result === "string") {
                            try {
                                result = JSON.parse(result);
                            } catch (error) {
                                console.error("[PaymentDetailsDialog] Failed to parse payment result string:", error);
                            }
                        }

                        if (result.success) {
                            const transId = result.transactionId || result.data?.transactionId;

                            // Call the confirmation API (fire and forget or wait, user didn't specify, but safer to just await or let it run)
                            // Since we are closing dialog, better to just fire it or await if it's critical. 
                            // Given the existing code closes immediately, I'll fire it but catch errors internally in the service so it doesn't block UI if I await.
                            // I'll await it to ensure it sends before the component unmounts fully or state changes.
                            try {
                                await sendPaymentConfirmation({
                                    email: data?.email,
                                    amount: Number(price),
                                    currency: "USD",
                                    transaction_id: transId || "",
                                    date: new Date().toISOString()
                                });
                            } catch (e) {
                                console.error("Failed to send payment confirmation", e);
                            }

                            setIsLoading(false);
                            onConfirm(transId);
                            onClose();
                        } else {
                            console.error("[PaymentDetailsDialog] Payment failed (backend):", result.message);
                            setGeneralError(result.message || "Payment failed");
                            setIsLoading(false); // Make sure to stop loading
                        }
                    } catch (err: any) {
                        console.error("[PaymentDetailsDialog] Exception during custom payment processing:", err);
                        setGeneralError(err.message || "Payment processing failed");
                        setIsLoading(false);
                    }
                }
            );
        } catch (err: any) {
            console.error("[PaymentDetailsDialog] Exception during initialization:", err);
            setGeneralError(err.message || "Payment initialization failed");
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const script = document.createElement("script");
        script.src = commonApiEndpoints.AUTHORIZE_NET_SCRIPT;
        script.async = true;
        document.head.appendChild(script);
        return () => {
            document.head.removeChild(script);
        };
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-[425px] p-0 z-[9999] overflow-hidden bg-card border-border/50 shadow-2xl [&>button]:text-foreground rounded-2xl sm:rounded-3xl gap-0">
                <div className="p-6 pb-4">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-foreground">Complete Payment</h2>
                        {description ? (
                            <div className="text-base text-muted-foreground mt-1">{description}</div>
                        ) : (
                            <p className="text-base text-muted-foreground mt-1">Upgrade to <span className="text-primary font-semibold border-b border-primary">{planName} Plan</span></p>
                        )}
                    </div>

                    {generalError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {generalError}
                        </div>
                    )}
                    <div className="space-y-5">
                        <div className="space-y-2 text-foreground">
                            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                {...register("email")}
                                disabled={!!user?.email}
                                className={`h-11 bg-background/50 transition-colors ${errors.email ? "border-red-500" : ""}`}
                            />
                            {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                        </div>

                        <div>
                            <button
                                type="button"
                                className={`w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 bg-background text-primary shadow-sm ring-1 ring-border/50 cursor-default`}
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Card</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 text-foreground">
                                <Label htmlFor="cardNumber" className="text-sm font-medium">Card number</Label>
                                <div className="relative group">
                                    <Input
                                        id="cardNumber"
                                        placeholder="0000 0000 0000 0000"
                                        {...register("cardNumber")}
                                        maxLength={16}
                                        className={`pr-12 h-11 bg-background/50 focus:bg-background transition-colors font-mono ${errors.cardNumber ? "border-red-500" : ""}`}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                </div>
                                {errors.cardNumber && <span className="text-xs text-red-500">{errors.cardNumber.message}</span>}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-foreground">
                                <div className="space-y-2">
                                    <Label htmlFor="month" className="text-sm font-medium">Month</Label>
                                    <Input
                                        id="month"
                                        placeholder="MM"
                                        {...register("month")}
                                        maxLength={2}
                                        className={`h-11 bg-background/50 focus:bg-background transition-colors font-mono ${errors.month ? "border-red-500" : ""}`}
                                    />
                                    {errors.month && <span className="text-xs text-red-500">{errors.month.message}</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="year" className="text-sm font-medium">Year</Label>
                                    <Input
                                        id="year"
                                        placeholder="YY"
                                        {...register("year")}
                                        maxLength={2}
                                        className={`h-11 bg-background/50 focus:bg-background transition-colors font-mono ${errors.year ? "border-red-500" : ""}`}
                                    />
                                    {errors.year && <span className="text-xs text-red-500">{errors.year.message}</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cardCode" className="text-sm font-medium">CVC</Label>
                                    <div className="relative group">
                                        <Input
                                            id="cardCode"
                                            placeholder="123"
                                            {...register("cardCode")}
                                            maxLength={4}
                                            className={`h-11 bg-background/50 focus:bg-background transition-colors font-mono ${errors.cardCode ? "border-red-500" : ""}`}
                                        />
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    </div>
                                    {errors.cardCode && <span className="text-xs text-red-500">{errors.cardCode.message}</span>}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-medium mt-2 bg-gradient-to-r from-primary to-primary/90 hover:to-primary shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                                disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (`Pay $${price}`)}
                            </Button>
                        </form>
                    </div>
                </div>
                <div className="bg-muted/40 p-3.5 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border/40">
                    <Lock className="w-3.5 h-3.5" />
                    Payments are secure and encrypted
                </div>
            </DialogContent>
        </Dialog>
    );
};