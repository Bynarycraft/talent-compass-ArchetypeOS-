import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Extend the built-in session types
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            archetype?: string;
        }
    }
    interface User {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string;
        archetype?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role?: string;
        archetype?: string;
    }
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/signin",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                console.log("[authorize] Called with credentials:", { email: credentials?.email });
                
                if (!credentials?.email || !credentials?.password) {
                    console.log("[authorize] Missing email or password");
                    return null;
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email }
                    });

                    if (!user) {
                        console.log("[authorize] User not found:", credentials.email);
                        return null;
                    }

                    if (!user.password) {
                        console.log("[authorize] User has no password");
                        return null;
                    }

                    // Compare password with bcrypt
                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    console.log("[authorize] Password valid:", isValid);

                    if (!isValid) {
                        console.log("[authorize] Invalid password");
                        return null;
                    }

                    console.log("[authorize] Auth successful for:", user.email);
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        archetype: user.archetype || undefined,
                    };
                } catch (error) {
                    console.error("[authorize] Error during auth:", error);
                    return null;
                }
            }
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            console.log("[jwt] Called with user:", user ? { id: user.id, email: user.email } : "none");
            if (user) {
                token.id = user.id as string;
                token.role = user.role as string;
                token.archetype = user.archetype as string;
            }
            console.log("[jwt] Returning token:", { id: token.id });
            return token;
        },
        async session({ session, token }) {
            console.log("[session] Called with token:", { id: token.id });
            if (session && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.archetype = token.archetype as string;
            }
            console.log("[session] Returning session:", { user: session?.user });
            return session;
        }
    }
};
