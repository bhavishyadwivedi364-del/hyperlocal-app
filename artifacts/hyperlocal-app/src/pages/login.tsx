import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { ShoppingBag, Store, ChevronRight, Phone, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";

type Step = "phone" | "otp" | "role";
type Role = "customer" | "seller";

// ─── Indian phone validation & normalization ──────────────────────────────────

interface PhoneResult {
  valid: boolean;
  normalized?: string;   // "+91XXXXXXXXXX"
  digits?: string;       // "XXXXXXXXXX"
  error?: string;
}

function validateIndianPhone(raw: string): PhoneResult {
  // Strip all spaces, dashes, dots, parentheses
  const cleaned = raw.replace(/[\s\-\.\(\)]/g, "");

  if (!cleaned) return { valid: false, error: "Please enter your mobile number" };

  // Reject if it contains any non-digit characters (except a leading +)
  if (!/^\+?\d+$/.test(cleaned)) {
    return { valid: false, error: "Mobile number must contain digits only" };
  }

  let digits = cleaned;

  // Strip +91 prefix
  if (digits.startsWith("+91")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("91") && digits.length === 12) {
    // 91XXXXXXXXXX — only strip country code when total length is exactly 12
    digits = digits.slice(2);
  }

  // Must now be exactly 10 digits
  if (digits.length !== 10) {
    if (digits.length < 10) {
      return { valid: false, error: `Number too short — enter a 10-digit mobile number` };
    }
    return { valid: false, error: `Number too long — enter a 10-digit mobile number` };
  }

  // Indian mobile numbers start with 6, 7, 8 or 9
  if (!/^[6-9]/.test(digits)) {
    return { valid: false, error: "Indian mobile numbers start with 6, 7, 8 or 9" };
  }

  return { valid: true, normalized: `+91${digits}`, digits };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Login() {
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");          // raw user input
  const [normalizedPhone, setNormalizedPhone] = useState(""); // +91XXXXXXXXXX
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Real-time validation as the user types (only after first touch)
  useEffect(() => {
    if (!phoneTouched) return;
    const result = validateIndianPhone(phone);
    setPhoneError(result.valid ? null : (result.error ?? null));
  }, [phone, phoneTouched]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Derived: is the current phone input valid?
  const phoneValidation = validateIndianPhone(phone);
  const phoneIsValid = phoneValidation.valid;

  async function sendOtp() {
    setPhoneTouched(true);
    const result = validateIndianPhone(phone);
    if (!result.valid) {
      setPhoneError(result.error ?? "Invalid phone number");
      return;
    }

    const normalized = result.normalized!;
    setNormalizedPhone(normalized);
    setPhoneError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDemoOtp(data.demo_otp);
      setStep("otp");
      setCountdown(30);
      toast({ title: "OTP sent!" });
    } catch (e: any) {
      toast({ title: e.message || "Failed to send OTP", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const profileRes = await fetch("/api/users/profile");
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.role && profile.role !== "customer") {
          queryClient.invalidateQueries();
          window.location.reload();
          return;
        }
        setStep("role");
        return;
      }
      setStep("role");
    } catch (e: any) {
      toast({ title: e.message || "Invalid OTP", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function selectRole(role: Role) {
    setLoading(true);
    try {
      await fetch("/api/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      queryClient.invalidateQueries();
      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  const roleOptions: { role: Role; icon: typeof ShoppingBag; label: string; desc: string; color: string }[] = [
    {
      role: "customer",
      icon: ShoppingBag,
      label: t("iAmCustomer"),
      desc: "Browse shops, order groceries, medicines & food",
      color: "bg-orange-50 border-orange-200 text-orange-700",
    },
    {
      role: "seller",
      icon: Store,
      label: t("iAmSeller"),
      desc: "Register your shop and sell to local customers",
      color: "bg-green-50 border-green-200 text-green-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col">
      {/* Language toggle */}
      <div className="flex justify-end p-4">
        <button
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="text-sm font-medium px-3 py-1 rounded-full bg-white border border-border shadow-sm text-foreground"
        >
          {lang === "en" ? "हिंदी" : "English"}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
              <span className="text-4xl font-bold text-white">N</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("appName")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("tagline")}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6">

            {/* ── Phone step ── */}
            {step === "phone" && (
              <>
                <h2 className="text-lg font-bold mb-1">{t("enterPhone")}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  We'll send you a one-time password
                </p>

                {/* Input with live validation indicator */}
                <div className="mb-1">
                  <div className="relative">
                    {/* Country code badge */}
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground select-none pointer-events-none flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <span>+91</span>
                    </span>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => {
                        // Allow digits, spaces, +, - only
                        const raw = e.target.value.replace(/[^\d\s\+\-\.]/g, "");
                        setPhone(raw);
                      }}
                      onBlur={() => setPhoneTouched(true)}
                      className={`pl-16 pr-10 h-12 text-base font-mono tracking-wide transition-colors ${
                        phoneTouched && phoneIsValid
                          ? "border-green-400 focus-visible:ring-green-300"
                          : phoneTouched && phoneError
                          ? "border-destructive focus-visible:ring-destructive/30"
                          : ""
                      }`}
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                    />
                    {/* Validation icon */}
                    {phoneTouched && phone.length > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {phoneIsValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Error / hint text */}
                  <div className="mt-1.5 min-h-[18px]">
                    {phoneTouched && phoneError ? (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {phoneError}
                      </p>
                    ) : phoneTouched && phoneIsValid ? (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        Looks good — {phoneValidation.normalized}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Enter 10-digit mobile number (e.g. 9876543210)
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold mt-3"
                >
                  {loading ? "Sending..." : t("sendOtp")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  By continuing, you agree to our Terms of Service
                </p>
              </>
            )}

            {/* ── OTP step ── */}
            {step === "otp" && (
              <>
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setDemoOtp(null); }}
                  className="text-sm text-muted-foreground mb-3 flex items-center gap-1 hover:text-foreground"
                >
                  ← Change number
                </button>
                <h2 className="text-lg font-bold mb-1">{t("enterOtp")}</h2>
                <p className="text-sm text-muted-foreground mb-1">
                  Sent to{" "}
                  <span className="font-medium text-foreground font-mono">
                    {normalizedPhone}
                  </span>
                </p>

                {demoOtp && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">Demo OTP:</span>
                    <span className="text-lg font-mono font-bold text-amber-800 tracking-widest">
                      {demoOtp}
                    </span>
                  </div>
                )}

                <div className="relative mb-4">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={t("otpPlaceholder")}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-10 h-12 text-xl font-mono tracking-widest text-center"
                    onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && verifyOtp()}
                    autoFocus
                  />
                </div>

                <Button
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 text-base font-semibold"
                >
                  {loading ? "Verifying..." : t("verifyOtp")}
                </Button>

                <div className="mt-3 text-center">
                  {countdown > 0 ? (
                    <span className="text-sm text-muted-foreground">
                      Resend OTP in {countdown}s
                    </span>
                  ) : (
                    <button
                      onClick={sendOtp}
                      disabled={loading}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      {t("resendOtp")}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── Role step ── */}
            {step === "role" && (
              <>
                <h2 className="text-lg font-bold mb-1">{t("selectRole")}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose how you'll use NearKart
                </p>
                <div className="space-y-3">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.role}
                        onClick={() => selectRole(opt.role)}
                        disabled={loading}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 hover:opacity-90 transition-opacity text-left ${opt.color}`}
                      >
                        <div className="shrink-0">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs opacity-75 mt-0.5">{opt.desc}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Made with love for Tier-2/Tier-3 India
          </p>
        </div>
      </div>
    </div>
  );
}
