"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/login/actions";
import { Mail, FileText, Settings, LogOut, MessageCircle } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Leads", icon: Mail },
  { href: "/dm-bestsellers", label: "DM Bestsellers", icon: MessageCircle },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const AdminNav = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              Winback
            </Link>
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};
