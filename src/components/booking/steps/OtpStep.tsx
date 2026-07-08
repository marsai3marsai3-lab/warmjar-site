"use client";

import { Button } from "@/components/ui/Button";

type OtpStepProps = {
  customerName: string;
  onNameChange: (value: string) => void;
  customerPhone: string;
  onPhoneChange: (value: string) => void;
  otpSent: boolean;
  onSendOtp: () => void;
  sendingOtp: boolean;
  sendOtpError: string | null;
  devCode: string | null;
  otpCode: string;
  onOtpCodeChange: (value: string) => void;
  onVerifyOtp: () => void;
  verifyingOtp: boolean;
  verifyError: string | null;
  otpVerified: boolean;
};

export function OtpStep({
  customerName,
  onNameChange,
  customerPhone,
  onPhoneChange,
  otpSent,
  onSendOtp,
  sendingOtp,
  sendOtpError,
  devCode,
  otpCode,
  onOtpCodeChange,
  onVerifyOtp,
  verifyingOtp,
  verifyError,
  otpVerified,
}: OtpStepProps) {
  const phoneValid = /^09\d{8}$/.test(customerPhone);

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="font-heading text-xl font-semibold text-ink mb-1">手機驗證</h2>
        <p className="text-ink-muted text-sm">為了保留您的預約時段，請完成手機驗證。</p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">姓名</span>
        <input
          value={customerName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="請輸入姓名"
          className="w-full rounded-xl border border-cream-border bg-white px-4 py-3 text-ink outline-none focus:border-terracotta"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">手機號碼</span>
        <div className="flex gap-2">
          <input
            value={customerPhone}
            onChange={(e) => onPhoneChange(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="09xxxxxxxx"
            disabled={otpVerified}
            className="flex-1 rounded-xl border border-cream-border bg-white px-4 py-3 text-ink outline-none focus:border-terracotta disabled:bg-cream-dark"
          />
          <Button
            variant="outline"
            size="md"
            disabled={!phoneValid || sendingOtp || otpVerified}
            onClick={onSendOtp}
          >
            {otpSent ? "重新發送" : "發送驗證碼"}
          </Button>
        </div>
        {sendOtpError && <p className="mt-1.5 text-sm text-terracotta-dark">{sendOtpError}</p>}
      </div>

      {devCode && !otpVerified && (
        <p className="rounded-xl bg-gold/10 px-4 py-2.5 text-sm text-ink-muted">
          （本機測試用，正式上線需串接簡訊商）驗證碼：
          <span className="font-mono font-medium text-ink">{devCode}</span>
        </p>
      )}

      {otpSent && !otpVerified && (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">驗證碼</span>
          <div className="flex gap-2">
            <input
              value={otpCode}
              onChange={(e) => onOtpCodeChange(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="6 碼數字"
              maxLength={6}
              className="flex-1 rounded-xl border border-cream-border bg-white px-4 py-3 tracking-[0.3em] text-ink outline-none focus:border-terracotta"
            />
            <Button
              variant="primary"
              size="md"
              disabled={otpCode.length !== 6 || verifyingOtp}
              onClick={onVerifyOtp}
            >
              確認
            </Button>
          </div>
          {verifyError && <p className="mt-1.5 text-sm text-terracotta-dark">{verifyError}</p>}
        </div>
      )}

      {otpVerified && (
        <p className="rounded-xl bg-olive/10 px-4 py-2.5 text-sm font-medium text-olive-dark">
          手機號碼已驗證完成
        </p>
      )}
    </div>
  );
}
