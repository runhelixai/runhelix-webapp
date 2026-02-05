export interface Generation {
    id: string | number;
    title: string;
    date: string;
    videoUrl?: string;
    imageUrl?: string;
    status?: "pending" | "completed" | "failed";
    mode?: "image-to-image" | "text-to-video" | "image-to-video";
    user_content?: string;
}

export interface GeneratedMedia {
    id?: string | number;
    url: string;
    title: string;
    user_content?: string;
    created_at: string;
    status?: string;
    mode: "image-to-image" | "image-to-video";
}

export interface Product {
    name: string;
    logo?: File | string;
    media?: File | string;
    dimensions?: string;
    url?: string;
    id?: string;
    created_at?: string;
    user_id?: string;
    content?: string;
    title?: string;
    height?: number;
    width?: number;
    length?: number;
    company_name?: string;
    status?: string;
}
export interface PaymentDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    planId: string;
    planName: string;
    price: string;
    onConfirm: (transId: string) => void;
}

export type UploadImageToFolder = (
    folderName: string,
    file: File
) => Promise<string | null>;