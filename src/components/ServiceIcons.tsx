interface IconProps {
  className?: string;
  strokeWidth?: number;
}

/* 通用 PNG→金色 filter：白色/透明底 + 黑線都適用 */
function PngGoldFilter({ id }: { id: string }) {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <filter id={id} colorInterpolationFilters="sRGB">
          {/* 亮度→alpha：白(1)→A=1，黑(0)→A=0 */}
          <feColorMatrix type="luminanceToAlpha" result="luma" />
          {/* 反轉：白→透明，黑線→不透明 */}
          <feComponentTransfer in="luma" result="inv">
            <feFuncA type="linear" slope="-1" intercept="1" />
          </feComponentTransfer>
          {/* 與原始 alpha 相交：排除真正透明的背景像素 */}
          <feComposite in="inv" in2="SourceGraphic" operator="in" result="mask" />
          {/* 填品牌金色 */}
          <feFlood floodColor="#B8963E" result="gold" />
          <feComposite in="gold" in2="mask" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

export function FasciaPngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-fascia" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/fascia.png" alt="筋膜刀舒緩" className={className}
        style={{ filter: "url(#gold-fascia)" }} />
    </>
  );
}

export function FacialMassagePngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-face" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/facial-massage.png" alt="小臉按摩" className={className}
        style={{ filter: "url(#gold-face)" }} />
    </>
  );
}

export function CuppingPngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-cupping" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/cupping.png" alt="拔罐舒壓" className={className}
        style={{ filter: "url(#gold-cupping)" }} />
    </>
  );
}

export function CoursePngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-course" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/course.png" alt="技術課程" className={className}
        style={{ filter: "url(#gold-course)" }} />
    </>
  );
}

export function BreastMassagePngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-breast" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/breast.png" alt="美胸按摩" className={className}
        style={{ filter: "url(#gold-breast)" }} />
    </>
  );
}

export function AcupressurePngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-acupressure" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/acupressure.png" alt="指壓放鬆" className={className}
        style={{ filter: "url(#gold-acupressure)" }} />
    </>
  );
}

export function StretchPngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-stretch" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/stretch.png" alt="伸展舒緩" className={className}
        style={{ filter: "url(#gold-stretch)" }} />
    </>
  );
}

export function SportsMassagePngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-sports" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/sports-massage.png" alt="運動按摩" className={className}
        style={{ filter: "url(#gold-sports)" }} />
    </>
  );
}

export function OilMassagePngIcon({ className }: { className?: string }) {
  return (
    <>
      <PngGoldFilter id="gold-oil" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/oil-massage.png" alt="全身油壓" className={className}
        style={{ filter: "url(#gold-oil)" }} />
    </>
  );
}

