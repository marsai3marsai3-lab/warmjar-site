import { defineType, defineField } from "sanity";

export const testimonial = defineType({
  name: "testimonial",
  title: "顧客好評",
  type: "document",
  fields: [
    defineField({ name: "name", title: "顧客姓名（可匿名）", type: "string" }),
    defineField({
      name: "service",
      title: "體驗服務",
      type: "string",
    }),
    defineField({
      name: "rating",
      title: "評分（1-5）",
      type: "number",
      validation: (r) => r.min(1).max(5),
    }),
    defineField({
      name: "comment",
      title: "評語內容",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "featured",
      title: "置頂顯示",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "comment" },
  },
});
