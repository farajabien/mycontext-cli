import * as fs from "fs-extra";
import * as path from "path";


/**
 * Utility functions for handling images with Gemini Vision
 */
export class VisionUtils {
  /**
   * Encode image to Base64 with proper MIME type for Gemini API
   */
  static async encodeImage(imagePath: string): Promise<{
    inlineData: {
      mimeType: string;
      data: string;
    };
  }> {
    try {
      if (!await fs.pathExists(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }

      const ext = path.extname(imagePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".heic": "image/heic",
        ".heif": "image/heif"
      };

      const mimeType = mimeMap[ext];
      if (!mimeType) {
        throw new Error(`Unsupported image type: ${ext}. Supported: png, jpg, webp, heic`);
      }

      const buffer = await fs.readFile(imagePath);
      const base64Data = buffer.toString("base64");

      return {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to encode image: ${error.message}`);
    }
  }

  /**
   * Validate if file is a supported image
   */
  static isSupportedImage(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"].includes(ext);
  }
}
