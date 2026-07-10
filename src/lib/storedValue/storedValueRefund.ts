/**
 * 2026-07-13 決策（推翻草案原設計）：principal_balance = 0 時「退費」
 * 按鈕直接不渲染，不是顯示「僅贈額將歸零」的替代文案——沒有本金可退
 * 時，這顆按鈕唯一的效果只是清掉客人的贈額，沒有正當使用場景，只會
 * 製造糾紛。
 */
export function canShowStoredValueRefundButton(isOwner: boolean, principalBalance: number): boolean {
  return isOwner && principalBalance > 0;
}
