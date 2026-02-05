import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabase";
import { UploadImageToFolder } from "@/types";
import { commonApiEndpoints } from "@/helpers/commonApiEndpoints";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
};

export function linkToBase64(input) {
  const isBase64DataURL = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)?;base64,/.test(
    input
  );

  if (isBase64DataURL) {
    return Promise.resolve(input);
  }

  return fetch(input, { mode: "cors" }) // ensure CORS mode
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const contentType = response.headers.get("Content-Type") || "image/png";

      return response.blob().then((blob) => ({ blob, contentType }));
    })
    .then(
      ({ blob, contentType }) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => {
            let base64data: any = reader.result;

            // Force replace the MIME type if it's wrong
            // base64data = base64data.replace(/^data:.*?;base64,/, ``);
            resolve(base64data);
          };

          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}

export const renameUserPrompt = async ({ idStr, value }: { idStr: string; value: string }) => {
  const { data, error } = await supabase
    .from('generated_videos')
    .update({ user_content: value.trim() })
    .eq('id', idStr)
    .select()

  if (error) throw new Error(error.message);
  return data;
}

export const mergeGuestVideosOnLogin = async () => {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const session_id = localStorage.getItem("session_id");
  if (!user || !session_id) return;

  await supabase
    .from("generated_videos")
    .update({ user_id: user.id, session_id: null })
    .eq("session_id", session_id);

  localStorage.removeItem("session_id");
};

export const uploadImageToFolder: UploadImageToFolder = async (
  folderName,
  file
) => {
  if (!file) throw new Error("file is required");
  try {
    const fileExt = file?.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    // Upload file to Supabase
    const { error: uploadError } = await supabase.storage
      .from("product-image")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("product-image").getPublicUrl(filePath);

    return data?.publicUrl ?? null;
  } catch (err) {
    console.error(err);
    throw err;
  }
};


export const addProductImage = async (ProductData: any) => {
  const { data, error } = await supabase
    .from('products')
    .insert([ProductData])
    .select("*")

  if (error) throw error;

  return data;
};

export const getProductImage = async (userId: string) => {
  const { data, error } = await supabase
    .from('products')
    .select("*")
    .eq("user_id", userId)
    .order('created_at', { ascending: false })

  if (error) throw error;

  return data;
}

export const updateProduct = async (ProductData: any) => {
  try {
    const formData = new FormData();
    for (const key in ProductData) {
      if (ProductData[key] !== null && ProductData[key] !== undefined) {
        formData.append(key, ProductData[key]);
      }
    }

    const response = await fetch(commonApiEndpoints.WEBSITE_UPDATE_SCRAPER, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }

    if (!response.ok) {
      throw new Error(data.error || text || "Failed to update product");
    }

    return data;
  } catch (err: any) {
    console.error("Error updating product:", err);
    throw err;
  }
};

export const deleteProduct = async (productId: string) => {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) throw error;
  return true;
};

export const updateProductImage = async (ProductData: { id: number; title?: string | null; text_content?: string | null; }) => {
  const { data, error } = await supabase
    .from("products")
    .update({ title: ProductData.title, content: ProductData.text_content })
    .eq("id", ProductData.id)
    .select("*");

  if (error) throw error;
  return data;
};


export async function scrapeWebsite(productData: any, endpoint: string = commonApiEndpoints.WEBSITE_SCRAPE) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(productData),
    });

    // read raw text first (because JSON may fail on some errors)
    const text = await response.text();

    // try to parse json
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text }; // fallback for non-json response
    }

    if (!response.ok) {
      return data
    }

    return data
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

export async function scrapeWebsiteLink(productData: any) {
  try {
    const formData = new FormData();
    for (const key in productData) {
      formData.append(key, productData[key]);
    }
    const response = await fetch(commonApiEndpoints.WEBSITE_SCRAPE_LINK, {
      method: "POST",
      headers: {
        Accept: "application/json", // DO NOT add Content-Type for FormData
      },
      body: formData,
    });

    // read raw text first (because JSON may fail on some errors)
    const text = await response.text();

    // try to parse json
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text }; // fallback for non-json response
    }

    if (!response.ok) {
      return data
    }

    return data
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

export function parseDimensions(dimString: string) {
  const parts = dimString.trim().split(" ");

  const sizePart = parts[0];
  const unit = parts[1] || "";

  const [height, width, length] = sizePart
    .split("*")
    .map(v => Number(v.trim()));

  return {
    height,
    width,
    length,
    dimensions: unit
  };
}

export const getDriveConnection = async (userId: string) => {
  let { data, error } = await supabase
    .from('google_drive_tokens')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error;

  return data;
}

export const removeDriveConnection = async (userId: string) => {
  let { data, error } = await supabase
    .from('google_drive_tokens')
    .delete()
    .eq('user_id', userId)
  if (error) throw error;

  return data;
}