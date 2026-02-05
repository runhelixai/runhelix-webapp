
export const sendAuthEmail = async (email: string, name: string) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_PYTHON_API}/v1/email/welcome-beta`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                name
            }),
        });

        if (!response.ok) {
            console.error("[emailService] sendAuthEmail failed:", response.statusText);
            return null;
        }

        const data = await response.json();
        console.log("[emailService] sendAuthEmail success:", data);
        return data;
    } catch (error) {
        console.error("[emailService] sendAuthEmail error:", error);
        return null;
    }
}

export const sendVipWelcomeEmail = async (email: string, name: string) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_PYTHON_API}/v1/email/welcome-ces`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                name
            }),
        });

        if (!response.ok) {
            console.error("[emailService] sendVipWelcomeEmail failed:", response.statusText);
            return null;
        }

        const data = await response.json();
        console.log("[emailService] sendVipWelcomeEmail success:", data);
        return data;
    } catch (error) {
        console.error("[emailService] sendVipWelcomeEmail error:", error);
        return null;
    }
}

export const sendNormalWelcomeEmail = async (email: string, name: string) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_PYTHON_API}/v1/email/welcome-normal`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                name
            }),
        });

        if (!response.ok) {
            console.error("[emailService] sendNormalWelcomeEmail failed:", response.statusText);
            return null;
        }

        const data = await response.json();
        console.log("[emailService] sendNormalWelcomeEmail success:", data);
        return data;
    } catch (error) {
        console.error("[emailService] sendNormalWelcomeEmail error:", error);
        return null;
    }
}
