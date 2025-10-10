---
id: instantdb-integration
title: InstantDB Integration
description: Complete InstantDB setup with real-time database, authentication, and React integration
category: database
tags: ["instantdb", "realtime", "auth", "react", "nextjs"]
author: MyContext
version: 2.0.0
createdAt: 2025-10-09T10:00:00.000Z
updatedAt: 2025-10-10T23:30:00.000Z
difficulty: beginner
estimatedTime: "5 minutes (automatic) or 2-3 hours (manual)"
prerequisites: ["Node.js 18+"]
relatedPlaybooks: ["nextjs-auth", "react-forms", "state-management"]
---

# InstantDB Integration Guide

> ⚡ **Quick Start:** MyContext CLI now handles this automatically! Run:
> ```bash
> mycontext init my-app --framework instantdb
> ```
> This guide is for manual setup or understanding what MyContext does under the hood.

Complete setup for InstantDB real-time database with authentication, schema management, and React integration for Next.js applications.

## Overview

InstantDB provides a real-time database with built-in authentication, making it perfect for modern web applications. This guide covers:

- Database schema design and management
- Magic code authentication flow
- Real-time data synchronization
- React hooks and components
- CRUD operations with TypeScript
- File storage integration

## Prerequisites

- Next.js 13+ project with App Router
- MyContext context files (PRD, types, brand)
- Node.js 18 or higher
- InstantDB account (free tier available)

## Step 1: Installation and Setup

### Install Dependencies

```bash
# Install InstantDB packages
pnpm add @instantdb/react @instantdb/admin

# Install additional UI dependencies
pnpm add sonner  # for toast notifications
```

### Environment Configuration

Create `.env.local`:

```env
NEXT_PUBLIC_INSTANT_APP_ID=your_app_id_here
```

## Step 2: Schema Design

### Create Schema File

Create `instant.schema.ts`:

```typescript
import { i } from "@instantdb/react";

const schema = i.schema({
  entities: {
    // User entities (InstantDB built-in)
    $users: i.entity({
      email: i.string().unique().indexed(),
      name: i.string(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),

    // Custom entities based on your project
    profiles: i.entity({
      userId: i.string(),
      nickname: i.string(),
      bio: i.string().optional(),
      avatar: i.string().optional(),
      preferences: i.json().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),

    posts: i.entity({
      title: i.string(),
      content: i.string(),
      authorId: i.string(),
      published: i.boolean(),
      tags: i.json().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),

    comments: i.entity({
      postId: i.string(),
      authorId: i.string(),
      content: i.string(),
      parentId: i.string().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
  },

  links: {
    // User to profile relationship
    userProfile: {
      forward: { on: "profiles", has: "one", label: "user" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },

    // Post to author relationship
    postAuthor: {
      forward: { on: "posts", has: "one", label: "author" },
      reverse: { on: "$users", has: "many", label: "posts" },
    },

    // Post to comments relationship
    postComments: {
      forward: { on: "comments", has: "many", label: "post" },
      reverse: { on: "posts", has: "many", label: "comments" },
    },

    // Comment to author relationship
    commentAuthor: {
      forward: { on: "comments", has: "one", label: "author" },
      reverse: { on: "$users", has: "many", label: "comments" },
    },
  },
});

export default schema;
```

## Step 3: Database Client Setup

### Create Database Client

Create `lib/instantdb.ts`:

```typescript
import { init, id } from "@instantdb/react";
import schema from "../instant.schema";

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID || "__APP_ID__",
  schema,
});

export { db, id };

// Auth utilities
export const authUtils = {
  async sendMagicCode(email: string) {
    try {
      await db.auth.sendMagicCode({ email });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async signInWithMagicCode(email: string, code: string) {
    try {
      await db.auth.signInWithMagicCode({ email, code });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async signOut() {
    try {
      await db.auth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

// Generic CRUD operations
export const dbUtils = {
  async create(collection: string, data: any) {
    try {
      await db.transact([
        db.tx[collection][id()].create({
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async update(collection: string, id: string, data: any) {
    try {
      await db.transact([
        db.tx[collection][id].update({
          ...data,
          updatedAt: Date.now(),
        }),
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async delete(collection: string, id: string) {
    try {
      await db.transact([db.tx[collection][id].delete()]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

// Real-time hooks
export const useRealtimeQuery = (query: any) => {
  return db.useQuery(query);
};

export const useUser = () => {
  return db.useUser();
};
```

