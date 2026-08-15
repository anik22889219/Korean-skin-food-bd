import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface CloudinaryImage {
  id: string;
  url: string;
  name: string;
  createdAt: string;
  type?: 'image' | 'video';
  publicId?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  resourceType: 'video' | 'image';
  format: string;
  bytes: number;
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fps?: number;
  createdAt?: string;
  originalFilename?: string;
  videoMetadata?: {
    format?: string;
    bytes?: number;
    duration?: number;
    width?: number;
    height?: number;
    aspectRatio?: string;
    fps?: number;
    audio?: any;
    video?: any;
    [key: string]: any;
  };
}

const DEFAULT_SEEDED_IMAGES: CloudinaryImage[] = [
  {
    id: 'img-seed-1',
    url: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60',
    name: 'COSRX Snail 96 Mucin Power Essence',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'img-seed-2',
    url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
    name: 'Beauty of Joseon Sunscreen Rice',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'img-seed-3',
    url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=60',
    name: 'COSRX Low pH Good Morning Gel Cleanser',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'img-seed-4',
    url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
    name: 'Anua Heartleaf 77% Soothing Toner',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'img-seed-5',
    url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=60',
    name: 'Skin1004 Madagascar Centella Ampoule',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'img-seed-6',
    url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
    name: 'Laneige Lip Sleeping Mask Berry',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'img-seed-7',
    url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=60',
    name: 'K-Beauty Serum Bottle Elegance',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'img-seed-8',
    url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&auto=format&fit=crop&q=60',
    name: 'Moisturizing Cream Jar',
    createdAt: new Date().toISOString()
  }
];

let cloudinaryImagesCache: CloudinaryImage[] = [];

// Real-time snapshot of the Cloudinary Media Library from Firestore
onSnapshot(collection(db, 'cloudinary_images'), (snapshot) => {
  const images: CloudinaryImage[] = [];
  snapshot.forEach((docSnap) => {
    images.push(docSnap.data() as CloudinaryImage);
  });
  
  if (images.length === 0) {
    // If empty, seed Firestore with the default K-Beauty images
    DEFAULT_SEEDED_IMAGES.forEach((img) => {
      setDoc(doc(db, 'cloudinary_images', img.id), img).catch(console.error);
    });
    cloudinaryImagesCache = [...DEFAULT_SEEDED_IMAGES];
  } else {
    // Sort cached images newest first
    cloudinaryImagesCache = images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}, (err) => {
  console.warn('[Firebase] cloudinary_images snapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
    handleFirestoreError(err, OperationType.GET, 'cloudinary_images', false);
  }
});

/**
 * Real direct upload of video or image file to Cloudinary with progress monitoring
 */
export async function uploadFileToCloudinary(
  file: File,
  options: {
    resourceType?: 'video' | 'image' | 'auto';
    folder?: string;
    onProgress?: (percent: number) => void;
    tags?: string;
  } = {}
): Promise<CloudinaryUploadResult> {
  const resourceType = options.resourceType === 'auto'
    ? (file.type.startsWith('video/') ? 'video' : 'image')
    : (options.resourceType || (file.type.startsWith('video/') ? 'video' : 'image'));
  const folder = options.folder || (resourceType === 'video' ? 'kbeauty_creators' : 'kbeauty_products');

  // Step 1: Request signature / config from server API
  let signData: any = null;
  try {
    const signRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder,
        resourceType,
        tags: options.tags,
      }),
    });
    if (signRes.ok) {
      signData = await signRes.json();
    }
  } catch (err) {
    console.warn('[Cloudinary] Could not fetch signature from server:', err);
  }

  // Check localStorage overrides if configured in UI
  const localCloudName = typeof localStorage !== 'undefined' ? localStorage.getItem('cloudinary_cloud_name')?.trim() : '';
  const localPreset = typeof localStorage !== 'undefined' ? localStorage.getItem('cloudinary_upload_preset')?.trim() : '';

  const cloudName = signData?.cloudName || localCloudName || 'dxvmfaxeh';
  const uploadPreset = signData?.uploadPreset || localPreset || 'ml_default';

  // Step 2: Build FormData with actual File (NEVER Base64 Data URL)
  const formData = new FormData();
  formData.append('file', file);

  if (signData?.mode === 'signed' && signData.signature && signData.apiKey) {
    // Signed upload: uses secure signature generated server-side
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', String(signData.timestamp));
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder || folder);
    if (options.tags) formData.append('tags', options.tags);
  } else {
    // Unsigned preset upload
    formData.append('upload_preset', uploadPreset);
    if (folder) formData.append('folder', folder);
  }

  const endpointUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  // Step 3: Perform upload with XHR for accurate progress monitoring
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpointUrl, true);

    if (options.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          options.onProgress?.(percentComplete);
        }
      };
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const result: CloudinaryUploadResult = {
            publicId: res.public_id || '',
            secureUrl: res.secure_url || res.url,
            url: res.url || res.secure_url,
            resourceType: res.resource_type || resourceType,
            format: res.format || '',
            bytes: res.bytes || file.size,
            duration: res.duration !== undefined ? Number(res.duration) : undefined,
            width: res.width !== undefined ? Number(res.width) : undefined,
            height: res.height !== undefined ? Number(res.height) : undefined,
            aspectRatio: res.aspect_ratio ? String(res.aspect_ratio) : (res.width && res.height ? `${res.width}:${res.height}` : undefined),
            fps: res.frame_rate ? Number(res.frame_rate) : undefined,
            createdAt: res.created_at || new Date().toISOString(),
            originalFilename: res.original_filename || file.name,
            videoMetadata: {
              format: res.format,
              bytes: res.bytes,
              duration: res.duration,
              width: res.width,
              height: res.height,
              aspectRatio: res.aspect_ratio,
              fps: res.frame_rate,
              audio: res.audio,
              video: res.video,
            },
          };
          resolve(result);
        } catch (parseErr: any) {
          reject(new Error('Failed to parse Cloudinary response: ' + parseErr.message));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          const msg = errRes.error?.message || `Cloudinary upload failed with status ${xhr.status}`;
          reject(new Error(msg));
        } catch {
          reject(new Error(`Cloudinary upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during video upload to Cloudinary. Please verify internet connection and Cloudinary settings.'));
    };

    xhr.send(formData);
  });
}

export const cloudinaryService = {
  getImages(): CloudinaryImage[] {
    // If cache is empty and first-time rendering, use default seeded images
    return cloudinaryImagesCache.length > 0 ? cloudinaryImagesCache : DEFAULT_SEEDED_IMAGES;
  },

  async uploadImage(name: string, url: string, type: 'image' | 'video' = 'image'): Promise<CloudinaryImage> {
    const id = 'img-' + Math.random().toString(36).substring(2, 11);
    const newImage: CloudinaryImage = {
      id,
      name,
      url,
      type,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'cloudinary_images', id), newImage);
      // Synchronously insert into local cache first to prevent lag
      if (!cloudinaryImagesCache.some(img => img.id === id)) {
        cloudinaryImagesCache = [newImage, ...cloudinaryImagesCache];
      }
      return newImage;
    } catch (err) {
      console.error('Failed to upload image to media library:', err);
      handleFirestoreError(err, OperationType.WRITE, 'cloudinary_images');
      throw err;
    }
  },

  async deleteImage(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'cloudinary_images', id));
      cloudinaryImagesCache = cloudinaryImagesCache.filter(img => img.id !== id);
    } catch (err) {
      console.error('Failed to delete image from library:', err);
      handleFirestoreError(err, OperationType.DELETE, 'cloudinary_images');
      throw err;
    }
  }
};

