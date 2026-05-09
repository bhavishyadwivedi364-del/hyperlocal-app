import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ShoppingBag, Store,
  LogOut, Menu, X, Globe, FileCheck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const navItems = [
  { href: "/seller", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/seller/shop", icon: Store, label: "My Shop" },
  { href: "/seller/products", icon: Package, label: "Products" },
  { href: "/seller/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/seller/kyc", icon: FileCheck, label: "KYC Verify" },
];

export function SellerLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang, setLang } = useI18n();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full z-30 w-64 bg-primary text-primary-foreground flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="flex items-center justify-between p-5 border-b border-primary-foreground/20">
          <div>
            <h2 className="text-lg font-bold">Seller Central</h2>
            <p className="text-xs text-primary-foreground/70">NearKart</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-primary-foreground/70 hover:text-primary-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-primary-foreground/20 space-y-2">
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
          >
            <Globe className="h-4 w-4" />
            {lang === "en" ? "Switch to हिंदी" : "Switch to English"}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="lg:hidden bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-primary-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold">Seller Central</span>
        </header>

        <main className="p-4 lg:p-8 max-w-4xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
