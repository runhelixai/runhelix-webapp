import React, { useRef, useState } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PromotionalVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (startFrame: string, endFrame: string) => void;
}

const PromotionalVideoModal: React.FC<PromotionalVideoModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
}) => {
    const [startFrame, setStartFrame] = useState<string | null>(null);
    const [endFrame, setEndFrame] = useState<string | null>(null);
    const startInputRef = useRef<HTMLInputElement>(null);
    const endInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: "start" | "end"
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (type === "start") {
                setStartFrame(result);
            } else {
                setEndFrame(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleConfirm = () => {
        if (startFrame && endFrame) {
            onConfirm(startFrame, endFrame);
            // Reset state after confirm? Maybe better to keep it if they re-open, 
            // but for now let's rely on parent or leave it. 
            // The parent might unmount or hide it.
        }
    };

    const clearImage = (type: "start" | "end") => {
        if (type === "start") {
            setStartFrame(null);
            if (startInputRef.current) startInputRef.current.value = "";
        } else {
            setEndFrame(null);
            if (endInputRef.current) endInputRef.current.value = "";
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="sm:max-w-md bg-[#111213] border-[#1f2123] text-white z-[110]"
                overlayClassName="z-[100]"
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Create Promotional Video</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Upload the start and end frames for your transition video.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    {/* Start Frame Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Start Frame</label>
                        <div
                            className="relative h-40 w-full rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden"
                            onClick={() => !startFrame && startInputRef.current?.click()}
                        >
                            {startFrame ? (
                                <>
                                    <img src={startFrame} alt="Start frame" className="w-full h-full object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); clearImage("start"); }}
                                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400 p-2 text-center">
                                    <ImageIcon className="w-8 h-8 opacity-50" />
                                    <span className="text-xs">Click to upload start frame</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={startInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, "start")}
                            />
                        </div>
                    </div>

                    {/* End Frame Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">End Frame</label>
                        <div
                            className="relative h-40 w-full rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden"
                            onClick={() => !endFrame && endInputRef.current?.click()}
                        >
                            {endFrame ? (
                                <>
                                    <img src={endFrame} alt="End frame" className="w-full h-full object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); clearImage("end"); }}
                                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400 p-2 text-center">
                                    <ImageIcon className="w-8 h-8 opacity-50" />
                                    <span className="text-xs">Click to upload end frame</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={endInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, "end")}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!startFrame || !endFrame}
                        className="bg-[#29A6B4] hover:bg-[#29A6B4]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirm
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PromotionalVideoModal;
