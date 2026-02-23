import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface VideoModelOption {
  label: string;    // model_name from credits_management
  value: string;    // video_model from credits_management
  creditId: string; // id (credit_id) from credits_management
}

/**
 * DB enum values for public.VIDEO_TYPE:
 *   "ugc"  → UGC-only models
 *   "both" → models available in both UGC and Promotional
 *
 * Filter rules:
 *   UI "UGC Testimonials" → fetch where video_type IN ('ugc', 'both')
 *   UI "Promotional"      → fetch where video_type = 'both' only
 */
export function useVideoModels(videoType: string | undefined) {
  const [models, setModels] = useState<VideoModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoType) {
      setModels([]);
      return;
    }

    // Only handle the two video types that show the model dropdown
    if (videoType !== "UGC Testimonials" && videoType !== "Promotional") {
      setModels([]);
      return;
    }

    let cancelled = false;

    const fetchModels = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("credits_management")
          .select("id, model_name, video_model")
          .not("video_model", "is", null)
          .order("model_name", { ascending: true });

        if (videoType === "UGC Testimonials") {
          // Show ugc-only models AND shared ("both") models
          query = query.in("video_type", ["ugc", "both"]);
        } else {
          // Promotional → show ONLY shared ("both") models
          query = query.eq("video_type", "both");
        }

        const { data, error: fetchError } = await query;

        if (cancelled) return;

        if (fetchError) {
          console.error("useVideoModels: fetch error", fetchError.message);
          setError(fetchError.message);
          setModels([]);
          return;
        }

        // De-duplicate by model_name so every distinct display name appears,
        // even if multiple rows share the same video_model API identifier
        // (e.g. same model at different durations/resolutions).
        const seen = new Set<string>();
        const options: VideoModelOption[] = [];
        (data ?? []).forEach((row: { id: string; model_name: string; video_model: string }) => {
          if (!seen.has(row.model_name)) {
            seen.add(row.model_name);
            options.push({ label: row.model_name, value: row.video_model, creditId: row.id });
          }
        });

        setModels(options);
      } catch (err: any) {
        if (!cancelled) {
          console.error("useVideoModels: unexpected error", err);
          setError(err?.message ?? "Unknown error");
          setModels([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, [videoType]);

  return { models, loading, error };
}