## Step 4: Authentication Components

### Magic Code Login Form

Create `components/auth/LoginForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authUtils } from "@/lib/instantdb";
import { toast } from "sonner";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const result = await authUtils.sendMagicCode(email);
    setLoading(false);

    if (result.success) {
      setStep("code");
      toast.success("Magic code sent to your email!");
    } else {
      toast.error(result.error || "Failed to send code");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    const result = await authUtils.signInWithMagicCode(email, code);
    setLoading(false);

    if (result.success) {
      toast.success("Successfully signed in!");
      onSuccess?.();
    } else {
      toast.error(result.error || "Invalid code");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          {step === "email"
            ? "Enter your email to receive a magic code"
            : "Enter the code sent to your email"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Magic Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter magic code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("email")}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
```

### User Dashboard

Create `components/auth/UserDashboard.tsx`:

```typescript
"use client";

import { db } from "@/lib/instantdb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authUtils } from "@/lib/instantdb";
import { toast } from "sonner";

export function UserDashboard() {
  const user = db.useUser();

  const handleSignOut = async () => {
    const result = await authUtils.signOut();
    if (result.success) {
      toast.success("Signed out successfully");
    } else {
      toast.error(result.error || "Failed to sign out");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome, {user.email}!</CardTitle>
        <CardDescription>Your account dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Email:</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">User ID:</p>
          <p className="font-mono text-xs">{user.id}</p>
        </div>
        <Button onClick={handleSignOut} variant="outline" className="w-full">
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Auth Provider

Create `components/auth/AuthProvider.tsx`:

```typescript
"use client";

import { db } from "@/lib/instantdb";
import { LoginForm } from "./LoginForm";
import { UserDashboard } from "./UserDashboard";

export function AuthProvider() {
  return (
    <db.SignedIn>
      <UserDashboard />
    </db.SignedIn>
  );
}

export function AuthForm() {
  return (
    <db.SignedOut>
      <LoginForm />
    </db.SignedOut>
  );
}
```

## Step 5: Real-time Data Components

### Posts List with Real-time Updates

Create `components/posts/PostsList.tsx`:

```typescript
"use client";

