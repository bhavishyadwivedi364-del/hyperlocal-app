import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { HomeIcon, ShoppingBag, ShoppingCart, User } from "lucide-react";

export function MainLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/shops", icon: ShoppingBag, label: "Shops" },
    { href: "/cart", icon: ShoppingCart, label: "Cart" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 pb-16 md:pb-0">
      <main className="mx-auto max-w-md bg-white dark:bg-zinc-950 min-h-screen shadow-xl relative">
        <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4">
          <h1 className="text-xl font-bold tracking-tight">HyperLocal</h1>
        </header>
        
        <div className="p-4">
          {children}
        </div>

        <nav className="fixed bottom-0 w-full max-w-md bg-white dark:bg-zinc-950 border-t border-border flex justify-around p-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center w-16 gap-1 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
