import { supabase } from "@/lib/supabase"

const getPlanDetails = async () => {
    const { data, error } = await supabase
        .from('plan')
        .select('*')
        .order("sequence", { ascending: true });

    if (error) {
        console.error("Error fetching plans:", error);
        return [];
    }
    return data || [];
}


const getPaymentHistory = async (userId: string) => {
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching payments:", error);
        return [];
    }
    return data || [];
}

const trimVideo = async (payload: { video_id: string; trim_startat: number; trim_endat: number; trim_request_id?: string }) => {
    try {
        const { commonApiEndpoints } = await import("@/helpers/commonApiEndpoints");
        const response = await fetch(commonApiEndpoints.VIDEO_TRIM, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || error.message || "Failed to trim video");
        }

        return await response.json();
    } catch (error) {
        console.error("Error trimming video:", error);
        throw error;
    }
}

export { getPlanDetails, getPaymentHistory, trimVideo }