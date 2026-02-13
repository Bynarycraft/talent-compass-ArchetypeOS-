"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
        } finally {
            router.push("/auth/signin");
            router.refresh();
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={handleSignOut}
        >
            <LogOut className="h-4 w-4" />
        </Button>
    );
}
