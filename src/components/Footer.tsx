import Link from "next/link";
import { MapPin, Phone, Clock, Mail } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

const socials = [
  {
    href: "https://line.me/R/ti/p/@warmjar",
    label: "LINE",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.365 9.863c.349 0 .63.285.63.63 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
    ),
  },
  {
    href: "https://www.instagram.com/warmjar",
    label: "Instagram",
    icon: <InstagramIcon className="w-5 h-5" />,
  },
  {
    href: "https://www.facebook.com/profile.php?id=61555245221852",
    label: "Facebook",
    icon: <FacebookIcon className="w-5 h-5" />,
  },
  {
    href: "https://www.tiktok.com/@warmjar",
    label: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.77a8.16 8.16 0 004.77 1.52V6.84a4.85 4.85 0 01-1-.15z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink text-cream/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4">
              <p className="text-2xl font-heading font-semibold text-cream">溫罐子</p>
              <p className="text-sm text-cream/50 tracking-widest">Warm Jar</p>
            </div>
            <p className="text-sm leading-relaxed text-cream/70 mb-6">
              屏東在地的按摩Spa館，提供溫罐舒壓、筋膜刀、油壓等專業舒壓服務，以自製點心湯品暖心款待每一位客人。
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-cream/10 hover:bg-terracotta flex items-center justify-center text-cream/70 hover:text-cream transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-cream font-medium mb-5 text-sm tracking-widest uppercase">
              快速連結
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/about", label: "關於我們" },
                { href: "/services", label: "服務項目" },
                { href: "/online-courses", label: "線上課程" },
                { href: "/courses", label: "技術培訓" },
                { href: "/entrepreneurship", label: "創業課程" },
                { href: "/pricing", label: "價格方案" },
                { href: "/faq", label: "常見問題" },
                { href: "/contact", label: "聯絡我們" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream/60 hover:text-terracotta-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-cream font-medium mb-5 text-sm tracking-widest uppercase">
              主要服務
            </h3>
            <ul className="space-y-2.5">
              {[
                "溫罐舒壓按摩",
                "筋膜刀舒緩",
                "全身油壓",
                "美胸按摩",
                "指壓放鬆",
                "運動按摩",
                "小臉按摩",
              ].map((service) => (
                <li key={service}>
                  <span className="text-sm text-cream/60">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact – NAP */}
          <div>
            <h3 className="text-cream font-medium mb-5 text-sm tracking-widest uppercase">
              聯絡資訊
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={15} className="text-terracotta-light mt-0.5 shrink-0" />
                <address className="not-italic text-sm text-cream/60 leading-relaxed">
                  屏東市莊敬街一段104號
                </address>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={15} className="text-terracotta-light mt-0.5 shrink-0" />
                <span className="flex flex-col">
                  <a
                    href="tel:0979050630"
                    className="text-sm text-cream/60 hover:text-terracotta-light transition-colors"
                  >
                    0979-050-630
                  </a>
                  <a
                    href="tel:0989617228"
                    className="text-sm text-cream/60 hover:text-terracotta-light transition-colors"
                  >
                    0989-617-228
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={15} className="text-terracotta-light mt-0.5 shrink-0" />
                <span className="flex flex-col">
                  <a
                    href="mailto:marsai3marsai3@gmail.com"
                    className="text-sm text-cream/60 hover:text-terracotta-light transition-colors"
                  >
                    marsai3marsai3@gmail.com
                  </a>
                  <a
                    href="mailto:marsliu525@gmail.com"
                    className="text-sm text-cream/60 hover:text-terracotta-light transition-colors"
                  >
                    marsliu525@gmail.com
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock size={15} className="text-terracotta-light mt-0.5 shrink-0" />
                <span className="text-sm text-cream/60">週一至週日 10:00 – 22:00</span>
              </li>
              <li className="pt-1">
                <a
                  href="https://line.me/R/ti/p/@warmjar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-olive text-cream text-sm font-medium px-5 py-2.5 rounded-full hover:bg-olive-light transition-colors"
                >
                  LINE：@warmjar
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-cream/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-cream/40">
            © {new Date().getFullYear()} 溫罐子Spa館 Warm Jar. 版權所有。
          </p>
          <div className="flex items-center gap-4 text-xs text-cream/30">
            <span>本服務為民俗調理，非醫療行為。</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
