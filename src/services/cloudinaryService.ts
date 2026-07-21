import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

export interface CloudinaryImage {
  id: string;
  url: string;
  name: string;
  createdAt: string;
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
  snapshot.forEach((doc) => {
    images.push(doc.data() as CloudinaryImage);
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

export const cloudinaryService = {
  getImages(): CloudinaryImage[] {
    // If cache is empty and first-time rendering, use default seeded images
    return cloudinaryImagesCache.length > 0 ? cloudinaryImagesCache : DEFAULT_SEEDED_IMAGES;
  },

  async uploadImage(name: string, url: string): Promise<CloudinaryImage> {
    const id = 'img-' + Math.random().toString(36).substring(2, 11);
    const newImage: CloudinaryImage = {
      id,
      name,
      url,
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
      console.error('Failed to upload image to mock library:', err);
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
