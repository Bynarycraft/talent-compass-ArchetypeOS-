"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LayoutDashboard, BookOpen, Users, BarChart3, Clock, Map, Bell, ClipboardList, MessageSquare, Notebook, Brain, Award } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

type NavItem = { href: string; label: string; icon: string };

type MobileNavProps = {
  items: NavItem[];
  homeHref: string;
  userName?: string | null;
  userRole?: string | null;
};

const iconMap = {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Clock,
  Map,
  Bell,
  ClipboardList,
  MessageSquare,
  Notebook,
  Brain,
  Award,
};

export default function MobileNav({ items, homeHref, userName, userRole }: MobileNavProps) {
  return (
    <div className="md:hidden sticky top-0 z-40 w-full border-b border-border/40 bg-card/80 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={homeHref} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-black text-lg">A</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black">ArchetypeOS</span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              {userRole || "User"}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-6">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-bold">{userName || "User"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{userRole}</p>
                </div>
                <nav className="space-y-2">
                  {items.map((item) => {
                    const Icon = iconMap[item.icon as keyof typeof iconMap];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold hover:bg-primary/10"
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="pt-2">
                  <SignOutButton />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
