import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { commonSvgIcon } from "@/helpers/commonSvg";
import { getDriveConnection, removeDriveConnection } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { commonApiEndpoints } from "@/helpers/commonApiEndpoints";

const CONFIG = {
    REDIRECT_URI: "https://populationless-basally-dani.ngrok-free.dev/generate",
    CLIENT_ID: "956179405136-udorbfhqq3ac8tfqm3s3v0i7ed2gdp8o.apps.googleusercontent.com",
    SCOPES: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive.metadata.readonly", "https://www.googleapis.com/auth/drive.readonly"],
};

type User = { id?: string } | null;
type Props = { user?: User, setDriveConnected?: (connected: boolean) => void };

const STATE_KEY = "gdrive_oauth_state";

const makeState = () => {
    try {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const s = Array.from(array)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        sessionStorage.setItem(STATE_KEY, s);
        return s;
    } catch (e) {
        const s = Math.random().toString(36).slice(2);
        sessionStorage.setItem(STATE_KEY, s);
        return s;
    }
};

const getStoredState = () => sessionStorage.getItem(STATE_KEY);
const clearStoredState = () => sessionStorage.removeItem(STATE_KEY);

export function GoogleDriveSingle({ user, setDriveConnected }: Props) {
    const { toast } = useToast();
    const [status, setStatus] = useState<"idle" | "starting" | "redirecting" | "sending" | "success" | "failed">("idle");
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        const returnedState = params.get("state");
        if (!code && !error) return;

        if (error) {
            setStatus("failed");
            setMessage(`Google error: ${error}`);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            clearStoredState();
            return;
        }

        // validate state to protect against CSRF
        const expectedState = getStoredState();
        if (expectedState && returnedState !== expectedState) {
            setStatus("failed");
            setMessage("State mismatch — possible CSRF attack.");
            clearStoredState();
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (code) {
            exchangeCode(code, user?.id || "", error || "");
        }
    }, []);

    useEffect(() => {
        (async () => {
            const res = await getDriveConnection(user?.id);
            if (res?.length) {
                setDriveConnected(true);
                setStatus("success");
            }
        })()
    }, []);

    const exchangeCode = async (code: string, userId: string, error: string) => {
        setStatus("sending");
        setMessage("Connecting...");
        try {
            const response = await fetch(commonApiEndpoints.GOOGLE_DRIVE_CALLBACK, {
                method: "POST",
                headers: { "Content-Type": "application/json", accept: "application/json" },
                body: JSON.stringify({ auth_code: code, error, state: userId }),
            });

            if (response.ok) {
                setDriveConnected(true);
                setStatus("success");
                setMessage("Drive connected!");
                toast({
                    title: "Drive connected",
                    description: "Your Google Drive has been connected.",
                });
                clearStoredState();
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Exchange failed:", errorData);
                setStatus("failed");
                setMessage(errorData?.message || "Connection failed.");
                toast({
                    variant: "destructive",
                    title: "Drive connection failed",
                    description: errorData?.message || "Connection failed.",
                });
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (err) {
            setStatus("failed");
            setMessage("Network error.");
            clearStoredState();
            window.history.replaceState({}, document.title, window.location.pathname);
            toast({
                variant: "destructive",
                title: "Drive connection failed",
                description: "Network error.",
            });
        }
    };

    const handleDisconnect = async () => {
        if (!user?.id) return;
        // const revokeGoogleAccess = async (accessToken: string) => {
        //     try {
        //         await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`,
        //             { method: "POST", headers: { "Content-type": "application/x-www-form-urlencoded" } }
        //         );
        //         console.log("Google Drive disconnected");
        //     } catch (error) {
        //         console.error("Failed to revoke access", error);
        //     }
        // };

        // await revokeGoogleAccess("1//0gzLfjI4EmO_bCgYIARAAGBASNwF-L9IrsaueqVxyeT3ZPXgm3Qyfm0s4U48p4S_uKHcF6oQZTAm3tnP__l6dRIfHqL04IFZ6y3Q")

        await removeDriveConnection(user.id);
        toast({
            title: "Drive disconnected",
            description: "Your Google Drive has been disconnected.",
        });
        setDriveConnected(false);
        setStatus("idle");
        setMessage(null);
    };

    const handleConnect = async (status: string) => {
        if (status === "success") {
            handleDisconnect();
        } else {
            if (!window || !(window as any).google || !(window as any).google.accounts?.oauth2) {
                toast({
                    title: "Drive connection failed",
                    description: "Google API not loaded.",
                });
                return;
            }

            try {
                const state = makeState(); // store state so we can validate on return
                const client = (window as any).google.accounts.oauth2.initCodeClient({
                    client_id: CONFIG.CLIENT_ID,
                    scope: CONFIG.SCOPES.join(" "),
                    ux_mode: "redirect",
                    redirect_uri: CONFIG.REDIRECT_URI,
                    state,
                    prompt: "consent",
                    access_type: "offline",
                });

                setStatus("redirecting");
                client.requestCode();
            } catch (err) {
                console.error(err);
                setStatus("failed");
                toast({
                    variant: "destructive",
                    title: "Drive connection failed",
                    description: "Failed to init OAuth.",
                });
            }
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button
                onClick={() => handleConnect(status)}
                variant="secondary"
                className="gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                disabled={status === "starting" || status === "redirecting" || status === "sending"}
            >
                {status === "sending" || status === "redirecting" ? <Loader2 className="w-4 h-4 animate-spin" /> : commonSvgIcon("google")}
                {status === "success" ? "Drive Disconnected" : "Connect Drive"}
            </Button>
        </div>
    );
}
