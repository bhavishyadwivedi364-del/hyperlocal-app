import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { ShoppingBag, Shield, Store, ChevronRight, Phone, KeyRound } from "lucide-react";

type Step = "phone" | "otp" | "role";
type Role = "customer" | "seller" | "admin";

export function Login() {
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function sendOtp() {
    const clean = phone.replace(/\s/g, "");
    if (clean.length < 10) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean }),
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
        body: JSON.stringify({ phone: phone.replace(/\s/g, ""), otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Check if user has a profile/role
      const profileRes = await fetch("/api/users/profile");
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (!profile.role || profile.role === "customer") {
          setStep("role");
          return;
        }
      } else {
        setStep("role");
        return;
      }
      queryClient.invalidateQueries();
      window.location.reload();
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
    { role: "customer", icon: ShoppingBag, label: t("iAmCustomer"), desc: "Browse shops, order groceries, medicines & food", color: "bg-orange-50 border-orange-200 text-orange-700" },
    { role: "seller", icon: Store, label: t("iAmSeller"), desc: "Register your shop and sell to local customers", color: "bg-green-50 border-green-200 text-green-700" },
    { role: "admin", icon: Shield, label: t("iAmAdmin"), desc: "Manage the platform, approve sellers", color: "bg-blue-50 border-blue-200 text-blue-700" },
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
              <span className="text-4xl font-bold text-white">H</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("appName")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("tagline")}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {step === "phone" && (
              <>
                <h2 className="text-lg font-bold mb-1">{t("enterPhone")}</h2>
                <p className="text-sm text-muted-foreground mb-4">We'll send you a one-time password</p>
                <div className="relative mb-4">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder={t("phonePlaceholder")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 h-12 text-base"
                    onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  />
                </div>
                <Button onClick={sendOtp} disabled={loading} className="w-full h-12 text-base font-semibold">
                  {loading ? "Sending..." : t("sendOtp")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  By continuing, you agree to our Terms of Service
                </p>
              </>
            )}

            {step === "otp" && (
              <>
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setDemoOtp(null); }}
                  className="text-sm text-muted-foreground mb-3 flex items-center gap-1 hover:text-foreground"
                >
                  ← Change number
                </button>
                <h2 className="text-lg font-bold mb-1">{t("enterOtp")}</h2>
                <p className="text-sm text-muted-foreground mb-1">Sent to {phone}</p>

                {demoOtp && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">Demo OTP:</span>
                    <span className="text-lg font-mono font-bold text-amber-800 tracking-widest">{demoOtp}</span>
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
                  />
                </div>
                <Button onClick={verifyOtp} disabled={loading || otp.length !== 6} className="w-full h-12 text-base font-semibold">
                  {loading ? "Verifying..." : t("verifyOtp")}
                </Button>
                <div className="mt-3 text-center">
                  {countdown > 0 ? (
                    <span className="text-sm text-muted-foreground">Resend OTP in {countdown}s</span>
                  ) : (
                    <button onClick={sendOtp} disabled={loading} className="text-sm text-primary font-medium hover:underline">
                      {t("resendOtp")}
                    </button>
                  )}
                </div>
              </>
            )}

            {step === "role" && (
              <>
                <h2 className="text-lg font-bold mb-1">{t("selectRole")}</h2>
                <p className="text-sm text-muted-foreground mb-4">Choose your role to get started</p>
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
