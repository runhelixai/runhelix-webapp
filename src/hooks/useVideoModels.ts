import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export interface VideoModelOption {
  label: string;    // model_name from credits_management
  value: string;    // video_model from credits_management
  creditId: string; // id (credit_id) from credits_management
  resolution: string | null; // resolution from credits_management
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
  const [allRows, setAllRows] = useState<VideoModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoType) {
      setAllRows([]);
      return;
    }

    // Only handle the two video types that show the model dropdown
    if (videoType !== "UGC Testimonials" && videoType !== "Promotional") {
      setAllRows([]);
      return;
    }

    let cancelled = false;

    const fetchModels = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("credits_management")
          .select("id, model_name, video_model, resolution")
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
          setAllRows([]);
          return;
        }

        const rows: VideoModelOption[] = (data ?? []).map(
          (row: { id: string; model_name: string; video_model: string; resolution: string | null }) => ({
            label: row.model_name,
            value: row.video_model,
            creditId: row.id,
            resolution: row.resolution ?? null,
          })
        );

        setAllRows(rows);
      } catch (err: any) {
        if (!cancelled) {
          console.error("useVideoModels: unexpected error", err);
          setError(err?.message ?? "Unknown error");
          setAllRows([]);
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

  /**
   * Unique model display names (for the model dropdown).
   * If a model has multiple resolutions, all rows share the same model_name
   * but differ only in resolution — we show the model name once in the dropdown.
   *
   * Normalises labels with .trim() before the dedup comparison so that
   * trailing-space or case differences in the DB don't produce duplicates.
   */
  const models: VideoModelOption[] = useMemo(() => {
    const seen = new Set<string>();
    const result: VideoModelOption[] = [];
    for (const row of allRows) {
      // Normalise: trim whitespace so "Model " and "Model" collapse to one entry
      const normalised = row.label.trim().toLowerCase();
      if (!seen.has(normalised)) {
        seen.add(normalised);
        // Store the trimmed label so the UI is always clean
        result.push({ ...row, label: row.label.trim() });
      }
    }
    return result;
  }, [allRows]);

  /**
   * Get all resolutions available for a given model_name.
   *
   * A single DB row may store multiple resolutions as a comma-separated string
   * (e.g. "720p, 1080p"). We split these into individual options so each
   * resolution appears as its own separate dropdown item.
   *
   * Returns [] when the model has only one effective resolution option
   * (i.e. no dropdown needed).
   */
  const getResolutionsForModel = (modelLabel: string): VideoModelOption[] => {
    const normalisedLabel = modelLabel.trim().toLowerCase();
    const rows = allRows.filter(
      (r) => r.label.trim().toLowerCase() === normalisedLabel && r.resolution
    );

    // Expand comma-separated resolution strings into individual entries
    const expanded: VideoModelOption[] = [];
    for (const row of rows) {
      const parts = (row.resolution ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const part of parts) {
        expanded.push({ ...row, resolution: part });
      }
    }

    // De-duplicate by resolution label (guard against duplicate DB rows)
    const seen = new Set<string>();
    const unique = expanded.filter((opt) => {
      if (seen.has(opt.resolution!)) return false;
      seen.add(opt.resolution!);
      return true;
    });

    // Only show the dropdown when there are 2+ distinct options
    if (unique.length <= 1) return [];
    return unique;
  };

  /**
   * Find the credit_id for a specific model + resolution combination.
   */
  const getCreditIdForModelAndResolution = (
    modelLabel: string,
    resolution: string | null
  ): string => {
    if (!resolution) {
      return allRows.find((r) => r.label === modelLabel)?.creditId ?? "";
    }
    return (
      allRows.find((r) => r.label === modelLabel && r.resolution === resolution)?.creditId ?? ""
    );
  };

  return { models, allRows, loading, error, getResolutionsForModel, getCreditIdForModelAndResolution };
}
