import { supabase } from "@/lib/supabase";
import { commonApiEndpoints } from "@/helpers/commonApiEndpoints";

const getClientKey = async () => {
    const { data, error } = await supabase.functions.invoke(commonApiEndpoints.PAYMENT_CLIENT_KEY, {
        body: {},
    })
    if (error) throw error;
    return data;
}

const getTransactionDetails = async (transactionId: string) => {
    const { data, error } = await supabase.functions.invoke(commonApiEndpoints.PAYMENT_TRANSACTION_DETAILS,
        { body: { transactionId }, }
    );
    if (error) throw error;
    return data;
}

const processCustomPayment = async (paymentData: {
    amount: number; paymentNonce: string; dataDescriptor: string; email: string, planId: string
}) => {
    console.log("[paymentService] processCustomPayment called with:", JSON.stringify({ ...paymentData, paymentNonce: "***" })); // Log inputs sans nonce
    const { data, error } = await supabase.functions.invoke(commonApiEndpoints.PAYMENT_CUSTOM_PROCESS, {
        body: paymentData,
    });

    if (error) {
        console.error("[paymentService] processCustomPayment error:", error);
        throw error;
    }
    console.log("[paymentService] processCustomPayment success data:", data);
    return data;
}

// const processPayment = async (amount: number) => {
//     const { data, error } = await supabase.functions.invoke(commonApiEndpoints.PAYMENT_CREATE_TOKEN, { body: { amount } });

//     if (error) throw error;
//     return data;
// }

const sendPaymentConfirmation = async (paymentDetails: {
    email: string;
    amount: number;
    currency: string;
    transaction_id: string;
    date: string;
}) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_PYTHON_API}/v1/email/payment-confirmation`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentDetails),
        });

        if (!response.ok) {
            console.error("[paymentService] sendPaymentConfirmation failed:", response.statusText);
            // Not throwing error to avoid interrupting the main flow, assuming this is a side effect
            return null; 
        }

        const data = await response.json();
        console.log("[paymentService] sendPaymentConfirmation success:", data);
        return data;
    } catch (error) {
        console.error("[paymentService] sendPaymentConfirmation error:", error);
        // Not throwing error to avoid interrupting the main flow
        return null; 
    }
}

export { getClientKey, getTransactionDetails, processCustomPayment, sendPaymentConfirmation }
