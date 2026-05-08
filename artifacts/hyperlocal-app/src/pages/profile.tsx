import { useState, useEffect } from "react";
import { useGetUserProfile, useUpdateUserProfile } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProfilePage() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const { data: profile, isLoading } = useGetUserProfile();

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

  const { mutate: updateProfile, isPending } = useUpdateUserProfile({
    mutation: {
      onSuccess: () => toast({ title: "Profile updated successfully" }),
      onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  const initials = (profile?.name ?? "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">My Profile</h1>

      <div className="flex items-center gap-4 mb-8 p-4 bg-primary/5 rounded-2xl">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile?.profileImageUrl ?? undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-lg">{profile?.name || "Your Name"}</p>
          <p className="text-sm text-muted-foreground">{profile?.email || ""}</p>
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block capitalize">
            {profile?.role}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Full Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Phone Number</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 XXXXX XXXXX"
            type="tel"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Delivery Address</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Your default address"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>City</Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Your city"
            className="mt-1.5"
          />
        </div>

        <Button
          className="w-full"
          disabled={isPending}
          onClick={() => updateProfile({ name, phone, address, city })}
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="mt-8 pt-6 border-t">
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
