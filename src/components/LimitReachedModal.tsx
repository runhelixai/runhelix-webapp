import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

interface LimitReachedModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
    open,
    onOpenChange,
}) => {
    const navigate = useNavigate();

    const handleNavigation = (plan: string) => {
        onOpenChange(false);
        navigate(`/pricing?plan=${plan}`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent overlayClassName="z-[99]" className="sm:max-w-[425px] dark:bg-[#1a1a1a] dark:text-white border-0 bg-white z-[99]">
                <DialogHeader className="text-center">
                    <DialogTitle className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] bg-clip-text text-transparent">Thank You For Running Helix</DialogTitle>
                    <DialogDescription className="text-center text-gray-500 dark:text-gray-400">
                        You have reached the maximum amount of downloads. Please purchase or upgrade your plan to continue generating stunning product videos and images.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-6">
                    {/* <div className="grid grid-cols-3 gap-2">
                        <Button
                            className="w-full bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] text-white border-0 hover:opacity-90 text-xs px-1"
                            onClick={() => handleNavigation('Start')}
                        >
                            Get Started
                        </Button>
                        <Button
                            className="w-full bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] text-white border-0 hover:opacity-90 text-xs px-1"
                            onClick={() => handleNavigation('Scale')}
                        >
                            Choose Scale
                        </Button>
                        <Button
                            className="w-full bg-gradient-to-r from-[#29a6b4] to-[#9ed2c3] text-white border-0 hover:opacity-90 text-xs px-1"
                            onClick={() => handleNavigation('Agency')}
                        >
                            Choose Agency
                        </Button>
                    </div> */}
                    <Button
                        // variant="outline"
                        className="w-full text-black dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => {
                            onOpenChange(false);
                            navigate('/pricing');
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
