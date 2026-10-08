/**
 * Cloudinary Media Integration Helper
 * 
 * Supports Direct Unsigned Client-side Uploads, Custom Presets, and URL Optimizations.
 */

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

export const CLOUDINARY_CONFIG: CloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'CLOUDINARY_NAME_PLACEHOLDER',
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'CLOUDINARY_PRESET_PLACEHOLDER',
};

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

/**
 * Upload an image file directly to Cloudinary using unsigned upload preset
 */
export async function uploadImageToCloudinary(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || CLOUDINARY_CONFIG.cloudName;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_CONFIG.uploadPreset;

  // If credentials are still placeholders, return a simulated data URL or local object URL so the user can test the UI smoothly
  if (cloudName.includes('PLACEHOLDER') || uploadPreset.includes('PLACEHOLDER')) {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        if (onProgress) onProgress(Math.min(progress, 100));
        if (progress >= 100) {
          clearInterval(interval);
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }, 150);
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'courses/thumbnails');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url || response.url);
        } catch {
          reject(new Error('Invalid response from Cloudinary'));
        }
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.statusText || xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
    xhr.send(formData);
  });
}
