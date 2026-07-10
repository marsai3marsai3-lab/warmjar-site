export type FlexTemplateContent = {
  title: string;
  bodyLines: string[];
  footerNote?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
};

export type TextTemplateContent = { text: string };

export type LineMessage = Record<string, unknown>;

const BRAND = {
  cream: "#F5F1E8",
  terracotta: "#C67B5C",
  ink: "#3A342C",
  footerText: "#8A8272",
};

/** 品牌色系套進 Flex bubble——米白底、陶土色標題與按鈕，見 CLAUDE.md 品牌視覺。 */
export function buildFlexMessage(altText: string, content: FlexTemplateContent): LineMessage {
  const bodyContents: Record<string, unknown>[] = [
    { type: "text", text: content.title, weight: "bold", size: "lg", color: BRAND.terracotta, wrap: true },
    ...content.bodyLines.map((line) => ({
      type: "text",
      text: line,
      size: "sm",
      color: BRAND.ink,
      wrap: true,
      margin: "sm",
    })),
  ];

  if (content.footerNote) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "text",
      text: content.footerNote,
      size: "xs",
      color: BRAND.footerText,
      wrap: true,
      margin: "md",
    });
  }

  const bubble: Record<string, unknown> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      backgroundColor: BRAND.cream,
      paddingAll: "16px",
      contents: bodyContents,
    },
  };

  if (content.buttonText && content.buttonUrl) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      backgroundColor: BRAND.cream,
      contents: [
        {
          type: "button",
          style: "primary",
          color: BRAND.terracotta,
          action: { type: "uri", label: content.buttonText, uri: content.buttonUrl },
        },
      ],
    };
  }

  return { type: "flex", altText, contents: bubble };
}

export function buildTextMessage(content: TextTemplateContent): LineMessage {
  return { type: "text", text: content.text };
}
