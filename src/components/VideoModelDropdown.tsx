import React, { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVideoModels } from "@/hooks/useVideoModels";

interface Props {
    videoModel: string;
    setVideoModel: (model: string) => void;
    setVideoCreditId?: (creditId: string) => void;
    className?: string;
    isMobile?: boolean;
    disabled?: boolean;
    videoType?: string;
}

const VideoModelDropdown: React.FC<Props> = ({
    videoModel,
    setVideoModel,
    setVideoCreditId,
    className = "",
    isMobile = false,
    disabled = false,
    videoType,
}) => {
    const { models, loading } = useVideoModels(videoType);

    // Track which row is highlighted by model_name (always unique per row).
    // This is needed because multiple rows can share the same video_model API value
    // (e.g. same model at different resolutions), so comparing by video_model alone
    // would make it impossible to distinguish between them visually.
    const [selectedModelName, setSelectedModelName] = useState<string>("");

    // When models load or videoType changes, auto-select the first model
    // if the current video_model value is no longer in the list.
    useEffect(() => {
        if (models.length === 0) return;

        const matchedByValue = models.find((m) => m.value === videoModel);
        if (matchedByValue) {
            // Keep the current selection but sync the display name
            setSelectedModelName(matchedByValue.label);
            setVideoCreditId?.(matchedByValue.creditId);
        } else {
            // Current value is invalid for this type → default to first model
            setVideoModel(models[0].value);
            setSelectedModelName(models[0].label);
            setVideoCreditId?.(models[0].creditId);
        }
    }, [models]);

    // The label shown in the trigger button
    const currentLabel = selectedModelName ||
        models.find((o) => o.value === videoModel)?.label ||
        videoModel;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled || loading}>
                <div
                    className={`relative flex ring-1 ring-[#29A6B4] items-center justify-between gap-2 py-2.5 px-4 rounded-full border transition-all duration-200 cursor-pointer
                      border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-400
                    bg-white dark:bg-transparent text-gray-700 dark:text-gray-200 ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
                    role="button"
                    tabIndex={0}
                >
                    <span className={`flex items-center gap-2 text-[#29A6B4] max-mobile:max-w-[6rem] truncate text-sm font-medium`}>
                        {loading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                <span>Loading...</span>
                            </>
                        ) : (
                            currentLabel
                        )}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300`} />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-64 max-h-[220px] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-1.5"
                align="start"
                side="top"
                sideOffset={8}
            >
                {models.length === 0 && !loading ? (
                    <div className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500 text-center">
                        No models available
                    </div>
                ) : (
                    models.map((option) => (
                        <DropdownMenuItem
                            // Use model_name as key — always unique per row
                            key={option.label}
                            onClick={() => {
                                // Pass video_model API value to parent
                                setVideoModel(option.value);
                                // Track selection by model_name for accurate highlighting
                                setSelectedModelName(option.label);
                                // Sync credit_id to parent
                                setVideoCreditId?.(option.creditId);
                            }}
                            className={`px-3 py-2.5 mb-0.5 cursor-pointer rounded-lg flex items-center gap-2 select-none text-sm font-medium transition-colors
                                    ${selectedModelName === option.label
                                    ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-400 focus:text-teal-600 dark:focus:text-teal-400 focus:bg-teal-50 dark:focus:bg-teal-900/20"
                                    : "text-gray-700 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-200 focus:text-gray-700 dark:focus:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:bg-gray-50 dark:focus:bg-gray-700/50"
                                }`}
                        >
                            <span>{option.label}</span>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default VideoModelDropdown;
