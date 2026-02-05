import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const VERSION_STORAGE_KEY = "app_version";
const TABLE_NAME = "version_control";

export const useVersionControl = () => {
  useEffect(() => {
    const performUpdate = (newVersion: string | number) => {
      console.log("Version mismatch detected. Performing hard refresh...");
      localStorage.setItem(VERSION_STORAGE_KEY, String(newVersion));
      window.location.reload();
    };

    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select("version")
          .single();

        if (error) {
          console.error("Error fetching version:", error);
          return;
        }

        if (data) {
          const remoteVersion = data.version;
          const localVersion = localStorage.getItem(VERSION_STORAGE_KEY);

          let currentLocalVersion = localVersion;

          if (!currentLocalVersion) {
            // For existing users (or new ones), default to "1" so they check for updates
            currentLocalVersion = "1";
            localStorage.setItem(VERSION_STORAGE_KEY, currentLocalVersion);
          }

          if (String(currentLocalVersion) !== String(remoteVersion)) {
            // Version mismatch
            performUpdate(remoteVersion);
          }
        }
      } catch (err) {
        console.error("Unexpected error checking version:", err);
      }
    };

    // Initial check
    checkVersion();

    // Subscribe to changes
    const channel = supabase
      .channel("version_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: TABLE_NAME,
        },
        (payload) => {
          console.log("Realtime payload received:", payload);
          const updatedVersion = payload.new.version;
          const localVersion = localStorage.getItem(VERSION_STORAGE_KEY);

          console.log("Verifying version update:", { localVersion, updatedVersion });

          if (localVersion && String(localVersion) !== String(updatedVersion)) {
            performUpdate(updatedVersion);
          }
        }
      )
      .subscribe((status) => {
        console.log("Supabase Realtime Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {};
};
