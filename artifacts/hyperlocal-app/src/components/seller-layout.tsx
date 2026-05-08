import { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";

export function SellerLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-primary text-primary-foreground p-4 flex flex-col">
        <h2 className="text-2xl font-bold mb-8">Seller Central</h2>
        <nav className="space-y-2 flex-1">
          <Link href="/seller" className="block py-2 px-4 rounded hover:bg-blue-700">Dashboard</Link>
          <Link href="/seller/products" className="block py-2 px-4 rounded hover:bg-blue-700">Products</Link>
          <Link href="/seller/orders" className="block py-2 px-4 rounded hover:bg-blue-700">Orders</Link>
          <Link href="/seller/shop" className="block py-2 px-4 rounded hover:bg-blue-700">Shop Profile</Link>
        </nav>
        <button onClick={logout} className="mt-auto py-2 px-4 bg-red-600 rounded text-white font-medium hover:bg-red-700">Logout</button>
      </aside>
      <main className="flex-1 p-8 bg-white">
        {children}
      </main>
    </div>
  );
}