import { useRealtimeQuery, dbUtils } from "@/lib/instantdb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function PostsList() {
  const { data, isLoading, error } = useRealtimeQuery({
    posts: {
      author: {},
    },
  });

  const handleDeletePost = async (postId: string) => {
    const result = await dbUtils.delete("posts", postId);
    if (result.success) {
      toast.success("Post deleted");
    } else {
      toast.error("Failed to delete post");
    }
  };

  if (isLoading) return <div>Loading posts...</div>;
  if (error) return <div>Error loading posts: {error.message}</div>;

  const posts = data?.posts || [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Posts</h2>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet</p>
      ) : (
        posts.map((post: any) => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>
                By {post.author?.email || "Unknown"} •{" "}
                {new Date(post.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{post.content}</p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePost(post.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
```

### Create Post Form

Create `components/posts/CreatePostForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useUser, dbUtils } from "@/lib/instantdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function CreatePostForm() {
  const user = useUser();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !content) return;

    setLoading(true);
    const result = await dbUtils.create("posts", {
      title,
      content,
      authorId: user.id,
      published: true,
    });
    setLoading(false);

    if (result.success) {
      toast.success("Post created successfully!");
      setTitle("");
      setContent("");
    } else {
      toast.error("Failed to create post");
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Please sign in to create posts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
        <CardDescription>
          Share your thoughts with the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

## Step 6: File Storage Integration

### File Upload Component

Create `components/storage/FileUpload.tsx`:

```typescript
"use client";

import { useState } from "react";
import { db } from "@/lib/instantdb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const result = await db.storage.uploadFile(file.name, file);
      if (result.data) {
        toast.success("File uploaded successfully!");
        console.log("File ID:", result.data.id);
        // You can now link this file to other entities
      }
    } catch (error) {
      toast.error("Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Upload</CardTitle>
        <CardDescription>Upload files to InstantDB storage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <div className="text-sm text-muted-foreground">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Step 7: App Integration

### Main App Layout

Update your main page to include authentication and database features:

```typescript
// app/page.tsx
import { AuthProvider, AuthForm } from "@/components/auth/AuthProvider";
import { PostsList } from "@/components/posts/PostsList";
import { CreatePostForm } from "@/components/posts/CreatePostForm";
import { FileUpload } from "@/components/storage/FileUpload";

export default function HomePage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-4xl font-bold text-center">My App with InstantDB</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <AuthProvider />
          <AuthForm />
        </div>

        <div className="space-y-6">
          <CreatePostForm />
          <FileUpload />
        </div>
      </div>

      <PostsList />
    </div>
  );
}
```

## Step 8: Deployment and Configuration

### Push Schema to InstantDB

```bash
# Install InstantDB CLI
npm install -g instant-cli

# Push your schema
instant-cli push

# Or push just the schema
instant-cli push schema
```

### Environment Variables for Production

```env
# .env.production
NEXT_PUBLIC_INSTANT_APP_ID=your_production_app_id
```

## Best Practices

### 1. Error Handling

Always wrap database operations in try-catch blocks and provide user feedback:

```typescript
const handleCreatePost = async (data: PostData) => {
  try {
    const result = await dbUtils.create("posts", data);
    if (result.success) {
      toast.success("Post created!");
    } else {
      toast.error(result.error || "Failed to create post");
    }
  } catch (error) {
    toast.error("An unexpected error occurred");
    console.error("Error:", error);
  }
};
```

### 2. Optimistic Updates

For better UX, update the UI immediately and rollback on error:

```typescript
const handleToggleLike = async (postId: string) => {
  // Optimistic update
  setLiked(!liked);

  try {
    await dbUtils.update("posts", postId, { liked: !liked });
  } catch (error) {
    // Rollback on error
    setLiked(liked);
    toast.error("Failed to update like");
  }
};
```

### 3. Real-time Subscriptions

Use specific queries to avoid unnecessary re-renders:

```typescript
// Good: Specific query
const { data } = useRealtimeQuery({
  posts: {
    $: { where: { published: true } },
    author: {},
  },
});

// Avoid: Overly broad queries
const { data } = useRealtimeQuery({ posts: {} });
```

## Troubleshooting

### Common Issues

1. **Schema not syncing**: Run `instant-cli push` to sync your schema
2. **Authentication not working**: Check your APP_ID in environment variables
3. **Real-time updates not working**: Ensure you're using `useRealtimeQuery` for live data
4. **Type errors**: Make sure your schema types match your TypeScript interfaces

### Debug Mode

Enable debug mode for development:

```typescript
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
  schema,
  devtool: true, // Enable InstantDB devtools
  verbose: true, // Enable verbose logging
});
```

## Next Steps

1. **Set up permissions**: Configure `instant.perms.ts` for data access control
2. **Add more entities**: Extend your schema based on your app's needs
3. **Implement caching**: Use React Query or SWR for additional caching layers
4. **Add real-time features**: Implement presence, cursors, and live collaboration
5. **Optimize performance**: Use pagination and selective queries for large datasets

## Resources

- [InstantDB Documentation](https://instantdb.com/docs)
- [Magic Code Authentication](https://instantdb.com/docs/auth/magic-codes)
- [Real-time Queries](https://instantdb.com/docs/reading-data)
- [File Storage](https://instantdb.com/docs/storage)
- [InstantDB CLI](https://instantdb.com/docs/instant-cli)
