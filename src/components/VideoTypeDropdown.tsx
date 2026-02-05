import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
    videoType: string;
    setVideoType: (type: string) => void;
    className?: string;
    isMobile?: boolean;
    mode?: "image-to-video" | "image-to-image";
}

const VideoTypeDropdown: React.FC<Props> = ({
    videoType,
    setVideoType,
    className = "",
    isMobile = false,
    mode = "image-to-video",
}) => {
    // const [open, setOpen] = useState(false); // Managed by DropdownMenu

    const options: { label: string; value: "UGC Testimonials" | "Promotional" | "Single Product Image" }[] =
        mode === "image-to-image"
            ? [{ label: "Single Product Image", value: "Single Product Image" }]
            : [
                { label: "UGC Testimonials", value: "UGC Testimonials" },
                { label: "Promotional", value: "Promotional" },
            ];

    useEffect(() => {
        if (mode === "image-to-image") {
            setVideoType("Single Product Image");
        } else {
            setVideoType("UGC Testimonials");
        }
    }, [mode]);


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div
                    className={`relative flex ring-1 ring-[#29A6B4] items-center justify-between gap-2 py-2.5 px-4 rounded-full border transition-all duration-200 cursor-pointer
                      border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-400
                    bg-white dark:bg-transparent text-gray-700 dark:text-gray-200 ${className}`}
                    role="button"
                    tabIndex={0}
                >
                    <span className={`flex items-center gap-2 text-[#29A6B4] max-mobile:max-w-12 truncate text-sm font-medium`}>
                        {videoType}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300`} />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-1.5"
                align="start"
                side="top"
                sideOffset={8}
            >
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => {
                            setVideoType(option.value);
                        }}
                        className={`px-3 py-2.5 mb-0.5 cursor-pointer rounded-lg flex items-center gap-2 select-none text-sm font-medium transition-colors focus:bg-gray-50 dark:focus:bg-gray-700/50
                                ${videoType === option.value
                                ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 focus:bg-teal-50 dark:focus:bg-teal-900/20"
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                    >
                        <span>{option.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default VideoTypeDropdown;
