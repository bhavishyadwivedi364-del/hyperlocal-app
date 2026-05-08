import { useState, useEffect } from "react";
import { useGetUserProfile, useUpdateUserProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Link } from "wouter";
import {
  User, Phone, Mail, MapPin, Globe, ShoppingBag,
  ChevronRight, Shield, Store, Headphones, LogOut,
} from "lucide-react";

export function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();

  const { data: profile, isLoading } = useGetUserProfile();
  const { mutate: updateProfile, isPending } = useUpdateUserProfile({
    mutation: {
      onSuccess: () => toast({ title: "Profile updated!" }),
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
      setCity(profile.city ?? "");
    }
  }, [profile]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  const save = () => {
    updateProfile({ name, phone, address, city });
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header card */}
      <div className="bg-primary text-primary-foreground px-4 pt-4 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
            {profile?.profileImageUrl ? (
              <img src={profile.profileImageUrl} className="w-full h-full object-cover rounded-2xl" alt="Profile" />
            ) : (
              <User className="h-8 w-8 text-primary-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg">{profile?.name || "HyperLocal User"}</h2>
            <p className="text-primary-foreground/80 text-sm">{profile?.phone || profile?.email || "No contact info"}</p>
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-foreground/20 text-primary-foreground">
              {profile?.role === "admin" ? <Shield className="h-3 w-3" /> : profile?.role === "seller" ? <Store className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
              {profile?.role ?? "customer"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">{t("myProfile")}</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-xs text-primary font-medium">
                {t("editProfile")}
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground">Cancel</button>
                <button onClick={save} className="text-xs text-primary font-semibold">{t("saveChanges")}</button>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {editing ? (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10" placeholder="Your name" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("phone")}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 h-10" placeholder="+91..." />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("address")}</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 h-10" placeholder="Street address" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("city")}</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-10" placeholder="City" />
                </div>
                <Button onClick={save} disabled={isPending} className="w-full" size="sm">
                  {isPending ? "Saving..." : t("saveChanges")}
                </Button>
              </>
            ) : (
              <>
                <InfoRow icon={User} label={t("name")} value={profile?.name || "Not set"} />
                <InfoRow icon={Phone} label={t("phone")} value={profile?.phone || "Not set"} />
                <InfoRow icon={Mail} label={t("email")} value={profile?.email || "Not set"} />
                <InfoRow icon={MapPin} label={t("address")} value={[profile?.address, profile?.city].filter(Boolean).join(", ") || "Not set"} />
              </>
            )}
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> {t("language")}</h3>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); updateProfile({ language: l }); }}
                className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${lang === l ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
              >
                {l === "en" ? "🇬🇧 English" : "🇮🇳 हिंदी"}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <MenuLink href="/orders" icon={ShoppingBag} label={t("orderHistory")} />
          <MenuLink href="/contact" icon={Headphones} label={t("contactSupport")} />
          {profile?.role === "customer" && (
            <MenuLink href="/profile" icon={Store} label={t("becomeSeller")} sub="Register a shop to start selling" />
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-semibold text-sm hover:bg-red-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </button>

        <p className="text-center text-xs text-muted-foreground pb-2">HyperLocal v1.0 · Made for India</p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function MenuLink({ href, icon: Icon, label, sub }: { href: string; icon: any; label: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
