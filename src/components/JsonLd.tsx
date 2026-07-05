export function LocalBusinessJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: "溫罐子Spa館",
    alternateName: "Warm Jar",
    description:
      "屏東在地按摩Spa館，提供溫罐舒壓、筋膜刀、油壓、美胸按摩等專業舒壓服務，自製點心湯品暖心款待。",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.warmjar.com.tw",
    telephone: "0979050630",
    address: {
      "@type": "PostalAddress",
      streetAddress: "莊敬街一段104號",
      addressLocality: "屏東市",
      addressRegion: "屏東縣",
      postalCode: "900",
      addressCountry: "TW",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 22.6841698,
      longitude: 120.50254,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "10:00",
        closes: "22:00",
      },
    ],
    priceRange: "$$",
    currenciesAccepted: "TWD",
    paymentAccepted: "Cash, Credit Card",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "舒壓服務",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "溫罐舒壓按摩" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "筋膜刀舒緩" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "全身油壓" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "美胸按摩" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "指壓放鬆" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "運動按摩" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "小臉按摩" } },
      ],
    },
    /* 預留 AggregateRating */
    // "aggregateRating": {
    //   "@type": "AggregateRating",
    //   "ratingValue": "4.9",
    //   "reviewCount": "58"
    // }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function PersonJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.warmjar.com.tw";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "萍萍老師",
    jobTitle: "溫罐子創辦人 · 技術總監",
    url: `${baseUrl}/founder`,
    worksFor: {
      "@type": "HealthAndBeautyBusiness",
      name: "溫罐子Spa館",
      url: baseUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FaqPageJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
