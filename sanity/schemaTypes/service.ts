import { defineType, defineField } from "sanity";

export const service = defineType({
  name: "service",
  title: "服務項目",
  type: "document",
  fields: [
    defineField({ name: "name", title: "服務名稱", type: "string" }),
    defineField({
      name: "slug",
      title: "網址代稱",
      type: "slug",
      options: { source: "name" },
    }),
    defineField({
      name: "category",
      title: "分類",
      type: "string",
      options: {
        list: [
          { title: "溫罐舒壓", value: "warm-jar" },
          { title: "筋膜刀", value: "fascia" },
          { title: "油壓", value: "oil" },
          { title: "美胸", value: "breast" },
          { title: "指壓", value: "acupressure" },
          { title: "運動按摩", value: "sports" },
          { title: "小臉", value: "face" },
          { title: "其他", value: "other" },
        ],
      },
    }),
    defineField({
      name: "description",
      title: "服務簡介（一句話）",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "longDescription",
      title: "完整說明",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "image",
      title: "服務圖片",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "price",
      title: "價格（元）",
      type: "number",
    }),
    defineField({
      name: "duration",
      title: "時間",
      type: "string",
      description: "例：60 分鐘",
    }),
    defineField({
      name: "order",
      title: "排序（數字小的優先）",
      type: "number",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "duration", media: "image" },
  },
});
