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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModal = exports.PaymentModalComponent = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const wallet_adapter_react_ui_1 = require("@solana/wallet-adapter-react-ui");
const web3_js_1 = require("@solana/web3.js");
const wallet_adapter_react_ui_2 = require("@solana/wallet-adapter-react-ui");
const react_2 = require("react");
const web3_js_2 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const wallet_adapter_react_2 = require("@solana/wallet-adapter-react");
const bs58_1 = __importDefault(require("bs58"));
const Tokens_1 = require("./Tokens");
const fetchSession_1 = require("./fetchSession");
const verifyPayment_1 = require("./verifyPayment");
const PaymentModalComponent = ({ sessionId, RPC_URL, onRedirect }) => {
    const { publicKey, signTransaction, sendTransaction } = (0, wallet_adapter_react_2.useWallet)();
    const [loading, setLoading] = (0, react_2.useState)(false);
    const [email, setEmail] = (0, react_2.useState)("");
    const [saasLogoURL, setSaasLogoURL] = (0, react_2.useState)("");
    const [saasName, setSaasName] = (0, react_2.useState)("");
    const [plan, setPlan] = (0, react_2.useState)("");
    const [pricing, setPricing] = (0, react_2.useState)(0);
    const [merchantWalletAddress, setMerchantWalletAddress] = (0, react_2.useState)("");
    const [selectedToken, setSelectedToken] = (0, react_2.useState)("");
    const [tokenMintAddress, setTokenMintAddress] = (0, react_2.useState)("");
    const connection = new web3_js_2.Connection(RPC_URL, "confirmed");
    const USDC_MINT = new web3_js_2.PublicKey(Tokens_1.Tokens["USDC"].mint);
    (0, react_2.useEffect)(() => {
        const fetchSessionCaller = () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, fetchSession_1.fetchSession)(sessionId);
            if (!res || !res._id || !res.address || !res.email || !res.plan || !res.price || !res.saasId || !res.time) {
                onRedirect();
                return;
            }
            setEmail(res.email);
            setSaasLogoURL(res.logoUrl);
            setSaasName(res.saasName);
            setPlan(res.plan);
            setPricing(res.price);
            setMerchantWalletAddress(res.address);
        });
        fetchSessionCaller();
    }, [sessionId]);
    const handleTokenChange = (e) => {
        var _a;
        const tokenKey = e.target.value;
        setSelectedToken(tokenKey);
        setTokenMintAddress(((_a = Tokens_1.Tokens[tokenKey]) === null || _a === void 0 ? void 0 : _a.mint) || "");
    };
    const handlePayment = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!publicKey || !signTransaction) {
            alert("Connect wallet to make payment!!");
            return;
        }
        try {
            setLoading(true);
            const customerAccount = publicKey;
            const merchantAccount = new web3_js_2.PublicKey(merchantWalletAddress);
            if (selectedToken === "USDC") {
                const senderTokenAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(USDC_MINT, customerAccount);
                const receiverTokenAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(USDC_MINT, merchantAccount);
                const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createTransferInstruction)(senderTokenAddress, receiverTokenAddress, publicKey, pricing * 10 ** Tokens_1.Tokens[selectedToken].decimal, // Convert USDC amount to smallest unit (assuming 6 decimals)
                [], spl_token_1.TOKEN_PROGRAM_ID));
                const signature = yield sendTransaction(transaction, connection);
                const latestBlockhash = yield connection.getLatestBlockhash();
                yield connection.confirmTransaction(Object.assign({ signature }, latestBlockhash), "finalized");
                console.log(signature);
                const response = yield (0, verifyPayment_1.verifyPayment)(sessionId, signature, publicKey.toString());
                if (!response) {
                    alert('Corrupted payment');
                    return;
                }
                alert('Payment Successful!');
                setTimeout(() => {
                    onRedirect();
                }, 3000);
            }
            else {
                const merchantUSDCTokenAccount = yield (0, spl_token_1.getAssociatedTokenAddress)(USDC_MINT, merchantAccount, true, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
                console.log("Merchant USDC Token Account:", merchantUSDCTokenAccount.toBase58());
                const quoteResponse = yield fetch(`https://api.jup.ag/swap/v1/quote?inputMint=${tokenMintAddress}&outputMint=${USDC_MINT.toBase58()}&amount=${pricing * 1e6}&slippageBps=50&swapMode=ExactOut`).then(res => res.json());
                console.log("Swap Quote:", quoteResponse);
                if (!quoteResponse.routePlan) {
                    throw new Error("Invalid quote response. Check token selection and balance.");
                }
                const swapResponse = yield fetch("https://api.jup.ag/swap/v1/swap", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        quoteResponse: quoteResponse, // Make sure this is formatted correctly
                        userPublicKey: customerAccount.toBase58(),
                        destinationTokenAccount: merchantUSDCTokenAccount.toBase58(),
                        wrapAndUnwrapSol: true,
                    }),
                }).then(res => res.json());
                console.log("Swap Response:", swapResponse);
                if (!swapResponse.swapTransaction) {
                    throw new Error("Invalid swap response. Check parameters.");
                }
                const transactionBase64 = swapResponse.swapTransaction;
                console.log("Transaction->", transactionBase64);
                const transaction = web3_js_2.VersionedTransaction.deserialize(Buffer.from(transactionBase64, "base64"));
                const signedTransaction = yield signTransaction(transaction);
                const transactionBinary = signedTransaction.serialize();
                // Send transaction
                const signature = yield connection.sendRawTransaction(transactionBinary, {
                    maxRetries: 10,
                    preflightCommitment: "finalized"
                });
                console.log(`Transaction Sent: https://solscan.io/tx/${signature}/`);
                // Confirm transaction (Fixed)
                const confirmation = yield connection.confirmTransaction(signature, "finalized");
                if (confirmation.value.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }
                console.log(`Transaction Successful: https://solscan.io/tx/${signature}/`);
                const signature1 = bs58_1.default.encode(signedTransaction.signatures[0]);
                console.log("Transaction Signature:", signature1);
                console.log(signature, signature1);
                const response = yield (0, verifyPayment_1.verifyPayment)(sessionId, signature1, publicKey.toString());
                if (!response) {
                    alert('Corrupted payment');
                    return;
                }
                alert("Payment Successful!");
                setTimeout(() => {
                    onRedirect();
                }, 3000);
            }
        }
        catch (err) {
            console.error("Payment Error:", err);
            alert("Payment Failed!");
        }
        finally {
            setLoading(false);
        }
    });
    return ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-4xl mx-auto p-8 flex gap-16", children: [(0, jsx_runtime_1.jsxs)("div", { className: "w-1/2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-8", children: [(0, jsx_runtime_1.jsx)("button", { className: "p-2", children: "\u2190" }), (0, jsx_runtime_1.jsx)("img", { src: saasLogoURL, alt: "Logo", className: "w-8 h-8" }), (0, jsx_runtime_1.jsx)("span", { className: "text-black", children: saasName })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-8", children: [(0, jsx_runtime_1.jsxs)("h1", { className: "text-3xl font-normal text-black mb-2", children: ["Subscribe to ", saasName, " ", plan] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-3xl font-normal text-black mb-1", children: ["US$", pricing, (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-500 ml-1", children: "per month" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between py-4 border-b border-gray-100", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-gray-600", children: [saasName, " ", plan, (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-gray-400", children: "Billed monthly" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-black", children: ["US$", pricing] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between py-2 font-medium text-black", children: [(0, jsx_runtime_1.jsx)("div", { children: "Total due today" }), (0, jsx_runtime_1.jsxs)("div", { children: ["US$", pricing] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "w-1/2 text-black", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-8", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-base font-medium mb-4", children: "Contact information" }), (0, jsx_runtime_1.jsx)("p", { className: "w-full p-2 border border-gray-200 rounded", children: email })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-8", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-base font-medium mb-4", children: "Payment method" }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-4", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-sm font-medium", children: "Select Token" }), (0, jsx_runtime_1.jsxs)("select", { className: "w-full p-2 border border-gray-200 rounded mb-4", value: selectedToken, onChange: handleTokenChange, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Select Token" }), Object.entries(Tokens_1.Tokens)
                                                    .map(([key, token]) => ((0, jsx_runtime_1.jsx)("option", { value: key, children: token.name }, key)))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 text-sm text-gray-500", children: selectedToken && Tokens_1.Tokens[selectedToken] && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("img", { src: Tokens_1.Tokens[selectedToken].image, alt: Tokens_1.Tokens[selectedToken].name, className: "w-5 h-5" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Mint Address: ", tokenMintAddress] })] })) })] }), (0, jsx_runtime_1.jsx)("div", { className: "mb-4", children: (0, jsx_runtime_1.jsx)(wallet_adapter_react_ui_2.WalletMultiButton, {}) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm text-gray-600", children: `By subscribing, you agree to {saasName}'s Terms of Use and Privacy Policy.` }), (loading == true) ?
                                            (0, jsx_runtime_1.jsx)("div", { className: "w-full bg-emerald-500 text-white py-3 rounded text-center", children: "Loading..." }) :
                                            (0, jsx_runtime_1.jsx)("button", { className: "w-full bg-emerald-500 text-white py-3 rounded", onClick: () => {
                                                    handlePayment();
                                                }, children: "Subscribe" }), (0, jsx_runtime_1.jsx)("div", { className: "text-center text-sm text-gray-400 mt-4", children: "Powered by NIX-payments \u2022 Terms \u2022 Privacy" })] })] })] })] }) }));
};
exports.PaymentModalComponent = PaymentModalComponent;
const PaymentModal = (props) => {
    const network = "mainnet-beta";
    const endpoint = (0, react_1.useMemo)(() => (0, web3_js_1.clusterApiUrl)(network), [network]);
    const wallets = (0, react_1.useMemo)(() => [], []);
    return ((0, jsx_runtime_1.jsx)(wallet_adapter_react_1.ConnectionProvider, { endpoint: endpoint, children: (0, jsx_runtime_1.jsx)(wallet_adapter_react_1.WalletProvider, { wallets: wallets, autoConnect: true, children: (0, jsx_runtime_1.jsx)(wallet_adapter_react_ui_1.WalletModalProvider, { children: (0, jsx_runtime_1.jsx)(exports.PaymentModalComponent, Object.assign({}, props)) }) }) }));
};
exports.PaymentModal = PaymentModal;
