const API_BASE_URL = import.meta.env.VITE_PYTHON_API;

export const commonApiEndpoints = {
    // Media Generation
    IMAGE_GENERATION: `${API_BASE_URL}/v1/media/image/generation`,
    VIDEO_WEBHOOK: `${API_BASE_URL}/v1/video-generation/webhook`,
    PROMO_VIDEO_WEBHOOK: `${API_BASE_URL}/v1/promo/video-generation/webhook`,
    GEMINI_PROMO_VIDEO_WEBHOOK: `${API_BASE_URL}/v1/gemini/promo/video-generation/webhook`,
    PROMO_TRANSITION_VIDEO_WEBHOOK: `${API_BASE_URL}/v1/promo/transition-video-generation/webhook`,

    // Website Scraping
    WEBSITE_UPDATE_SCRAPER: `${API_BASE_URL}/v1/website/update-scraper`,
    WEBSITE_SCRAPE: `${API_BASE_URL}/v1/website/scrape-v2`,
    WEBSITE_SCRAPE_LINK: `${API_BASE_URL}/v1/website/scrape`,
    VIDEO_TRIM: `${API_BASE_URL}/video-trim`,

    // Google Drive
    GOOGLE_DRIVE_CALLBACK: `${API_BASE_URL}/v1/google-drive/auth/callback`,
    GOOGLE_DRIVE_UPLOAD: `${API_BASE_URL}/v1/google-drive/files/upload`,


    // Supabase Functions
    // PAYMENT_CLIENT_KEY: "rapid-api",
    // PAYMENT_TRANSACTION_DETAILS: "smart-action",
    // PAYMENT_CUSTOM_PROCESS: "hyper-api",

    // live
    PAYMENT_CLIENT_KEY: "get-client-key",
    PAYMENT_TRANSACTION_DETAILS: "get-transaction-details",
    PAYMENT_CUSTOM_PROCESS: "process-payment",

    // PAYMENT_CREATE_TOKEN: "api/create-payment-token",

    // External Scripts/APIs
    AUTHORIZE_NET_SCRIPT: "https://js.authorize.net/v1/Accept.js",
};