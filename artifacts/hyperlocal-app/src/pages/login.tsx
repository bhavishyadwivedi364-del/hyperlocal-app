import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

export function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl text-white font-bold">H</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to HyperLocal</h1>
        <p className="text-muted-foreground mb-8">Your neighborhood marketplace. Groceries, medicines, and food delivered fast.</p>
        
        <Button onClick={login} size="lg" className="w-full text-lg h-12">
          Log in to continue
        </Button>
      </div>
    </div>
  );
}
