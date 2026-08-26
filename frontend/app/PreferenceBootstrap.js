"use client";

import { useEffect } from "react";

const VALID_FONT = new Set(["small", "normal", "large"]);
const VALID_DETAIL = new Set(["compact", "balanced", "deep"]);

export default function PreferenceBootstrap() {
  useEffect(() => {
    const font = window.localStorage.getItem("pylab-font-scale") || "normal";
    const detail = window.localStorage.getItem("pylab-detail-level") || "balanced";

    document.documentElement.dataset.fontScale = VALID_FONT.has(font) ? font : "normal";
    document.documentElement.dataset.detailLevel = VALID_DETAIL.has(detail) ? detail : "balanced";
  }, []);

  return null;
}
