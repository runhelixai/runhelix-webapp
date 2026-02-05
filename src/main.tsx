import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Loader2 } from "lucide-react";

createRoot(document.getElementById("root")!).render(
    // <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#F8F9FA] dark:bg-black">
    //     <Loader2 className="h-8 w-8 animate-spin text-[#29A6B4]" />
    // </div>}>
    <App />
    // </Suspense>
);
