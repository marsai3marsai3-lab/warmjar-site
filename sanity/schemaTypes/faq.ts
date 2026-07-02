import { defineType, defineField } from "sanity";

export const faq = defineType({
  name: "faq",
  title: "常見問題 FAQ",
  type: "document",
  fields: [
    defineField({ name: "question", title: "問題", type: "string" }),
    defineField({ name: "answer", title: "解答", type: "text", rows: 4 }),
    defineField({
      name: "order",
      title: "排序（數字小的優先）",
      type: "number",
    }),
  ],
  preview: {
    select: { title: "question" },
  },
});
