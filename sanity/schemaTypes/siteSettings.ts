import { defineType, defineField } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "網站設定",
  type: "document",
  fields: [
    defineField({ name: "phone", title: "電話號碼", type: "string" }),
    defineField({ name: "lineId", title: "LINE ID", type: "string" }),
    defineField({
      name: "address",
      title: "地址",
      type: "string",
    }),
    defineField({
      name: "businessHours",
      title: "營業時間",
      type: "string",
      description: "例：週一至週日 10:00–22:00",
    }),
    defineField({
      name: "heroTitle",
      title: "首頁主標題",
      type: "string",
    }),
    defineField({
      name: "heroSubtitle",
      title: "首頁副標題",
      type: "string",
    }),
    defineField({
      name: "heroTagline",
      title: "首頁標語（小字）",
      type: "string",
    }),
    defineField({
      name: "ogImage",
      title: "分享縮圖（OG Image）",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: "phone" },
    prepare: () => ({ title: "網站設定" }),
  },
});
