import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Store, Users, ShoppingBag, MessageSquare, FileCheck,
  LogOut, Menu, X, Download,
} from "lucide-react";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/sellers", icon: Store, label: "Sellers" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/admin/feedback", icon: MessageSquare, label: "Feedback" },
  { href: "/admin/kyc", icon: FileCheck, label: "KYC Review" },
];

const exportLinks = [
  { label: "Orders CSV", path: "/api/admin/export/orders" },
  { label: "Users CSV", path: "/api/admin/export/users" },
  { label: "Products CSV", path: "/api/admin/export/products" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full z-30 w-64 bg-zinc-900 text-white flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="p-5 border-b border-zinc-700">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Admin Panel</h2>
              <p className="text-[10px] text-zinc-400">NearKart</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary/80 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4">
            <p className="text-[10px] uppercase font-semibold text-zinc-500 px-3 mb-1">Export Data</p>
            {exportLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => window.open(link.path, "_blank")}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors w-full"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                {link.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="lg:hidden bg-zinc-900 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold">Admin Panel</span>
        </header>

        <main className="p-4 lg:p-8 max-w-5xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
