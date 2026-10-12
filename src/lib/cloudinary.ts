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
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dylkywbo0',
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'unsigned_pfp_upload',
};

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

/**
 * Upload any file (Image, PDF, Document) directly to Cloudinary
 */
export async function uploadFileToCloudinary(
  file: File,
  folder = 'library/books',
  onProgress?: UploadProgressCallback
): Promise<string> {
  const localCloud = typeof window !== 'undefined' ? localStorage.getItem('cloudinary_cloud_name') : null;
  const cloudName = (localCloud && localCloud.trim()) ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    CLOUDINARY_CONFIG.cloudName ||
    'dylkywbo0';

  const localPreset = typeof window !== 'undefined' ? localStorage.getItem('cloudinary_upload_preset') : null;
  const uploadPreset = (localPreset && localPreset.trim()) ||
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    CLOUDINARY_CONFIG.uploadPreset ||
    'unsigned_pfp_upload';

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const endpoint = isPdf 
    ? `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
    : `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

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
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData?.error?.message || `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Cloudinary upload failed: ${xhr.statusText || xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
    xhr.send(formData);
  });
}

/**
 * Upload multiple page images sequentially or in batches
 */
export async function uploadMultiplePagesToCloudinary(
  files: File[],
  folder = 'library/pages',
  onProgress?: (completedCount: number, totalCount: number, percent: number) => void
): Promise<string[]> {
  const urls: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const url = await uploadFileToCloudinary(file, folder);
    urls.push(url);
    if (onProgress) {
      const percent = Math.round(((i + 1) / total) * 100);
      onProgress(i + 1, total, percent);
    }
  }

  return urls;
}

/**
 * Upload an image file directly to Cloudinary using unsigned upload preset
 */
export async function uploadImageToCloudinary(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  return uploadFileToCloudinary(file, 'library/covers', onProgress);
}
