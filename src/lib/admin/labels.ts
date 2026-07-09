export const STATUS_LABEL: Record<string, string> = {
  pending: "待確認",
  confirmed: "已確認",
  pending_deposit: "待付訂金",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "爽約",
};

export const DEPOSIT_STATUS_LABEL: Record<string, string> = {
  pending: "待付款",
  paid: "已付款",
  waived: "已免收",
  failed: "付款失敗",
  refunded: "已退款",
  forfeited: "已沒收",
};

export const STATUS_BLOCK_STYLE: Record<string, string> = {
  pending_deposit: "border-2 border-gold bg-gold/10 text-ink",
  confirmed: "bg-terracotta text-cream",
  pending: "bg-terracotta text-cream",
  completed: "bg-olive text-cream",
  cancelled: "bg-cream-dark text-ink-light line-through",
  no_show: "border-2 border-dashed border-terracotta-dark text-terracotta-dark bg-white",
};

export const SOURCE_LABEL: Record<string, string> = {
  walk_in: "現場臨櫃",
  phone: "電話預約",
  line_oa: "官方LINE",
  instagram: "IG",
  admin: "其他",
  web: "官網線上",
  line: "LINE 自助預約",
};

export const ROLE_LABEL: Record<string, string> = {
  owner: "店主",
  manager: "店長",
  staff: "師傅",
  customer: "客人",
};

export const STATUS_DOT_STYLE: Record<string, string> = {
  pending_deposit: "bg-gold",
  confirmed: "bg-terracotta",
  pending: "bg-terracotta",
  completed: "bg-olive",
  cancelled: "bg-ink-light",
  no_show: "bg-terracotta-dark",
};
