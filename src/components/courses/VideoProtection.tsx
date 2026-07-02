"use client";

import { useEffect } from "react";

export function VideoProtection() {
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();

    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        (ctrl && e.key.toLowerCase() === "s") || // 儲存
        (ctrl && e.key.toLowerCase() === "u") || // 檢視原始碼
        (ctrl && e.shiftKey && e.key === "I") || // DevTools
        (ctrl && e.shiftKey && e.key === "J") || // DevTools console
        e.key === "F12" // DevTools
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  return null;
}
