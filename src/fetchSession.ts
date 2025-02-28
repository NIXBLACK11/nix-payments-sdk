type SessionType = {
    _id: string;
    saasId: string;
    saasName: string;
    time: string;
    email: string;
    address: string;
    logoUrl: string;
    plan: string;
    price: number;
};

export async function fetchSession(sessionId: string): Promise<SessionType | null> {
    try {
        const res = await fetch(`https://nix-payment-gateway.vercel.app/api/session/${sessionId}`);

        if (!res.ok) return null;

        return await res.json();
    } catch (error) {
        console.error("Error fetching session:", error);
        return null;
    }
}
