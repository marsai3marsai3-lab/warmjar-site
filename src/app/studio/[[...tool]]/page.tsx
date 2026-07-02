"use client";
/**
 * Sanity Studio embedded at /studio
 * 登入後即可編輯所有網站內容
 */
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
