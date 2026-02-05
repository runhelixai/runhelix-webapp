import React, { useMemo, useRef, useState } from "react";
import { ChevronDown, Eye, List, Paperclip, Plus } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Product } from "@/types";

interface Props {
    userId?: string | null;
    products: Product[];
    selectedProduct?: Product | null;
    isMobile?: boolean;
    onAddProduct?: () => void;
    onViewAll?: () => void;
    className?: string;
    panelWidth?: string;
}

const ProductDropdown: React.FC<Props> = ({
    userId,
    products,
    selectedProduct,
    isMobile = false,
    onAddProduct,
    onViewAll,
    className = "",
    panelWidth = "w-48",
}) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);

    useClickOutside(rootRef, () => setOpen(false));


    const trigger = useMemo(() => {
        // if (isMobile) {
        //     return (
        //         <div className="flex items-center">
        //             {selectedProduct ? (
        //                 <img
        //                     src={typeof selectedProduct.logo === "string" ? selectedProduct.logo : selectedProduct.logo ? URL.createObjectURL(selectedProduct.logo) : ""}
        //                     alt={selectedProduct?.name}
        //                     className="w-6 h-6 rounded object-cover border border-gray-200 dark:border-gray-700"
        //                 />
        //             ) : (
        //                 <List className="w-5 h-5 text-gray-700 dark:text-white" />
        //             )}
        //         </div>
        //     );
        // }
        return (
            <div
                className={`flex items-center justify-between gap-2 py-2.5 px-4 rounded-full text-white bg-[linear-gradient(90deg,#29A6B4_0%,#9ED2C3_100%)] hover:bg-[linear-gradient(90deg,#9ED2C3_0%,#29A6B4_100%)] hover:opacity-90 focus:outline-none transition-all`} aria-hidden
                onClick={() => { onViewAll(); setOpen(false); }}

            >
                <span className={`flex items-center gap-2 max-w-[] truncate text-sm font-medium`}>
                    <Paperclip className="w-4 h-4 text-white" />
                    {selectedProduct ? (selectedProduct.name.length > 17 ? selectedProduct.name.slice(0, 17) + ".." : selectedProduct.name) : "Select Product"}
                </span>
                {/* <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} /> */}
            </div>
        );
    }, [isMobile, selectedProduct, open]);

    if (!userId) return null;

    return (
        <div className={`relative ${className}`} ref={rootRef}>
            <div
                onClick={() => setOpen((s) => !s)}
                role="button"
                tabIndex={0}
                aria-expanded={open}
            >  {trigger}
            </div>

            {/* Dropdown panel: position above or below */}
            <div
                ref={panelRef}
                className={`absolute left-0 bottom-full mb-2 ${panelWidth} max-h-52 overflow-y-auto 
          bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-200 origin-bottom
          ${open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"}`}
                role="menu"
                aria-hidden={!open}
            >
                {/* {onViewAll && (
                    <div className="p-1.5">
                        <div
                            onClick={() => { onViewAll(); setOpen(false); }}
                            role="menuitem"
                            tabIndex={0}
                            className="px-3 py-2.5 text-teal-600 dark:text-teal-400 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/10 rounded-lg flex items-center gap-2 select-none text-sm font-medium transition-colors"
                        >
                            <List className="w-4 h-4" />
                            <span>{"View All Product"}</span>
                        </div>
                    </div>
                )} */}

                {/* {onAddProduct && (
                    <div className="p-1.5 pt-0">
                        <div
                            onClick={() => { onAddProduct(); setOpen(false); }}
                            role="menuitem"
                            tabIndex={0}
                            className="px-3 py-2.5 text-teal-600 dark:text-teal-400 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/10 rounded-lg flex items-center gap-2 select-none text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{"Add New Product"}</span>
                        </div>
                    </div>
                )} */}
            </div>
        </div>
    );
};

export default ProductDropdown;
