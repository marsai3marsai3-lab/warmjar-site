import { defineType, defineField } from "sanity";

export const course = defineType({
  name: "course",
  title: "線上課程",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "課程名稱",
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
      name: "tagline",
      title: "一句話簡介",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "課程說明",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "thumbnail",
      title: "封面圖",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "price",
      title: "定價（NTD）",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "order",
      title: "排序",
      type: "number",
      initialValue: 1,
    }),
    defineField({
      name: "is_published",
      title: "已發佈",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "lessons",
      title: "課程單元",
      type: "array",
      of: [{ type: "lesson" }],
    }),
  ],
  preview: {
    select: { title: "title", price: "price", media: "thumbnail" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepare({ title, price, media }: { title?: string; price?: number; media?: any }) {
      return {
        title,
        subtitle: price != null ? `NT$${price}` : "未設定價格",
        media,
      };
    },
  },
});
