import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, avatar_url, photo_credits, role")
    .eq("id", user.id)
    .single();

  const safeProfile = profile ?? {
    name: user.email?.split("@")[0] ?? null,
    email: user.email ?? null,
    avatar_url: null,
    photo_credits: 0,
    role: "user",
  };

  return <AppShell profile={safeProfile}>{children}</AppShell>;
}
