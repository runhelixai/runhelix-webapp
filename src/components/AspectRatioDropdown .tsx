import React, { useMemo, useState } from "react";
import { ChevronDown, RectangleHorizontal, RectangleVertical, Settings2, Square } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
    aspectRatio: string;
    setAspectRatio: (v: string) => void;
    isMobile?: boolean;
    initialOpen?: boolean;
    className?: string;
    mode?: "image-to-video" | "image-to-image";
}

const iconMap: Record<string, any> = {
    landscape: RectangleHorizontal,
    square: Square,
    portrait: RectangleVertical,
};

const allDropDownData = [
    { label: "9:16 (Portrait)", value: "portrait" },
    { label: "1:1 (Square)", value: "square" },
    { label: "16:9 (Landscape)", value: "landscape" },
];

/**
 * ForwardRef so parent can pass settingsRef (or we create our own).
 */
const AspectRatioDropdown = ({ aspectRatio, setAspectRatio, isMobile = false, initialOpen = false, className = "", mode = "image-to-image" }: Props) => {

    const dropDownData = useMemo(() => {
        if (mode === "image-to-video") {
            return allDropDownData.filter(d => d.value !== "square");
        }
        return allDropDownData;
    }, [mode]);

    const [open, setOpen] = useState<boolean>(initialOpen);

    const handleSelect = (value: string) => {
        setAspectRatio(value);
        setOpen(false)
    }

    const SelectedIcon = useMemo(() => iconMap[aspectRatio] ?? (() => null), [iconMap, aspectRatio]);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <div className={`relative ${className}`}>
                    <div className="max-mobile:right-[inherit] max-mobile:left-[-40px]">
                        <div role="button" aria-haspopup="listbox" tabIndex={0} className="outline-none">
                            {isMobile ? (
                                <Settings2 className="w-5 h-5 dark:text-white text-black" />
                            ) : (
                                <div
                                    className={`flex items-center justify-between w-full ring-1 ring-[#29A6B4] py-2.5 px-4 rounded-full transition-all duration-200 cursor-pointer
                                bg-white dark:bg-transparent text-gray-700 dark:text-gray-200`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden text-[#29A6B4]">
                                        <SelectedIcon className={`w-4 h-4 flex-shrink-0 text-teal-500`} />
                                        <span className="capitalize text-sm font-medium truncate">{aspectRatio}</span>
                                    </div>
                                    <ChevronDown
                                        className={`ml-2 w-4 h-4 transition-transform duration-300 ${open ? "rotate-180 text-teal-500" : "text-gray-400"}`}
                                        aria-hidden
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[11.8rem] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-1.5 space-y-0.5"
                side="top"
                sideOffset={12}
                align={isMobile ? "start" : "center"}
            >
                {dropDownData.map(({ label, value }) => {
                    const Icon = iconMap[value] ?? (() => null);
                    const isActive = aspectRatio === value;
                    return (
                        <DropdownMenuItem
                            key={value}
                            onClick={() => handleSelect(value)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors focus:bg-gray-50 dark:focus:bg-gray-700/50
                                            ${isActive
                                    ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 font-medium focus:bg-teal-50 dark:focus:bg-teal-900/20"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? "text-teal-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                            <span>{label}</span>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default AspectRatioDropdown;
