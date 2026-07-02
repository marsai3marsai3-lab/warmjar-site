import { defineType, defineField } from "sanity";

export const lesson = defineType({
  name: "lesson",
  title: "課程單元",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "單元名稱",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "網址代稱",
      type: "slug",
      options: { source: "title" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "單元簡介",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "video_provider",
      title: "影片來源",
      type: "string",
      options: {
        list: [
          { title: "YouTube（免費）", value: "youtube" },
          { title: "Vimeo Pro（付費，防下載更強）", value: "vimeo" },
        ],
        layout: "radio",
      },
      initialValue: "youtube",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "video_id",
      title: "影片 ID",
      type: "string",
      description:
        "YouTube：網址中的 ID，例如 dQw4w9WgXcQ｜Vimeo：網址中的數字，例如 123456789",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "pdf_file",
      title: "PDF 講義（選填）",
      type: "file",
      description: "上傳 PDF 後，已購買學員可在課程頁面下載",
      options: { accept: ".pdf" },
    }),
    defineField({
      name: "duration",
      title: "時長",
      type: "string",
      description: "例：15 分鐘",
    }),
    defineField({
      name: "order",
      title: "排序",
      type: "number",
      initialValue: 1,
    }),
    defineField({
      name: "is_preview",
      title: "免費預覽",
      type: "boolean",
      initialValue: false,
      description: "開啟後未購買者可觀看此單元",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "duration", provider: "video_provider" },
    prepare({
      title,
      subtitle,
      provider,
    }: {
      title?: string;
      subtitle?: string;
      provider?: string;
    }) {
      const icon = provider === "vimeo" ? "🎬 Vimeo" : "▶ YouTube";
      return { title, subtitle: `${icon} · ${subtitle ?? "未設定時長"}` };
    },
  },
});
