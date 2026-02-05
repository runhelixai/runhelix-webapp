import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ScaleSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade?: () => void;
}

export const ScaleSuggestionModal = ({ isOpen, onClose, onUpgrade }: ScaleSuggestionModalProps) => {
    const navigate = useNavigate();

    const handleCheckScalePlan = () => {
        if (onUpgrade) {
            onUpgrade();
        } else {
            onClose();
            navigate("/pricing?plan=Scale");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative w-full max-w-lg bg-[#0f1115] border border-teal-500/30 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />
                        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-teal-500/20 rounded-full blur-[60px] pointer-events-none" />
                        <div className="absolute bottom-[-50px] left-[-50px] w-40 h-40 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />

                        <div className="relative p-6 sm:p-8">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header Content */}
                            <div className="flex flex-col items-center text-center space-y-4 mb-8">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
                                    <div className="relative bg-gradient-to-br from-teal-500 to-emerald-500 p-4 rounded-full shadow-lg shadow-teal-500/20">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                                        Upgrade to Scale Plan
                                    </h2>
                                    <p className="text-slate-400 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
                                        You've purchased the Start Plan multiple times recently. Save money and get more tokens with our Scale plan.
                                    </p>
                                </div>
                            </div>

                            {/* Feature Comparison / Benefits */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-8 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                    <span className="text-slate-300 font-medium">Monthly Cost</span>
                                    <div className="text-right">
                                        <span className="block text-2xl font-bold text-white">$399</span>
                                        <span className="text-xs text-slate-500">per month</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="p-1 rounded-full bg-teal-500/10 text-teal-400">
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                        <span>1500 Tokens per month</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="p-1 rounded-full bg-teal-500/10 text-teal-400">
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                        <span>Better value per Token</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="p-1 rounded-full bg-teal-500/10 text-teal-400">
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                        <span>Priority Support</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <Button
                                    onClick={handleCheckScalePlan}
                                    className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/25 group"
                                >
                                    <span>View Scale Plan</span>
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="w-full h-11 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium"
                                >
                                    Maybe Later
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
