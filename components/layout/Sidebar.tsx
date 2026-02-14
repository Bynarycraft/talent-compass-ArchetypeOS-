import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { navConfig } from "@/config/nav";
import { ModeToggle } from "@/components/theme-toggle";
import { LayoutDashboard, BookOpen, Users, BarChart3, Clock, Map, Bell, ClipboardList, MessageSquare, Notebook, Brain, Award } from "lucide-react";
import MobileNav from "@/components/layout/MobileNav";

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

import { SignOutButton } from "@/components/auth/sign-out-button";

export async function Sidebar() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role) {
        return null;
    }

    const items = navConfig[session.user.role as keyof typeof navConfig] || [];
    const roleHome: Record<string, string> = {
        candidate: "/candidate",
        learner: "/dashboard",
        supervisor: "/supervisor",
        admin: "/admin/dashboard",
    };
    const homeHref = roleHome[session.user.role] || "/dashboard";

    return (
        <>
            <MobileNav
                items={items}
                homeHref={homeHref}
                userName={session.user.name || "User"}
                userRole={session.user.role}
            />
            <div className="hidden md:flex h-screen w-64 flex-col border-r border-border/40 bg-card/60 backdrop-blur-2xl text-card-foreground p-6 shadow-2xl shadow-primary/5">
                {/* Header */}
                <div className="flex items-center justify-between mb-10 px-2">
                    <Link href={homeHref} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                            <span className="text-primary-foreground font-black text-xl">A</span>
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg font-black tracking-tight leading-none text-gradient">ArchetypeOS</h2>
                            <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">Talent Compass</span>
                        </div>
                    </Link>
                    <div className="scale-90 opacity-80 hover:opacity-100 transition-opacity">
                        <ModeToggle />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-2">
                    {items.map((item: { href: string; label: string; icon: string }) => {
                        const Icon = iconMap[item.icon as keyof typeof iconMap];
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:bg-primary/10 hover:text-primary relative overflow-hidden active:scale-95"
                            >
                                <div className="relative z-10 p-2 rounded-xl bg-secondary/50 group-hover:bg-primary/20 transition-all duration-300 group-hover:rotate-6">
                                    {Icon && <Icon className="h-4 w-4" />}
                                </div>
                                <span className="relative z-10">{item.label}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0 group-hover:to-primary/5 transition-all duration-500" />
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / User Profile */}
                <div className="mt-auto space-y-4">
                    <div className="p-1 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-accent/10">
                        <div className="flex items-center justify-between gap-3 p-3 rounded-[calc(var(--radius)-4px)] bg-card/80 backdrop-blur-md border border-white/10 dark:border-white/5 shadow-inner">
                            <Link href="/profile" className="flex items-center gap-3 overflow-hidden group/profile">
                                <div className="w-10 h-10 rounded-full bg-primary/20 shrink-0 flex items-center justify-center border-2 border-primary/20 group-hover/profile:border-primary/60 transition-all duration-300 overflow-hidden relative">
                                    <span className="text-primary font-black relative z-10">{session.user.name?.[0] || session.user.email?.[0]}</span>
                                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex flex-col overflow-hidden text-xs">
                                    <span className="font-bold truncate group-hover/profile:text-primary transition-colors">{session.user.name || "User"}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-black text-[8px] tracking-tighter">
                                            {session.user.role}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                            <SignOutButton />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Sidebar;
