import fs from "fs";
import path from "path";

export interface ComponentData {
  id: string;
  userId: string;
  name: string;
  code: string;
  metadata?: Record<string, unknown>;
  group?: string;
  qualityScore?: number;
  version?: string;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageResult {
  success: boolean;
  component?: ComponentData;
  error?: string;
}

export class ComponentStorageService {
  private storageDir: string;

  constructor(storageDir: string = "./components/generated") {
    this.storageDir = storageDir;
    this.ensureStorageDir();
  }

  private ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Store a component both in files (for immediate preview) and InstantDB (for persistence)
   */
  async storeComponent(
    componentData: Omit<ComponentData, "id" | "createdAt" | "updatedAt">
  ): Promise<StorageResult> {
    try {
      const id = `comp_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = new Date();

      const fullComponentData: ComponentData = {
        ...componentData,
        id,
        createdAt: now,
        updatedAt: now,
      };

      // Store in file system for immediate web preview
      await this.storeInFileSystem(fullComponentData);

      // TODO: Store in InstantDB for persistence (when API is fixed)
      // await this.storeInInstantDB(fullComponentData);

      console.log(`✅ Component stored: ${componentData.name} (ID: ${id})`);

      return {
        success: true,
        component: fullComponentData,
      };
    } catch (error: unknown) {
      console.error("❌ Component storage error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Store component in file system for immediate web preview
   */
  private async storeInFileSystem(component: ComponentData): Promise<void> {
    const groupDir = path.join(
      this.storageDir,
      this.sanitizeGroupName(component.group || "general")
    );

    // Ensure group directory exists
    if (!fs.existsSync(groupDir)) {
      fs.mkdirSync(groupDir, { recursive: true });
    }

    // Store component code
    const componentFile = path.join(groupDir, `${component.name}.tsx`);
    await fs.promises.writeFile(componentFile, component.code);

    // Store metadata
    const metadataFile = path.join(groupDir, `${component.name}.json`);
    const metadata = {
      id: component.id,
      name: component.name,
      group: component.group,
      qualityScore: component.qualityScore,
      createdAt: component.createdAt,
      updatedAt: component.updatedAt,
      version: component.version,
      isPublic: component.isPublic,
      metadata: component.metadata,
    };
    await fs.promises.writeFile(
      metadataFile,
      JSON.stringify(metadata, null, 2)
    );

    console.log(
      `✅ Component stored in file system: ${component.name} in ${groupDir}`
    );
  }

  /**
   * List components for a user, reading from file system
   */
  async listComponents(
    userId: string,
    group?: string
  ): Promise<ComponentData[]> {
    try {
      const components: ComponentData[] = [];

      // Read from file system
      if (fs.existsSync(this.storageDir)) {
        const groups = group
          ? [this.sanitizeGroupName(group)]
          : fs
              .readdirSync(this.storageDir)
              .filter((dir) =>
                fs.statSync(path.join(this.storageDir, dir)).isDirectory()
              );

        for (const groupName of groups) {
          const groupDir = path.join(this.storageDir, groupName);
          if (fs.existsSync(groupDir)) {
            const metadataFiles = fs
              .readdirSync(groupDir)
              .filter((file) => file.endsWith(".json"))
              .map((file) => path.join(groupDir, file));

            for (const metadataFile of metadataFiles) {
              try {
                const metadata = JSON.parse(
                  await fs.promises.readFile(metadataFile, "utf8")
                );
                const componentFile = metadataFile.replace(".json", ".tsx");

                if (fs.existsSync(componentFile)) {
                  const code = await fs.promises.readFile(
                    componentFile,
                    "utf8"
                  );
                  components.push({
                    ...metadata,
                    code,
                    userId, // Use the requested userId
                  });
                }
              } catch (error) {
                console.warn(
                  `⚠️ Failed to read component metadata: ${metadataFile}`,
                  error
                );
              }
            }
          }
        }
      }

      console.log(
        `✅ Found ${components.length} components for user ${userId}`
      );
      return components;
    } catch (error: unknown) {
      console.error("❌ Component listing error:", error);
      return [];
    }
  }

  /**
   * Get a specific component by ID
   */
  async getComponent(componentId: string): Promise<ComponentData | null> {
    try {
      // Search through all groups for the component
      if (fs.existsSync(this.storageDir)) {
        const groups = fs
          .readdirSync(this.storageDir)
          .filter((dir) =>
            fs.statSync(path.join(this.storageDir, dir)).isDirectory()
          );

        for (const groupName of groups) {
          const groupDir = path.join(this.storageDir, groupName);
          const metadataFiles = fs
            .readdirSync(groupDir)
            .filter((file) => file.endsWith(".json"))
            .map((file) => path.join(groupDir, file));

          for (const metadataFile of metadataFiles) {
            try {
              const metadata = JSON.parse(
                await fs.promises.readFile(metadataFile, "utf8")
              );

              if (metadata.id === componentId) {
                const componentFile = metadataFile.replace(".json", ".tsx");
                if (fs.existsSync(componentFile)) {
                  const code = await fs.promises.readFile(
                    componentFile,
                    "utf8"
                  );
                  return {
                    ...metadata,
                    code,
                  };
                }
              }
            } catch (error) {
              console.warn(
                `⚠️ Failed to read component: ${metadataFile}`,
                error
              );
            }
          }
        }
      }

      return null;
    } catch (error: unknown) {
      console.error("❌ Component retrieval error:", error);
      return null;
    }
  }

  /**
   * Sanitize group name for file system compatibility
   */
  private sanitizeGroupName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with dash
      .replace(/\s*&\s*/g, "-") // Replace spaces and & with dash
      .replace(/[^a-z0-9-]/g, "") // Remove all non-alphanumeric/dash
      .replace(/-+/g, "-") // Collapse multiple dashes
      .replace(/^-+|-+$/g, ""); // Trim leading/trailing dashes
  }

  /**
   * TODO: Implement InstantDB storage when API issues are resolved
   */
  private async storeInInstantDB(component: ComponentData): Promise<void> {
    // TODO: Implement InstantDB storage
    // This will be implemented once InstantDB API issues are resolved
    console.log(`📝 TODO: Store component ${component.name} in InstantDB`);
  }
}

// Export singleton instance
export const componentStorage = new ComponentStorageService();
