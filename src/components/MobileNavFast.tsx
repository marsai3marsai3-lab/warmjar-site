"use client";

import { useEffect } from "react";

export default function MobileNavFast() {
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      e.preventDefault(); // 阻止 300ms 延遲及後續合成 click
      const checkbox = document.getElementById("mn") as HTMLInputElement | null;
      if (checkbox) checkbox.checked = !checkbox.checked;
    };

    const attach = () => {
      document.querySelectorAll<HTMLElement>('label[for="mn"]').forEach((el) => {
        el.removeEventListener("touchstart", handler as EventListener);
        el.addEventListener("touchstart", handler as EventListener, { passive: false });
      });
    };

    attach();
    // 重新掛 MutationObserver 以涵蓋動態出現的 label（如抽屜內的 X 和背景）
    const obs = new MutationObserver(attach);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return null;
}
