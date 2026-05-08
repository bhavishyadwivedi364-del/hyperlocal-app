import { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-zinc-900 text-white p-4 flex flex-col">
        <h2 className="text-2xl font-bold mb-8">Admin Panel</h2>
        <nav className="space-y-2 flex-1">
          <Link href="/admin" className="block py-2 px-4 rounded hover:bg-zinc-800">Dashboard</Link>
          <Link href="/admin/sellers" className="block py-2 px-4 rounded hover:bg-zinc-800">Sellers</Link>
          <Link href="/admin/users" className="block py-2 px-4 rounded hover:bg-zinc-800">Users</Link>
          <Link href="/admin/orders" className="block py-2 px-4 rounded hover:bg-zinc-800">Orders</Link>
        </nav>
        <button onClick={logout} className="mt-auto py-2 px-4 bg-red-600 rounded text-white font-medium hover:bg-red-700">Logout</button>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
