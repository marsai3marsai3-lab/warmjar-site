import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "創業課程培訓 | 打造你的養生事業 – 溫罐子",
  description:
    "溫罐子創業課程培訓，從技術學習到開業輔導，手把手帶你打造屬於自己的按摩養生事業。油壓、溫罐、筋膜刀等8大技術，小班制親授，學成即可創業。",
  alternates: { canonical: "/entrepreneurship" },
};

const pathway = [
  {
    step: "01",
    title: "技術培訓",
    desc: "從零基礎開始，小班制 1 對 1 或 1 對 2，由資深講師手把手親授 8 大核心技術。",
    sub: ["油壓・指壓・溫罐・小臉", "筋膜刀・拔罐・徒手按摩・伸展", "每門技術系統化學習"],
  },
  {
    step: "02",
    title: "實務演練",
    desc: "技術學成後進行實際操作演練，導師即時糾正手法，確保達到職業服務水準。",
    sub: ["真人實操練習", "手法精準度提升", "客戶溝通技巧培訓"],
  },
  {
    step: "03",
    title: "開業準備",
    desc: "提供創業所需的完整知識，包含空間規劃、定價策略、客戶經營、行銷方法。",
    sub: ["空間設計與設備選購", "定價策略與方案規劃", "LINE 與社群行銷實務"],
  },
  {
    step: "04",
    title: "獨立創業",
    desc: "帶著紮實技術與完整開業知識，自信出發。溫罐子持續提供諮詢與後援支持。",
    sub: ["持續技術交流與進修", "創業後疑問諮詢支援", "校友資源網絡"],
  },
];

const skills = [
  { name: "油壓", desc: "全身油壓是最受歡迎的基礎服務，客源廣泛，上手後可快速接客" },
  { name: "溫罐", desc: "溫罐子招牌技術，差異化競爭，讓你的服務在市場上獨樹一格" },
  { name: "筋膜刀", desc: "近年超熱門項目，工具加持、省力高效，適合長期服務的技術選項" },
  { name: "小臉按摩", desc: "女性客群特別喜愛，服務單價高，學會即可提升客單價" },
  { name: "拔罐", desc: "傳統技術新風潮，與其他項目搭配銷售，增加客戶回購率" },
  { name: "指壓", desc: "零工具門檻，隨時隨地都能服務，是創業初期最低成本的選擇" },
  { name: "徒手按摩", desc: "純手技深層按摩，強化手感與技術感，建立高端服務口碑" },
  { name: "伸展", desc: "結合其他項目作為加值服務，拉長服務時間、提升整體體驗感" },
];

