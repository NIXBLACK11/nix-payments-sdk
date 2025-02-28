"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
function createSession(saasId, email, plan) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield fetch("https://nix-payment-gateway.vercel.app/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ saasId, email, plan }),
            });
            if (!res.ok)
                return null;
            const data = yield res.json();
            return data.sessionId; // Returns the session ID
        }
        catch (error) {
            console.error("Error creating session:", error);
            return null;
        }
    });
}
