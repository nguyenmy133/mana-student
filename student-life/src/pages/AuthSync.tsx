// src/app/AuthSync.tsx
import { useEffect } from "react";
import { setCurrentUserId } from "@/lib/user-storage";

/**
 * Đồng bộ userId từ localStorage vào biến global + phát sự kiện cho Dashboard.
 * Cắm component này 1 lần ở cấp App là đủ.
 */
export default function AuthSync() {
  useEffect(() => {
    const applyFromStorage = () => {
      const uid =
        localStorage.getItem("auth.currentUserId") ||
        localStorage.getItem("auth.userId") ||
        localStorage.getItem("currentUserId") ||
        "guest";

      setCurrentUserId(uid);
      // Báo cho Dashboard các widget reload khi đổi user
      window.dispatchEvent(new Event("dashboard:schedule-cache"));
      window.dispatchEvent(new Event("dashboard:tasks-cache"));
      window.dispatchEvent(new Event("dashboard:expenses-cache"));
    };

    // Lần đầu vào trang
    applyFromStorage();

    // Khi tab khác đổi user -> bắt event storage
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key === "auth.currentUserId" ||
        e.key === "auth.userId" ||
        e.key === "currentUserId"
      ) {
        applyFromStorage();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
