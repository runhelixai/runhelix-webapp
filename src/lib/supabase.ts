import { createClient } from "@supabase/supabase-js";
import { dataUrlToBlob } from "./utils";
import { config } from "./config";
import { useAuth } from "./auth";

const supabaseUrl = config?.supabaseURL;
const supabaseAnonKey = config?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

type Filter = {
  key: string;
  op: string;
  value: any;
};

type SupaBaseGetParams = {
  tableName: string;
  select?: string;
  filters?: Filter[];
  isSingle?: boolean;
  limit?: number;
  withCount?: boolean;
  orderBy?: SupaBaseOrder;
  foreignLimits?: { table: string; count: number }[];
};

type SupaBaseInsertParams = {
  tableName: string;
  payload: Record<string, any> | Record<string, any>[];
  isSingle?: boolean;
  select?: string;
};

type SupaBaseUpdateParams = {
  tableName: string;
  payload: Record<string, any>;
  filters?: Filter[];
  isSingle?: boolean;
  select?: string;
  isUpsert?: boolean;
  conflictKey?: string | string[];
};

type SupaBaseDeleteParams = {
  tableName: string;
  filters: Filter[];
};
type SupaBaseOrder = {
  column: string;
  ascending?: boolean;
};
export const useSupabase = () => {
  const { userProfile } = useAuth();

  const supabaseStorageUpload = async (bucket: string, path: string, file: Blob | File, options?: { upsert?: boolean; contentType?: string }) => {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, options);
      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error("Storage upload failed:", err.message);
      return { error: err.message };
    }
  };

  const supabaseStorageGetPublicUrl = (bucket: string, path: string) => {
    // Return relative path; UI will prefix with config.supabaseURL
    const publicUrl = `/storage/v1/object/public/${bucket}/${path}`;
    return { publicUrl } as { publicUrl: string };
  };
  const uploadImageToStorage = async (userId: string, groupId: string, view: string, version: number, dataUrl: string) => {
    const blob = dataUrlToBlob(dataUrl);
    const filePath = `${userId}/${groupId}/${view}/v${version}.png`;
    const { data: upRes, error: upErr }: any = await supabaseStorageUpload("nimora-ai", filePath, blob, { upsert: true, contentType: "image/png" });
    if (upErr) throw new Error(upErr);
    const { publicUrl, error: pubErr }: any = supabaseStorageGetPublicUrl("nimora-ai", upRes?.path || filePath);
    if (pubErr) throw new Error(pubErr);
    return publicUrl as string;
  };
  const supaBaseGet = async ({ tableName, select = "*", filters = [], isSingle = false, limit, withCount = false, orderBy, foreignLimits = [] }: SupaBaseGetParams) => {
    try {
      let query = supabase.from(tableName).select(select, withCount ? { count: "exact" } : undefined);

      filters?.forEach(({ key, op, value }) => {
        // @ts-ignore – Supabase methods are chainable
        query = op === "not" ? query.not(key, "eq", value) : query[op](key, value);
      });

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }
      if (limit) query = query.limit(limit);

      // Apply limits to embedded relations (foreign tables)
      foreignLimits.forEach(({ table, count }) => {
        // @ts-ignore – supabase-js supports foreignTable option
        query = query.limit(count, { foreignTable: table });
      });

      const data: any = isSingle ? await query.single() : await query;
      if (data?.error) throw data.error;

      return data;
    } catch (err: any) {
      console.error("Fetch failed:", err.message);
      return { error: err.message };
    }
  };

  const supaBaseInsert = async ({ tableName, payload, select = "*", isSingle = true }: SupaBaseInsertParams) => {
    try {
      const query = supabase.from(tableName).insert(payload).select(select);
      const data: any = isSingle ? await query.single() : await query;
      if (data?.error) throw data.error;

      return data;
    } catch (err: any) {
      console.error("Insert failed:", err.message);
      return { error: err.message };
    }
  };

  const supaBaseUpdate = async ({ tableName, payload, conflictKey = "id", filters = [], isSingle = false, select = "*", isUpsert = false }: SupaBaseUpdateParams) => {
    try {
      let query = isUpsert
        ? supabase
          .from(tableName)
          .upsert(payload, {
            onConflict: Array.isArray(conflictKey) ? conflictKey.join(",") : conflictKey,
          })
          .select(select)
        : supabase.from(tableName).update(payload).select(select);

      filters.forEach(({ key, op, value }) => {
        // @ts-ignore
        query = op === "not" ? query.not(key, "eq", value) : query[op](key, value);
      });

      const data: any = isSingle ? await query.single() : await query;
      if (data?.error) throw data.error;

      return data;
    } catch (err: any) {
      console.error("Update failed:", err.message);
      return { error: err.message };
    }
  };

  const supaBaseDelete = async ({ tableName, filters = [] }: SupaBaseDeleteParams) => {
    try {
      let query = supabase.from(tableName).delete();

      filters.forEach(({ key, value }) => {
        query = query.eq(key, value);
      });

      const data: any = await query;
      if (data?.error) throw data.error;

      return data;
    } catch (err: any) {
      console.error("Delete failed:", err.message);
      return { error: err.message };
    }
  };
  return {
    userProfile,
    supaBaseGet,
    supaBaseInsert,
    supaBaseUpdate,
    supaBaseDelete,
    supabaseStorageUpload,
    supabaseStorageGetPublicUrl,
    uploadImageToStorage
  };
};
