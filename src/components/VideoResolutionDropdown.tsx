import React from "react";
import { ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VideoModelOption } from "@/hooks/useVideoModels";

interface Props {
    resolutions: VideoModelOption[]; // available resolution rows for the selected model
    selectedResolution: string | null;
    onResolutionChange: (resolution: string, creditId: string) => void;
    className?: string;
    isMobile?: boolean;
    disabled?: boolean;
}

/**
 * Renders a resolution picker only when `resolutions` has ≥ 2 entries.
 * When a model has only one resolution (or none), this component renders nothing.
 */
const VideoResolutionDropdown: React.FC<Props> = ({
    resolutions,
    selectedResolution,
    onResolutionChange,
    className = "",
    isMobile = false,
    disabled = false,
}) => {
    // Only show when there are multiple resolution options
    if (resolutions.length < 2) return null;

    const currentLabel = selectedResolution ?? resolutions[0]?.resolution ?? "Resolution";

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
                    <span className={`flex items-center gap-2 text-[#29A6B4] max-mobile:max-w-[6rem] truncate text-sm font-medium`}>
                        {currentLabel}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300`} />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-48 max-h-[220px] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-1.5"
                align="start"
                side="top"
                sideOffset={8}
            >
                {resolutions.map((option) => (
                    <DropdownMenuItem
                        key={option.creditId}
                        onClick={() => {
                            onResolutionChange(option.resolution!, option.creditId);
                        }}
                        className={`px-3 py-2.5 mb-0.5 cursor-pointer rounded-lg flex items-center gap-2 select-none text-sm font-medium transition-colors
                                ${selectedResolution === option.resolution
                                ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-400 focus:text-teal-600 dark:focus:text-teal-400 focus:bg-teal-50 dark:focus:bg-teal-900/20"
                                : "text-gray-700 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-200 focus:text-gray-700 dark:focus:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:bg-gray-50 dark:focus:bg-gray-700/50"
                            }`}
                    >
                        <span>{option.resolution}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default VideoResolutionDropdown;
