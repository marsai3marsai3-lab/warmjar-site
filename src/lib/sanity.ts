import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImageSource = any;

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const apiVersion = "2024-01-01";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production",
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/* ---------- Queries ---------- */

export async function getServices() {
  return client.fetch(
    `*[_type == "service"] | order(order asc) {
      _id, name, slug, description, image, price, duration, category
    }`
  );
}

export async function getService(slug: string) {
  return client.fetch(
    `*[_type == "service" && slug.current == $slug][0] {
      _id, name, slug, description, image, price, duration, category, longDescription
    }`,
    { slug }
  );
}

export async function getFaqs() {
  return client.fetch(
    `*[_type == "faq"] | order(order asc) { _id, question, answer }`
  );
}

export async function getTestimonials() {
  return client.fetch(
    `*[_type == "testimonial"] | order(_createdAt desc) {
      _id, name, rating, comment, service
    }`
  );
}

export async function getSiteSettings() {
  return client.fetch(
    `*[_type == "siteSettings"][0] {
      phone, lineId, address, businessHours, heroTitle, heroSubtitle, heroTagline
    }`
  );
}

/* ---------- Course Queries ---------- */

export async function getCourses() {
  return client.fetch(
    `*[_type == "course" && is_published == true] | order(order asc) {
      _id, title, slug, tagline, thumbnail, price,
      "lessonCount": count(lessons),
      "previewLesson": lessons[is_preview == true][0] { title, "slug": slug.current, duration }
    }`
  );
}

export async function getCourse(slug: string) {
  return client.fetch(
    `*[_type == "course" && slug.current == $slug && is_published == true][0] {
      _id, title, slug, tagline, description, thumbnail, price,
      "lessons": lessons[] | order(order asc) {
        title, "slug": slug.current, description, duration, order, is_preview
      }
    }`,
    { slug }
  );
}

export async function getCoursesByIds(sanityIds: string[]) {
  if (!sanityIds.length) return [];
  return client.fetch(
    `*[_type == "course" && _id in $sanityIds] {
      _id, title, slug, tagline, thumbnail,
      "lessonCount": count(lessons),
      "firstLesson": lessons | order(order asc) [0] { "slug": slug.current }
    }`,
    { sanityIds }
  );
}

// 僅在 Server Component 確認 enrollment 後才呼叫，會取得 video_id / video_provider
export async function getLessonVideo(courseSlug: string, lessonSlug: string) {
  return client.fetch(
    `*[_type == "course" && slug.current == $courseSlug][0] {
      title,
      "lesson": lessons[slug.current == $lessonSlug][0] {
        title, video_id, video_provider, duration, description, is_preview, order,
        "slug": slug.current,
        "pdf_url": pdf_file.asset->url
      },
      "allLessons": lessons[] | order(order asc) {
        title, "slug": slug.current, is_preview, order
      }
    }`,
    { courseSlug, lessonSlug }
  );
}