const reasons = [
  {
    icon: "📈",
    title: "養生市場持續成長",
    desc: "台灣按摩養生產業年產值龐大，消費者對舒壓放鬆需求持續增加，市場進入門檻低但潛力大。",
  },
  {
    icon: "💼",
    title: "低成本可彈性創業",
    desc: "一技在身即可上路，不需要大型門市。可先以工作室或到府服務起步，隨客源成長再擴大規模。",
  },
  {
    icon: "🔁",
    title: "高回購率穩定收入",
    desc: "舒壓服務黏著度極高，滿意的客人通常每月固定回診，形成穩定的月收入基礎。",
  },
  {
    icon: "🕐",
    title: "時間自主彈性",
    desc: "自己決定營業時間與接案量，兼顧生活品質，特別適合想擺脫朝九晚五的人。",
  },
  {
    icon: "🧓",
    title: "因為超高齡已經不是新聞，是你家的日常",
    desc: "台灣2025下半年正式進入超高齡社會，家裡長輩、甚至你自己，還早會面對關節卡、睡不好、腸胃鬧。Worldpanel看到60歲以上近八成去年買過健康品，一年平均花超過13,000元，買8次左右。先學一點基礎調理，你會知道什麼時候該補、什麼時候其實只要調整作息就好，少走冤枉路。",
  },
  {
    icon: "🛡️",
    title: "預防這件事，大家已經被疫情教會了",
    desc: "與其等檢查報告出來再緊張，很多人現在想的是「我今天能做什麼讓身體穩一點」。課程裡談的不是神奇偏方，而是怎麼把「預防勝於治療」變成每天的三餐、呼吸、睡眠。學會了，你會發現看醫生的次數自然變少。",
  },
  {
    icon: "🌐",
    title: "養生市場大到6.8兆美元，代表資訊很亂",
    desc: "全球養生經濟2024年達到6.8兆美元，而且還在快速長大。東西越多，話術越多。先學會看成分、看體質差異，你買東西時會多一個判斷力，不容易被「限時」「專利」牽著走。",
  },
  {
    icon: "🏡",
    title: "不用開店，學了馬上用在家裡",
    desc: "養生課不是為了讓你創業，是讓你回家就能用。像是怎麼幫爸媽解緩疼痛、怎麼調整自己的晚餐讓血糖不飆、怎麼用簡單的伸展改善久坐。這些都是當天學、當晚就能試的小方法。",
  },
  {
    icon: "🏢",
    title: "公司、社區都在找懂健康的人",
    desc: "健康台灣、企業福委、長照據點現在都在推預防。先學一點，你很自然會變成朋友群裡「那個懂的人」。不一定要當老師，但多一個被需要的角色，有時也會帶來一些兼差或分享的機會。",
  },
  {
    icon: "😴",
    title: "現在的痛點是睡不著、記不住、壓力大",
    desc: "研究看到記憶提升、緩解疲痛、助眠這類需求在年長輩族群成長很快，年輕人則是焦慮跟腸胃。學一點神經放鬆、呼吸調節、腸腦軸飲食，你會先感受到自己的變化，再去幫家人。",
  },
  {
    icon: "🤝",
    title: "信任，比廣告更值得學",
    desc: "後疫情時代，品牌能活下來靠的是持續把價值說清楚。學養生，你學到的也是「怎麼分辨誰在認真做事」。以後挑產品、挑老師，你看背後的邏輯，而不是包裝。",
  },
  {
    icon: "🌿",
    title: "最後，其實是為了讓生活舒服一點",
    desc: "養生不是要變超人，是讓你早上起來比較不累、晚上比較好睡、跟家人吃飯比較安心。先學一點點，你會發現自己對身體的掌控感回來了，這種踏實感，比任何證書都值。",
  },
];

const faqs = [
  {
    q: "我完全沒有基礎，可以來學嗎？",
    a: "完全可以。我們的技術培訓課程從零開始教，小班制確保每位學員都得到充分指導，不需要任何先備經驗。",
  },
  {
    q: "學完技術後，多久可以開始服務客人？",
    a: "依個人學習速度而定，通常完成一門技術培訓並通過實操評核後即可服務。建議先從熟悉的客群開始，累積口碑再擴展。",
  },
  {
    q: "需要考照嗎？",
    a: "按摩養生屬於民俗調理，目前無強制證照規定。完成我們的培訓課程後，你將具備足夠的技術能力與服務知識。",
  },
  {
    q: "一門技術課程多久學完？",
    a: "視技術複雜度與個人吸收速度而定，一般 1-3 天可完成基礎課程。我們採彈性排課，配合你的時間進行。",
  },
];