const base = (sw = 1.5) => ({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/* 拔罐 — 玻璃火罐造型（圓頂 + 底座） */
export function CuppingJarIcon({ className, strokeWidth = 1.5 }: IconProps) {
  const s = base(strokeWidth);
  return (
    <svg viewBox="0 0 24 24" className={className} {...s}>
      {/* 底座 */}
      <line x1="2" y1="21" x2="22" y2="21" />
      {/* 罐體圓弧 */}
      <path d="M6 21 C 6 21, 5.5 14, 6.5 11.5 C 8 8, 16 8, 17.5 11.5 C 18.5 14, 18 21, 18 21" />
      {/* 頂端頸部 */}
      <rect x="10.5" y="6" width="3" height="2.5" rx="0.3" />
      {/* 頂針 */}
      <line x1="12" y1="4" x2="12" y2="6" />
      <line x1="11" y1="4" x2="13" y2="4" />
      {/* 罐內反光弧 */}
      <path d="M8.5 18.5 Q 12 16.5, 15.5 18.5" />
    </svg>
  );
}

/* 筋膜刀 — 刮痧板/月牙型彎弧工具 */
export function FasciaToolIcon({ className, strokeWidth = 1.5 }: IconProps) {
  const s = base(strokeWidth);
  return (
    <svg viewBox="0 0 24 24" className={className} {...s}>
      {/* 外弧（凸面，右側） */}
      {/* 內弧（凹面刮壓邊，左側） */}
      {/* 整體：厚月牙/彎刀輪廓 */}
      <path d="
        M 15 3
        C 19 5, 20 12, 18 17
        C 16 21, 11 22, 8 20
        C 6 19, 6 17, 8 15
        C 10 13, 12 12, 12 9
        C 12 6, 13 3, 15 3
        Z
      " />
      {/* 工具上方小掛孔 */}
      <circle cx="15.5" cy="5" r="1.2" />
    </svg>
  );
}

/* 小臉按摩 — 戴面膜臉型 + 雙手在兩側護臉 */
export function FaceMassageIcon({ className, strokeWidth = 1.5 }: IconProps) {
  const s = base(strokeWidth);
  return (
    <svg viewBox="0 0 24 24" className={className} {...s}>
      {/* 頭型橢圓 */}
      <ellipse cx="12" cy="12" rx="5" ry="6.5" />
      {/* 頸部 */}
      <line x1="10.5" y1="18.5" x2="10" y2="21" />
      <line x1="13.5" y1="18.5" x2="14" y2="21" />
      {/* 肩線 */}
      <path d="M 6 22 Q 10 21.5, 10 22" />
      <path d="M 18 22 Q 14 21.5, 14 22" />
      {/* 面膜眼洞（填色橢圓） */}
      <ellipse cx="10" cy="11" rx="1.4" ry="1" fill="currentColor" stroke="none" />
      <ellipse cx="14" cy="11" rx="1.4" ry="1" fill="currentColor" stroke="none" />
      {/* 面膜嘴洞 */}
      <path d="M 10.5 14.5 Q 12 15.5, 13.5 14.5" />

      {/* 左手（由左下往上貼臉側，手指朝上） */}
      <path d="M 2 17 C 2 14, 4.5 12, 7 13" />
      <path d="M 3.5 14 Q 6.5 13, 7 10" />
      <path d="M 5 12.5 Q 8 11.5, 8.5 8.5" />
      <path d="M 6.5 11.5 Q 9.5 11, 10 8" />

      {/* 右手（由右下往上貼臉側，手指朝上） */}
      <path d="M 22 17 C 22 14, 19.5 12, 17 13" />
      <path d="M 20.5 14 Q 17.5 13, 17 10" />
      <path d="M 19 12.5 Q 16 11.5, 15.5 8.5" />
      <path d="M 17.5 11.5 Q 14.5 11, 14 8" />
    </svg>
  );
}

/* 運動按摩 — 客人躺地墊、師傅坐在腳側幫做腿部伸展 */
export function MassageTableIcon({ className, strokeWidth = 1.5 }: IconProps) {
  const s = base(strokeWidth);
  return (
    <svg viewBox="0 0 24 24" className={className} {...s}>
      {/* 地墊（底部長橢圓形） */}
      <path d="M1 20 Q12 22 21 20 Q22 19, 21 18.5 Q12 20.5, 1 18.5 Q0 19, 1 20 Z" />

      {/* 躺著的客人 */}
      {/* 頭 */}
      <circle cx="3" cy="17" r="1.5" />
      {/* 身體 */}
      <line x1="4.5" y1="17" x2="13.5" y2="17" />
      {/* 腿部被舉起做伸展（斜向右上） */}
      <path d="M13.5 17 L17 11.5" />
      {/* 小腿 */}
      <path d="M17 11.5 L19 13" />

      {/* 師傅（坐在右側推腿） */}
      {/* 頭 */}
      <circle cx="21" cy="8.5" r="1.8" />
      {/* 上身 */}
      <path d="M21 10.3 L20.5 14.5" />
      {/* 盤腿坐 */}
      <path d="M18.5 14.5 Q20.5 15.5 22.5 14.5" />
      <path d="M18.5 14.5 L17 16.5 Q18 17.5 19.5 17" />
      <path d="M22.5 14.5 L23 16.5 Q22 17.5 20.5 17" />
      {/* 師傅雙臂推腿 */}
      <path d="M21 11.5 L19 12.5" />
      <path d="M20.5 12.5 L18 13" />
    </svg>
  );
}
