import { 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { MediaItem, DisplayTemplate } from '@/types/firestore';

const MEDIA_COLLECTION = 'mediaLibrary';
const TEMPLATE_COLLECTION = 'displayTemplates';

/**
 * Upload media file (Image/Video) to Firebase Storage
 */
export async function uploadMediaFile(tenantId: string, file: File): Promise<string> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const storagePath = `tenants/${tenantId}/media/${Date.now()}_${cleanFileName}`;
  const fileRef = ref(storage, storagePath);

  // Note: Simple uploadBytes. If you need progress, uploadBytesResumable can be used,
  // but uploadBytes is simple and highly reliable. We will simulate progress or upload directly.
  const uploadResult = await uploadBytes(fileRef, file);
  const downloadUrl = await getDownloadURL(uploadResult.ref);
  return downloadUrl;
}

/**
 * Subscribe to tenant media items in real-time
 */
export function subscribeMediaItems(
  tenantId: string,
  onNext: (items: MediaItem[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, MEDIA_COLLECTION),
    where('tenantId', '==', tenantId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...docSnap.data()
        } as MediaItem);
      });
      // Sort by createdAt desc locally (since we don't have composite index yet)
      items.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return timeB - timeA;
      });
      onNext(items);
    },
    (error) => {
      console.error('[subscribeMediaItems]', error);
      onError(error);
    }
  );
}

/**
 * Add a new media item to library
 */
export async function addMediaItem(
  tenantId: string,
  name: string,
  type: 'image' | 'video' | 'url',
  storageUrl: string,
  duration: number
): Promise<string> {
  const docRef = await addDoc(collection(db, MEDIA_COLLECTION), {
    tenantId,
    name,
    type,
    storageUrl,
    duration,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Delete a media item from library and Storage
 */
export async function deleteMediaItem(mediaId: string, storageUrl?: string): Promise<void> {
  // 1. Delete document from Firestore
  await deleteDoc(doc(db, MEDIA_COLLECTION, mediaId));

  // 2. Delete file from Storage if it's hosted there
  if (storageUrl && storageUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const fileRef = ref(storage, storageUrl);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Failed to delete media file from storage:', err);
    }
  }
}

/**
 * Subscribe to display templates of a branch in real-time
 */
export function subscribeDisplayTemplates(
  branchId: string,
  onNext: (templates: DisplayTemplate[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, TEMPLATE_COLLECTION),
    where('branchId', '==', branchId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const templates: DisplayTemplate[] = [];
      snapshot.forEach((docSnap) => {
        templates.push({
          id: docSnap.id,
          ...docSnap.data()
        } as DisplayTemplate);
      });
      onNext(templates);
    },
    (error) => {
      console.error('[subscribeDisplayTemplates]', error);
      onError(error);
    }
  );
}

/**
 * Subscribe to active display template of a branch
 */
export function subscribeActiveDisplayTemplate(
  branchId: string,
  onNext: (template: DisplayTemplate | null) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, TEMPLATE_COLLECTION),
    where('branchId', '==', branchId),
    where('isActive', '==', true)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onNext(null);
      } else {
        const docSnap = snapshot.docs[0];
        onNext({
          id: docSnap.id,
          ...docSnap.data()
        } as DisplayTemplate);
      }
    },
    (error) => {
      console.error('[subscribeActiveDisplayTemplate]', error);
      onError(error);
    }
  );
}

/**
 * Add a new display template
 */
export async function addDisplayTemplate(
  tenantId: string,
  branchId: string,
  template: Omit<DisplayTemplate, 'id' | 'tenantId' | 'branchId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, TEMPLATE_COLLECTION), {
    ...template,
    tenantId,
    branchId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update display template
 */
export async function updateDisplayTemplate(
  templateId: string,
  template: Partial<Omit<DisplayTemplate, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const docRef = doc(db, TEMPLATE_COLLECTION, templateId);
  await updateDoc(docRef, {
    ...template,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete display template
 */
export async function deleteDisplayTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, TEMPLATE_COLLECTION, templateId));
}

/**
 * Set a template as active and deactivate all others for this branch atomically
 */
export async function setActiveTemplate(tenantId: string, branchId: string, templateId: string | null): Promise<void> {
  const q = query(
    collection(db, TEMPLATE_COLLECTION),
    where('branchId', '==', branchId)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);

  snapshot.forEach((docSnap) => {
    const docRef = doc(db, TEMPLATE_COLLECTION, docSnap.id);
    batch.update(docRef, {
      tenantId,
      isActive: docSnap.id === templateId,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}
