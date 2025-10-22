// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ensureAuthOnBoot } from "@/api/http"; // nếu chưa cấu hình alias "@", đổi thành "./api/http"

(async () => {
  // Có RT nhưng chưa có AT → xin AT trước khi render
  try {
    await ensureAuthOnBoot();
  } finally {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
})();