export default function EntrepreneurshipPage() {
  return (
    <>
      <Header />
      <main className="pt-20">

        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-[#FAF7F2] via-[#F3E9DF] to-[#EAD9CB] overflow-hidden py-24 lg:py-32">
          {/* 右上角裝飾光暈 */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-terracotta/8 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-gold/6 blur-3xl pointer-events-none" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <span className="inline-block text-xs tracking-[0.25em] text-gold font-medium uppercase mb-5">
              Entrepreneurship Program
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold text-ink leading-tight mb-6">
              從一技之長<br />
              <span className="text-terracotta">打造你的養生事業</span>
            </h1>
            <p className="text-ink-muted text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              不需要高學歷、不需要龐大資金，只需要一身紮實技術與一顆創業的心。
              溫罐子帶你從技術培訓到獨立開業，每一步都有人陪。
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/courses"
                className="bg-terracotta text-cream font-medium px-8 py-4 rounded-full hover:bg-terracotta-dark transition shadow-sm"
              >
                查看技術培訓課程
              </Link>
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-ink/20 text-ink font-medium px-8 py-4 rounded-full hover:border-terracotta hover:text-terracotta transition"
              >
                LINE 洽詢詳情
              </a>
            </div>
          </div>
        </section>

        {/* ── 為什麼選養生創業 ── */}
        <section className="py-20 bg-cream">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-3">
                為什麼選擇養生產業創業？
              </h2>
              <p className="text-ink-muted">不容易被AI取代、真正的技術、人與人之間的溫暖、高回購、時間自主——是許多人轉換跑道的最佳選擇</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {reasons.map((r) => (
                <div key={r.title} className="bg-white rounded-2xl p-6 border border-cream-border shadow-sm hover:shadow-md transition">
                  <div className="text-3xl mb-4">{r.icon}</div>
                  <h3 className="font-heading text-lg font-semibold text-ink mb-2">{r.title}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 培訓路徑 ── */}
        <section className="py-20 bg-[#f5ede3]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-3">
                從學員到創業者
              </h2>
              <p className="text-ink-muted">四個階段，帶你走完從零到開業的完整路徑</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {pathway.map((p, i) => (
                <div key={p.step} className="relative bg-white rounded-2xl p-6 border border-cream-border shadow-sm">
                  {i < pathway.length - 1 && (
                    <div className="hidden lg:block absolute top-10 -right-2.5 z-10">
                      <ChevronRight size={18} className="text-terracotta/40" />
                    </div>
                  )}
                  <div className="font-heading text-4xl font-bold text-terracotta/20 mb-3">
                    {p.step}
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-ink mb-2">{p.title}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed mb-4">{p.desc}</p>
                  <ul className="space-y-1.5">
                    {p.sub.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-xs text-ink-muted">
                        <Check size={12} className="text-olive mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8 大技術 → 創業選項 ── */}
        <section className="py-20 bg-cream">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-3">
                8 大技術，8 種創業方向
              </h2>
              <p className="text-ink-muted">每門技術都能獨立成為你的核心服務，也可以組合出屬於你的特色套餐</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {skills.map((s) => (
                <div key={s.name} className="bg-white rounded-xl p-5 border border-cream-border hover:border-terracotta/30 hover:shadow-md transition group">
                  <h3 className="font-heading text-base font-semibold text-ink mb-2 group-hover:text-terracotta transition-colors">
                    {s.name}
                  </h3>
                  <p className="text-ink-muted text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-terracotta text-cream font-medium px-8 py-3.5 rounded-full hover:bg-terracotta-dark transition shadow-sm"
              >
                查看技術培訓詳細課程 <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 溫罐子的優勢 ── */}
        <section className="py-20 bg-[#f5ede3]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-3">
                為什麼選擇溫罐子培訓？
              </h2>
              <p className="text-ink-muted">我們不只教技術，更陪你走上創業這條路</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  icon: "👥",
                  title: "超小班制教學",
                  desc: "1 對 1 或 1 對 2，每位學員都能獲得充分的個人指導，不在群體中被忽略。",
                },
                {
                  icon: "🎯",
                  title: "實務導向課程",
                  desc: "從第一堂課開始就在真人身上練習，不只看影片、不只紙上談兵，學到就能用。",
                },
                {
                  icon: "🤝",
                  title: "學後持續支援",
                  desc: "學成後遇到技術問題、創業困惑，隨時可以回來諮詢，溫罐子是你長期的後盾。",
                },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-2xl p-6 text-center border border-cream-border shadow-sm hover:shadow-md transition">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="font-heading text-lg font-semibold text-ink mb-2">{item.title}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 常見問題 ── */}
        <section className="py-20 bg-cream">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-heading text-3xl font-semibold text-ink text-center mb-10">
              常見問題
            </h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-white rounded-2xl p-6 border border-cream-border shadow-sm">
                  <h3 className="font-medium text-ink mb-2">Q｜{faq.q}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed">A｜{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-16 bg-[#f5ede3]">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mb-4">
              準備好踏出第一步了嗎？
            </h2>
            <p className="text-ink-muted mb-8 leading-relaxed">
              先從技術培訓開始，學會一門讓你有底氣的技術。<br />
              有任何創業規劃的問題，歡迎直接 LINE 找我們聊。
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/courses"
                className="bg-terracotta text-cream font-medium px-8 py-3.5 rounded-full hover:bg-terracotta-dark transition shadow-sm"
              >
                查看技術培訓課程
              </Link>
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-ink/20 text-ink font-medium px-8 py-3.5 rounded-full hover:border-terracotta hover:text-terracotta transition"
              >
                LINE @warmjar 洽詢
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
