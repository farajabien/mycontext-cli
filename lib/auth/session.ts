import { cookies } from "next/headers";
import { init } from "@instantdb/admin";

// Initialize InstantDB admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
});

// For token verification, we'll use a simpler approach
// Since admin API might not have token verification methods

export interface UserSession {
  id: string;
  email: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    createdAt?: string;
    lastLogin?: string;
  };
}

export async function getServerSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("mycontext-session")?.value;

    if (!userData) {
      return null;
    }

    // Parse the user data from the cookie
    const session = JSON.parse(userData);

    // Verify the session is still valid (optional: check expiry)
    if (!session.id || !session.email) {
      return null;
    }

    // Get fresh user profile data from database
    const profileQuery = await db.query({
      profiles: {
        $: {
          where: {
            userId: session.id,
          },
        },
      },
    });

    const profile = profileQuery.profiles?.[0];

    return {
      id: session.id,
      email: session.email,
      profile: profile
        ? {
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
            createdAt: profile.createdAt,
            lastLogin: profile.lastLogin,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

export async function requireAuth(): Promise<UserSession> {
  const session = await getServerSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  return session;
}
