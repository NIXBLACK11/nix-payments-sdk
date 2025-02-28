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
export declare function fetchSession(sessionId: string): Promise<SessionType | null>;
export {};
//# sourceMappingURL=fetchSession.d.ts.map