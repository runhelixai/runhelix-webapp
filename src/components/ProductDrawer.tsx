import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle, SheetDescription, } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Product } from "@/types";
import { Upload, Image as ImageIcon, Globe, X, Search, Plus, ArrowLeft, ChevronRight, Pencil, Trash2, Loader2, Loader, Loader2Icon, Dna } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { commonSvgIcon } from "@/helpers/commonSvg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { parseDimensions } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProductDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    products: Product[];
    onAddProduct: (product: Product) => void;
    onUpdateProduct: (product: Product) => Promise<void>;
    onDeleteProduct: (productId: string) => void;
    loading: boolean;
    initialView?: "list" | "add";
    onSelectProduct?: (product: Product) => void;
    selectedProductId?: string;
}

const productSchema = z.object({
    name: z.string().min(1, "Product Name is required"),
    // company_name: z.string().min(1, "Company Name is required"),
    dimensions: z.string().optional(),
    url: z.string().optional().or(z.literal("")),
    media: z.string().min(1, "Media is required"),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function ProductDrawer({
    open,
    onOpenChange,
    products,
    onAddProduct,
    onUpdateProduct,
    onDeleteProduct,
    loading,
    initialView = "list",
    onSelectProduct,
    selectedProductId
}: ProductDrawerProps) {
    const [view, setView] = useState<"list" | "add" | "edit">("list");
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const { toast } = useToast();

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            dimensions: "",
            url: "",
            media: ""
        },
        mode: "onTouched",
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const logoInputRef = useRef<HTMLInputElement | null>(null);
    const mediaInputRef = useRef<HTMLInputElement | null>(null);

    const [dimHeight, setDimHeight] = useState("");
    const [dimWidth, setDimWidth] = useState("");
    const [dimLength, setDimLength] = useState("");
    const [unit, setUnit] = useState("cm");
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const isDirty = form.formState.isDirty || logoFile !== null;

    const handleSheetOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            if (["add", "edit"].includes(view) && isDirty) {
                setShowDiscardDialog(true);
            } else {
                onOpenChange(isOpen);
                // Reset view to list when closing
                setTimeout(() => setView("list"), 300);
            }
        } else {
            onOpenChange(isOpen);
        }
    };

    const handleDiscard = () => {
        setShowDiscardDialog(false);
        resetForm();
        setView("list");
        onOpenChange(false);
    };

    const convertValue = (val: string, from: string, to: string): string => {
        if (!val) return "";
        const num = parseFloat(val);
        if (isNaN(num)) return val;

        let inMm = num;
        if (from === "cm") inMm = num * 10;
        if (from === "inch") inMm = num * 25.4;

        let result = inMm;
        if (to === "cm") result = inMm / 10;
        if (to === "inch") result = inMm / 25.4;

        return Math.round(result * 100) / 100 + "";
    };

    const handleUnitChange = (newUnit: string) => {
        const h = convertValue(dimHeight, unit, newUnit);
        const w = convertValue(dimWidth, unit, newUnit);
        const l = convertValue(dimLength, unit, newUnit);

        setDimHeight(h);
        setDimWidth(w);
        setDimLength(l);
        setUnit(newUnit);
        updateFormDimensions(h, w, l, newUnit);
    };

    const updateFormDimensions = (h: string, w: string, l: string, u: string) => {
        const val = (h || w || l) ? `${h}*${w}*${l} ${u}` : "";
        form.setValue("dimensions", val, { shouldDirty: true });
    };

    const handleDimChange = (field: "h" | "w" | "l", value: string) => {
        if (value.startsWith(" ")) return;
        if (field === "h") setDimHeight(value);
        if (field === "w") setDimWidth(value);
        if (field === "l") setDimLength(value);

        const h = field === "h" ? value : dimHeight;
        const w = field === "w" ? value : dimWidth;
        const l = field === "l" ? value : dimLength;
        updateFormDimensions(h, w, l, unit);
    };

    useEffect(() => {
        if (!open) {
            resetForm();
            setSearchQuery("");
        } else {
            setView(initialView);
        }
    }, [open, initialView]);

    const resetForm = () => {
        form.reset({
            name: "",
            dimensions: "",
            url: "",
            media: "",
            // company_name: "",
        });
        setLogoPreview(null);
        setMediaPreview(null);
        setLogoFile(null);
        setMediaFile(null);
        setDimHeight("");
        setDimWidth("");
        setDimLength("");
        setUnit("cm");
        setEditingProduct(null);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
            toast({
                variant: "destructive",
                title: "Unsupported file format",
                description: "Please upload JPG, PNG, or WEBP images.",
            });
            return;
        }

        setMediaFile(file);
        form.setValue("media", file.name, { shouldTouch: true, shouldValidate: true });
        const reader = new FileReader();
        reader.onloadend = () => setMediaPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleMediaDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
            toast({
                variant: "destructive",
                title: "Unsupported file format",
                description: "Please upload JPG, PNG, or WEBP images.",
            });
            return;
        }

        setMediaFile(file);
        form.setValue("media", file.name, { shouldTouch: true, shouldValidate: true });
        const reader = new FileReader();
        reader.onloadend = () => setMediaPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const onSubmit = async (data: ProductFormValues) => {
        const productData: Product = {
            name: data.name,
            dimensions: data.dimensions,
            url: data.url,
            logo: logoFile || (editingProduct?.logo as any),
            media: mediaFile || (editingProduct?.media as any),
            // company_name: data.company_name,
        };

        if (editingProduct && editingProduct.id) {
            await onUpdateProduct({ ...productData, id: editingProduct.id });
            resetForm();
            setView("list");
        } else {
            onAddProduct(productData);
        }
    };

    const handleEditClick = (e: React.MouseEvent, product: Product) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingProduct(product);

        // Parse dimensions for local state
        let h = "", w = "", l = "", u = "cm";

        // Check if we have explicit dimensions from API first
        if (product.height !== undefined || product.width !== undefined || product.length !== undefined) {
            h = product.height?.toString() || "";
            w = product.width?.toString() || "";
            l = product.length?.toString() || "";
            // If dimensions field holds the unit (e.g. "cm")
            if (product.dimensions && !product.dimensions.includes("x")) {
                u = product.dimensions;
            } else if (product.dimensions) {
                // Try to extract unit if it is a combined string like "10x10x10 cm"
                const parts = product.dimensions.split(" ");
                if (parts.length > 1) u = parts[1];
            }
        }
        else if (product.dimensions) {
            try {
                const parsed = parseDimensions(product.dimensions);
                h = isNaN(parsed.height) ? "" : parsed.height.toString();
                w = isNaN(parsed.width) ? "" : parsed.width.toString();
                l = isNaN(parsed.length) ? "" : parsed.length.toString();
                u = parsed.dimensions || "cm";
            } catch (err) {
                console.error("Error parsing dimensions:", err);
            }
        }

        setDimHeight(h);
        setDimWidth(w);
        setDimLength(l);
        setUnit(u);

        // Handle previews
        if (product.logo) setLogoPreview(typeof product.logo === 'string' ? product.logo : null);
        else setLogoPreview(null);

        if (product.media) setMediaPreview(typeof product.media === 'string' ? product.media : null);
        else setMediaPreview(null);

        setLogoFile(null);
        setMediaFile(null);

        // Use reset to populate form and clear dirty state
        form.reset({
            name: product.name,
            url: product.url || "",
            dimensions: product.dimensions || "",
            media: product.media ? "existing" : "",
            // company_name: product.company_name || ""
        });

        setView("edit");
    };

    const handleDeleteClick = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation();
        setProductToDelete(product);
    };

    const removeLogo = () => setLogoPreview(null);
    const removeMedia = () => setMediaPreview(null);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Sheet open={open} onOpenChange={handleSheetOpenChange}>
                <SheetContent
                    className="w-full p-0 bg-white dark:bg-[#0f1724] border-l dark:border-gray-800"
                    onOpenAutoFocus={(e) => {
                        if (window.innerWidth < 1024) {
                            e.preventDefault();
                        }
                    }}
                >
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="px-6 pt-5 border-b dark:border-gray-800 flex items-center gap-4">
                            {view !== "list" && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="-ml-2 h-8 w-8 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                                    onClick={() => {
                                        if (isDirty) {
                                            setShowDiscardDialog(true);
                                        } else {
                                            // Directly reset when going back to list if not dirty
                                            resetForm();
                                            setView("list");
                                        }
                                    }}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <div className="flex-1">
                                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {view === "list" ? "View All Product" : (editingProduct ? "Edit Product" : "Add New Product")}
                                </SheetTitle>
                            </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {view === "list" ? (
                                <div className="space-y-6">
                                    {/* Search and Add Button */}
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search products..."
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    if (e.target.value.startsWith(" ")) return;
                                                    setSearchQuery(e.target.value);
                                                }}
                                                className="pl-9 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => {
                                                resetForm(); // Ensure fresh state
                                                setView("add");
                                            }}
                                            className="bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white shadow-md shadow-teal-500/20"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Product
                                        </Button>
                                    </div>

                                    {/* Product List */}
                                    <div className="space-y-3">
                                        {filteredProducts.length === 0 ? (
                                            <div className="text-center py-10 text-gray-500 dark:text-gray-400 flex flex-col items-center gap-4">
                                                <p>{searchQuery ? "No products found matching your search." : "No products added yet."}</p>
                                                {!searchQuery && (
                                                    <Button
                                                        onClick={() => {
                                                            onOpenChange(false);
                                                            navigate("/onboarding");
                                                        }}
                                                        className="bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white shadow-md shadow-teal-500/20"
                                                    >
                                                        <Dna className="h-4 w-4 mr-2" />
                                                        Generate Business DNA
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            filteredProducts.map((product, index) => {
                                                const isSelected = product.id === selectedProductId;
                                                return (
                                                    <div
                                                        key={product.id || index}
                                                        onClick={() => onSelectProduct?.(product)}
                                                        className={`group flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer shadow-sm relative pr-20
                                                        ${isSelected
                                                                ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-500 ring-1 ring-teal-500"
                                                                : "border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/30 hover:border-teal-400/50 dark:hover:border-teal-400/50 hover:shadow-md"
                                                            }`}
                                                    >
                                                        <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                                                            {(product.media || product.logo) ? (
                                                                <img
                                                                    src={(typeof product.media === 'string' ? product.media : typeof product.logo === 'string' ? product.logo : '') || ''}
                                                                    alt={product.name}
                                                                    className="h-full w-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        (e.target as HTMLImageElement).parentElement!.classList.add('fallback-icon');
                                                                    }}
                                                                />
                                                            ) : (
                                                                <ImageIcon className="h-6 w-6 text-gray-400" />
                                                            )}
                                                            {/* Fallback icon if image fails */}
                                                            <ImageIcon className="h-6 w-6 text-gray-400 hidden group-[.fallback-icon]:block" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                                {product.name}
                                                            </h3>
                                                            {/* <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {product.dimensions || "No dimensions"}
                                                        </p> */}
                                                        </div>

                                                        {product.status === "pending" ? (
                                                            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                                <Tooltip  >
                                                                    <TooltipTrigger asChild>
                                                                        <div className="relative group">
                                                                            <Loader2 className="h-5 w-5 text-gray-900 dark:text-gray-100 animate-spin" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-center">Helix is collecting product <br /> details from the website.</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        ) : (
                                                            < div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/50 dark:bg-black/50 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none rounded-lg p-1 sm:p-0 z-10">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                                                    onClick={(e) => { handleEditClick(e, product) }}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                    onClick={(e) => { handleDeleteClick(e, product) }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                        {/* Product Logo */}
                                        {/* <div className="space-y-2">
                                            <Label className="text-sm text-gray-700 dark:text-gray-200">Product Logo</Label>

                                            <div className="flex items-start gap-4"
                                                onDragOver={handleDragOver}
                                                onDrop={handleLogoDrop}>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => logoInputRef.current?.click()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") logoInputRef.current?.click();
                                                    }}
                                                    className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-400 flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative group bg-gray-50 dark:bg-transparent"
                                                    aria-label="Upload product logo"
                                                >
                                                    {logoPreview ? (
                                                        <>
                                                            <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                                                                aria-label="Remove logo"
                                                                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 hover:opacity-90"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="text-center p-2">
                                                            <ImageIcon className="h-6 w-6 mx-auto text-gray-400 dark:text-gray-400 mb-1" />
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">Upload</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />

                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                                                    Upload your product logo. Recommended size: 512×512px.
                                                </div>
                                            </div>
                                        </div> */}

                                        {/* <FormField
                                            control={form.control}
                                            name="company_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm text-gray-700 dark:text-gray-200">Company Name <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g. RunHelix"
                                                            {...field}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
                                                                field.onChange(capitalized);
                                                            }}
                                                            className="bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        /> */}

                                        {/* Product Name */}
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm text-gray-700 dark:text-gray-200">Product Name <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g. Helix Smart Watch"
                                                            {...field}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val.startsWith(" ")) return;
                                                                const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
                                                                field.onChange(capitalized);
                                                            }}
                                                            className="bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm text-gray-700 dark:text-gray-200">Product Page Web URL</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-400" />
                                                            <Input
                                                                className="pl-9 bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                                                placeholder="https://..."
                                                                {...field}
                                                                onChange={(e) => {
                                                                    if (e.target.value.startsWith(" ")) return;
                                                                    field.onChange(e);
                                                                }}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {/* Add Media */}
                                        <FormField
                                            control={form.control}
                                            name="media"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm text-gray-700 dark:text-gray-200">Add Media <span className="text-red-500">*</span></FormLabel>

                                                    <div
                                                        onClick={() => mediaInputRef.current?.click()}
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") mediaInputRef.current?.click();
                                                        }}
                                                        onDragOver={handleDragOver}
                                                        onDrop={handleMediaDrop}
                                                        className="w-full h-36 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-400 flex flex-col items-center justify-center cursor-pointer transition-colors relative group overflow-hidden bg-gray-50 dark:bg-transparent"
                                                        aria-label="Upload product media"
                                                    >
                                                        {mediaPreview ? (
                                                            <>
                                                                <img src={mediaPreview} alt="Media preview" className="h-full w-full object-contain" />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeMedia();
                                                                        form.setValue("media", "");
                                                                        setMediaFile(null);
                                                                    }}
                                                                    aria-label="Remove media"
                                                                    className="absolute top-2 right-2 dark:bg-white/50 rounded-full p-1 hover:opacity-90"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="h-8 w-8 text-gray-400 dark:text-gray-400 mb-2" />
                                                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Click to upload product image</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Supports JPG, PNG, WEBP</p>
                                                            </>
                                                        )}
                                                    </div>

                                                    <input
                                                        type="file"
                                                        ref={mediaInputRef}
                                                        className="hidden"
                                                        accept="image/jpeg, image/png, image/webp"
                                                        onChange={(e) => {
                                                            handleMediaUpload(e);
                                                        }}
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Two column row */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2 col-span-1 sm:col-span-2">
                                                <FormLabel className="text-sm text-gray-700 dark:text-gray-200">Dimensions</FormLabel>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="space-y-2">
                                                        <FormLabel className="text-sm text-gray-700 dark:text-gray-200">Height</FormLabel>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                value={dimHeight}
                                                                onChange={(e) => handleDimChange("h", e.target.value)}
                                                                className="bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-2 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <div className="w-[80px]">
                                                                <Select value={unit} onValueChange={handleUnitChange}>
                                                                    <SelectTrigger className="bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                                                        <SelectValue placeholder="Unit" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="mm">mm</SelectItem>
                                                                        <SelectItem value="cm">cm</SelectItem>
                                                                        <SelectItem value="inch">inch</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <FormLabel className="text-sm text-gray-700 dark:text-gray-200">Width</FormLabel>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                value={dimWidth}
                                                                onChange={(e) => handleDimChange("w", e.target.value)}
                                                                className="bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-2 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <div className="w-[80px]">
                                                                <Select value={unit} onValueChange={handleUnitChange}>
                                                                    <SelectTrigger className="bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                                                        <SelectValue placeholder="Unit" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="mm">mm</SelectItem>
                                                                        <SelectItem value="cm">cm</SelectItem>
                                                                        <SelectItem value="inch">inch</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <FormLabel className="text-sm text-gray-700 dark:text-gray-200">Length</FormLabel>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                value={dimLength}
                                                                onChange={(e) => handleDimChange("l", e.target.value)}
                                                                className="bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-2 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <div className="w-[80px]">
                                                                <Select value={unit} onValueChange={handleUnitChange}>
                                                                    <SelectTrigger className="bg-white/90 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                                                        <SelectValue placeholder="Unit" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="mm">mm</SelectItem>
                                                                        <SelectItem value="cm">cm</SelectItem>
                                                                        <SelectItem value="inch">inch</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </Form>
                            )}
                        </div>

                        {/* Footer */}
                        {view !== "list" && (
                            <div className="p-6 border-t dark:border-gray-800 bg-white dark:bg-[#0f1724]">
                                <div className="flex gap-3 dark:text-white">
                                    <Button variant="outline" className="flex-1" onClick={() => {
                                        if (isDirty) {
                                            setShowDiscardDialog(true);
                                        } else {
                                            resetForm();
                                            setView("list");
                                        }
                                    }}>
                                        Cancel
                                    </Button>
                                    <Button onClick={form.handleSubmit(onSubmit)} disabled={loading} className="flex-1 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600">
                                        {loading ? <>{commonSvgIcon("loader")} </> : "Save"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet >

            <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
                <AlertDialogContent
                    className="bg-[#111213] border-[#1f2123] rounded-xl max-w-[400px] p-6"
                >
                    <AlertDialogHeader className="space-y-3">
                        <AlertDialogTitle className="text-xl font-bold text-white text-center">Unsaved changes!</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400 text-center text-base">
                            If you discard changes, you'll delete any edits you made since you last saved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col space-y-3 sm:space-y-3 sm:flex-col mt-6">
                        <AlertDialogAction
                            onClick={handleDiscard}
                            className="w-full bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] hover:opacity-90 text-black font-semibold h-11 rounded-lg transition-opacity"
                        >
                            Discard Changes
                        </AlertDialogAction>
                        <AlertDialogCancel className="w-full bg-[#1A1A1A] hover:bg-[#252525] text-white border-none h-11 rounded-lg mt-0">
                            Cancel
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!productToDelete} onOpenChange={(val) => !val && setProductToDelete(null)}>
                <AlertDialogContent className="bg-[#111213] border-[#1f2123] rounded-xl max-w-[400px] p-6">
                    <AlertDialogHeader className="space-y-3">
                        <AlertDialogTitle className="text-xl font-bold text-white text-center">Delete Product?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400 text-center text-base">
                            Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col space-y-3 sm:space-y-3 sm:flex-col mt-6">
                        <AlertDialogAction
                            onClick={() => {
                                if (productToDelete && productToDelete.id) {
                                    onDeleteProduct(productToDelete.id);
                                    setProductToDelete(null);
                                }
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11 rounded-lg transition-colors"
                        >
                            Delete Product
                        </AlertDialogAction>
                        <AlertDialogCancel
                            onClick={() => setProductToDelete(null)}
                            className="w-full bg-[#1A1A1A] hover:bg-[#252525] text-white border-none h-11 rounded-lg mt-0"
                        >
                            Cancel
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}