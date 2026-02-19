import React from "react";
import { ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
    videoModel: string;
    setVideoModel: (model: string) => void;
    className?: string;
    isMobile?: boolean;
    disabled?: boolean;
    videoType?: string;
}

const VideoModelDropdown: React.FC<Props> = ({
    videoModel,
    setVideoModel,
    className = "",
    isMobile = false,
    disabled = false,
    videoType,
}) => {
    const promotionalOptions = [
        { label: "Veo 3.1", value: "veo-3.1" },
        { label: "Veo 3.1 Fast", value: "veo-3.1-fast" },
    ];

    const ugcOptions = [
        { label: "Sora 2", value: "sora-2" },
        { label: "Veo 3.1", value: "veo-3.1" },
        { label: "Seedance 1.5", value: "bytedance/seedance-v1.5-pro/image-to-video" },
        { label: "Kling 2.5 Turbo Pro", value: "kwaivgi/kling-v2.5-turbo-pro/image-to-video" },
        { label: "Kling 2.6 pro", value: "kwaivgi/kling-v2.6-pro/image-to-video" },
        { label: "Vidu Q3", value: "vidu/q3/image-to-video" },
    ];

    const options = videoType === "Promotional" ? promotionalOptions : ugcOptions;

    const currentLabel = options.find((o) => o.value === videoModel)?.label || videoModel;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <div
                    className={`relative flex ring-1 ring-[#29A6B4] items-center justify-between gap-2 py-2.5 px-4 rounded-full border transition-all duration-200 cursor-pointer
                      border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-400
                    bg-white dark:bg-transparent text-gray-700 dark:text-gray-200 ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
                    role="button"
                    tabIndex={0}
                >
                    <span className={`flex items-center gap-2 text-[#29A6B4] max-mobile:max-w-24 truncate text-sm font-medium`}>
                        {currentLabel}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300`} />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-1.5"
                align="start"
                side="top"
                sideOffset={8}
            >
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => {
                            setVideoModel(option.value);
                        }}
                        className={`px-3 py-2.5 mb-0.5 cursor-pointer rounded-lg flex items-center gap-2 select-none text-sm font-medium transition-colors focus:bg-gray-50 dark:focus:bg-gray-700/50
                                ${videoModel === option.value
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

export default VideoModelDropdown;
