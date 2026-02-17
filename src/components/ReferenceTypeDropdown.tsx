import React from "react";
import { SlidersHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
    value: "reference" | "frames";
    onChange: (value: "reference" | "frames") => void;
    className?: string;
    isMobile?: boolean;
}

const ReferenceTypeDropdown: React.FC<Props> = ({
    value,
    onChange,
    className = "",
    isMobile = false,
}) => {
    const options: { label: string; value: "reference" | "frames" }[] = [
        { label: "Reference to Video", value: "reference" },
        { label: "Frames to Video", value: "frames" },
    ];

    const currentLabel = options.find((o) => o.value === value)?.label || "Select Type";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div
                    className={`relative flex items-center justify-center px-4 py-2.5 gap-2 rounded-full border transition-all duration-200 cursor-pointer
                      border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-400
                    bg-white dark:bg-transparent text-gray-700 dark:text-gray-200 ${className}`}
                    role="button"
                    tabIndex={0}
                >
                    <SlidersHorizontal className="w-5 h-5 text-gray-400 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-white max-sm:hidden">
                        {currentLabel}
                    </span>
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
                            onChange(option.value);
                        }}
                        className={`px-3 py-2.5 mb-0.5 cursor-pointer rounded-lg flex items-center gap-2 select-none text-sm font-medium transition-colors focus:bg-gray-50 dark:focus:bg-gray-700/50
                                ${value === option.value
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

export default ReferenceTypeDropdown;
