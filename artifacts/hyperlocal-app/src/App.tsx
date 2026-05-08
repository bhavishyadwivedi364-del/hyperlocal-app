import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetUserProfile } from "@workspace/api-client-react";

import { I18nProvider } from "@/lib/i18n";
import { MainLayout } from "./components/layout";
import { AdminLayout } from "./components/admin-layout";
import { SellerLayout } from "./components/seller-layout";
import NotFound from "@/pages/not-found";
import { Login } from "@/pages/login";
import { Home } from "@/pages/home";
import { CategoryPage } from "@/pages/category";
import { ShopsPage } from "@/pages/shops";
import { ShopDetailPage } from "@/pages/shop-detail";
import { ProductDetailPage } from "@/pages/product-detail";
import { CartPage } from "@/pages/cart";
import { CheckoutPage } from "@/pages/checkout";
import { OrdersPage } from "@/pages/orders";
import { OrderDetailPage } from "@/pages/order-detail";
import { ProfilePage } from "@/pages/profile";
import { ContactPage } from "@/pages/contact";
import { NearbyShopsPage } from "@/pages/nearby";
import { SellerDashboard } from "@/pages/seller/dashboard";
import { SellerProducts } from "@/pages/seller/products";
import { SellerOrders } from "@/pages/seller/orders";
import { SellerShopProfile } from "@/pages/seller/shop-profile";
import { AdminDashboard } from "@/pages/admin/dashboard";
import { AdminSellers } from "@/pages/admin/sellers";
import { AdminUsers } from "@/pages/admin/users";
import { AdminOrders } from "@/pages/admin/orders";
import { AdminFeedback } from "@/pages/admin/feedback";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: profile, isLoading: profileLoading } = useGetUserProfile({
    query: { enabled: isAuthenticated },
  });

  if (authLoading || (isAuthenticated && profileLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-primary-foreground font-bold text-xl">H</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="*" component={Login} />
      </Switch>
    );
  }

  const role = profile?.role || "customer";

  if (role === "admin") {
    return (
      <AdminLayout>
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/sellers" component={AdminSellers} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/feedback" component={AdminFeedback} />
          <Route path="*" component={() => <AdminDashboard />} />
        </Switch>
      </AdminLayout>
    );
  }

  if (role === "seller") {
    return (
      <SellerLayout>
        <Switch>
          <Route path="/seller" component={SellerDashboard} />
          <Route path="/seller/products" component={SellerProducts} />
          <Route path="/seller/orders" component={SellerOrders} />
          <Route path="/seller/shop" component={SellerShopProfile} />
          <Route path="*" component={() => <SellerDashboard />} />
        </Switch>
      </SellerLayout>
    );
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/category/:slug" component={CategoryPage} />
        <Route path="/shops" component={ShopsPage} />
        <Route path="/shop/:id" component={ShopDetailPage} />
        <Route path="/product/:id" component={ProductDetailPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/order/:id" component={OrderDetailPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/nearby" component={NearbyShopsPage} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

export default App;
