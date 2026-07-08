import type { Metadata } from "next";
import Header from "@/components/Header";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const metadata: Metadata = {
  title: "線上預約 | 溫罐子",
  description: "選擇服務、師傅與時段，手機驗證後即可完成線上預約。",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <BookingWizard />
      </main>
    </>
  );
}
