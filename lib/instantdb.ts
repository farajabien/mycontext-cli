// MyClarity InstantDB Client
// Docs: https://www.instantdb.com/docs

import { init } from "@instantdb/react";
import schema from "../src/instant.schema";

// Initialize InstantDB client
export const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  schema,
});

// Export types for use in components
export type { AppSchema } from "../src/instant.schema";

// Simple helper functions following InstantDB patterns
export const instantdbHelpers = {
  // Create a component
  async createComponent(
    name: string,
    code: string,
    userId: string,
    metadata?: Record<string, unknown>
  ) {
    const componentId = `component_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    return await db.transact([
      db.tx.components[componentId].update({
        name,
        code,
        userId,
        metadata: metadata || {},
        createdAt: new Date(),
        isPublic: false,
      }),
    ]);
  },

  // Update a component
  async updateComponent(componentId: string, updates: Record<string, unknown>) {
    return await db.transact([
      db.tx.components[componentId].update({
        ...updates,
        updatedAt: new Date(),
      }),
    ]);
  },

  // Delete a component
  async deleteComponent(componentId: string) {
    return await db.transact([db.tx.components[componentId].delete()]);
  },

  // Create a collection
  async createCollection(name: string, userId: string, description?: string) {
    const collectionId = `collection_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    return await db.transact([
      db.tx.collections[collectionId].update({
        name,
        description: description || "",
        userId,
        createdAt: new Date(),
        isPublic: false,
      }),
    ]);
  },

  // Update a collection
  async updateCollection(
    collectionId: string,
    updates: Record<string, unknown>
  ) {
    return await db.transact([
      db.tx.collections[collectionId].update({
        ...updates,
        updatedAt: new Date(),
      }),
    ]);
  },

  // Delete a collection
  async deleteCollection(collectionId: string) {
    return await db.transact([db.tx.collections[collectionId].delete()]);
  },
};

// Query helpers for common data fetching patterns
export const instantdbQueries = {
  // Get all components
  getAllComponents: () => ({
    components: {},
  }),

  // Get all collections
  getAllCollections: () => ({
    collections: {},
  }),

  // Get components with collections
  getComponentsWithCollections: () => ({
    components: {
      collection: {},
    },
  }),

  // Get user's components
  getUserComponents: (userId: string) => ({
    components: {
      $: {
        where: {
          userId,
        },
      },
    },
  }),
};
