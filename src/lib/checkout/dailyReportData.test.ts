import { describe, expect, it } from "vitest";
import { buildDailyReportCsv, type DailyReport } from "./dailyReportData";

const SAMPLE_REPORT: DailyReport = {
  date: "2026-07-15",
  revenueByMethod: [
    { method: "cash", amount: 12400 },
    { method: "ecpay_credit", amount: 8200 },
  ],
  revenueTotal: 20600,
  depositIncomeToday: 1280,
  depositForfeitedToday: 0,
  staffPerformance: [
    { staffId: "s1", staffName: "林師傅", faceValueTotal: 8200, commissionTotal: 3690 },
    { staffId: "s2", staffName: "陳師傅", faceValueTotal: 6400, commissionTotal: 2560 },
  ],
  checkoutCount: 8,
};

describe("buildDailyReportCsv", () => {
  it("155) 產出的 CSV 內容涵蓋當日營收、訂金收入、師傅業績、結帳筆數四個區塊", () => {
    const csv = buildDailyReportCsv(SAMPLE_REPORT);
    expect(csv).toContain("2026-07-15");
    expect(csv).toContain("cash,12400");
    expect(csv).toContain("ecpay_credit,8200");
    expect(csv).toContain("合計,20600");
    expect(csv).toContain("今日收訂金,1280");
    expect(csv).toContain("今日沒收,0");
    expect(csv).toContain("林師傅,8200,3690");
    expect(csv).toContain("結帳筆數,8");
  });

  it("156) 師傅名稱含逗號時正確加上雙引號跳脫，不會把 CSV 欄位撐開", () => {
    const csv = buildDailyReportCsv({
      ...SAMPLE_REPORT,
      staffPerformance: [{ staffId: "s1", staffName: "林師傅,資深", faceValueTotal: 1000, commissionTotal: 400 }],
    });
    expect(csv).toContain('"林師傅,資深",1000,400');
  });
});
