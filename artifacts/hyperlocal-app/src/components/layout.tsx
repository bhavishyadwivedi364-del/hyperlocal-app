import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { HomeIcon, ShoppingBag, ShoppingCart, User, MapPin, Globe } from "lucide-react";
import { useGetCart, useGetUserProfile } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Chatbot } from "./chatbot";

export function MainLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { t, lang, setLang } = useI18n();
  const { data: cart } = useGetCart();
  const { data: profile } = useGetUserProfile();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const cartCount = cart?.totalItems ?? 0;

  const navItems = [
    { href: "/", icon: HomeIcon, label: t("home") },
    { href: "/nearby", icon: MapPin, label: lang === "hi" ? "पास" : "Nearby" },
    { href: "/cart", icon: ShoppingCart, label: t("cart"), badge: cartCount > 0 ? cartCount : undefined },
    { href: "/profile", icon: User, label: t("profile") },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="mx-auto max-w-md bg-white min-h-screen shadow-xl relative">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t("appName")}</h1>
              {profile?.city && (
                <p className="text-xs text-primary-foreground/80 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {profile.city}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary-foreground/20 text-sm font-medium hover:bg-primary-foreground/30 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {lang === "en" ? "EN" : "हि"}
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border overflow-hidden z-30 w-32">
                    <button
                      onClick={() => { setLang("en"); setShowLangMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-muted ${lang === "en" ? "font-semibold text-primary" : "text-foreground"}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => { setLang("hi"); setShowLangMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-muted ${lang === "hi" ? "font-semibold text-primary" : "text-foreground"}`}
                    >
                      हिंदी
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Click away to close lang menu */}
        {showLangMenu && (
          <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)} />
        )}

        <div className="pb-16">
          {children}
        </div>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-border flex justify-around z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 gap-0.5 relative ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge != null && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium truncate ${isActive ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Floating AI Chatbot */}
        <Chatbot />
      </main>
    </div>
  );
}
