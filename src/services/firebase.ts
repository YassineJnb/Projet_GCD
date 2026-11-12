import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ThesisTopic,
  CandidateApplication,
  ReInscriptionRecord,
  UserProfile,
} from '../types';
import {
  INITIAL_THESES,
  INITIAL_APPLICATIONS,
  INITIAL_REINSCIPTIONS,
  USERS,
} from '../data/seedData';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Configure Google OAuth provider with standard scopes (never blocked by Google)
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Separate provider for optional Gmail sending privileges
export const gmailSendProvider = new GoogleAuthProvider();
gmailSendProvider.addScope('email');
gmailSendProvider.addScope('profile');
gmailSendProvider.addScope('https://www.googleapis.com/auth/gmail.send');
gmailSendProvider.setCustomParameters({ prompt: 'select_account consent' });

// In-memory cache for uploaded files so previews open instantaneously
const fileBlobMemoryCache = new Map<string, string>();

// Helper to recursively remove undefined keys (Firestore rejects undefined values)
export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        result[k] = sanitizeForFirestore(v);
      }
    }
    return result as T;
  }
  return value;
}

// Strip oversized inline data URLs from CandidateApplication before saving to Firestore
function sanitizeApplicationDocsForFirestore(
  documents: CandidateApplication['documents']
): CandidateApplication['documents'] {
  const cleaned: Record<string, unknown> = {};
  for (const [key, docItem] of Object.entries(documents)) {
    if (!docItem) continue;
    const copy = { ...docItem };
    // Store data in uploadedFiles collection via fileId; keep applications doc compact
    if (copy.fileId || (copy.fileData && copy.fileData.length > 50000)) {
      delete copy.fileData;
      if (copy.url && copy.url.startsWith('data:')) {
        delete copy.url;
      }
    }
    cleaned[key] = sanitizeForFirestore(copy);
  }
  return cleaned as unknown as CandidateApplication['documents'];
}

// Save uploaded file (PDF / Image) into chunked Firestore documents to avoid 1MB limit
export async function saveUploadedFileToDb(
  fileId: string,
  dataUrl: string,
  meta: { name: string; type: string; size: string }
): Promise<number> {
  fileBlobMemoryCache.set(fileId, dataUrl);
  const CHUNK_SIZE = 450000; // ~450KB per Firestore doc, safely under 1MB
  const chunkCount = Math.max(1, Math.ceil(dataUrl.length / CHUNK_SIZE));

  try {
    await setDoc(doc(db, 'uploadedFiles', fileId), {
      id: fileId,
      name: meta.name,
      type: meta.type || 'application/pdf',
      size: meta.size,
      chunkCount,
      createdAt: new Date().toISOString(),
    });

    const chunkPromises: Promise<void>[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const slice = dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      chunkPromises.push(
        setDoc(doc(db, 'uploadedFiles', `${fileId}_chunk_${i}`), {
          fileId,
          index: i,
          data: slice,
        })
      );
    }
    await Promise.all(chunkPromises);
    return chunkCount;
  } catch (err) {
    console.warn('Erreur sauvegarde fichier chunked dans Firestore:', err);
    return chunkCount;
  }
}

export function getCachedUploadedFile(fileId?: string): string | null {
  if (!fileId) return null;
  return fileBlobMemoryCache.get(fileId) || null;
}

export async function loadUploadedFileFromDb(fileId: string): Promise<string | null> {
  const cached = fileBlobMemoryCache.get(fileId);
  if (cached) return cached;

  try {
    const manifestSnap = await getDoc(doc(db, 'uploadedFiles', fileId));
    if (!manifestSnap.exists()) return null;

    const manifest = manifestSnap.data() as { chunkCount?: number; data?: string };
    if (manifest.data) {
      fileBlobMemoryCache.set(fileId, manifest.data);
      return manifest.data;
    }

    const count = manifest.chunkCount || 1;
    const chunkSnaps = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        getDoc(doc(db, 'uploadedFiles', `${fileId}_chunk_${i}`))
      )
    );

    const parts: string[] = [];
    for (const snap of chunkSnaps) {
      if (snap.exists()) {
        const d = snap.data() as { data?: string };
        if (d.data) parts.push(d.data);
      }
    }

    if (parts.length === 0) return null;
    const joined = parts.join('');
    fileBlobMemoryCache.set(fileId, joined);
    return joined;
  } catch (err) {
    console.warn('Impossible de charger le fichier depuis Firestore:', err);
    return null;
  }
}

// Standard error handling conforming to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
    }
  }
}
testConnection();

// Initial database seeding
export async function seedDatabaseIfEmpty() {
  try {
    const thesesSnap = await getDocs(collection(db, 'theses'));
    if (thesesSnap.empty) {
      console.log('Seeding initial theses into Firestore...');
      for (const th of INITIAL_THESES) {
        await setDoc(doc(db, 'theses', th.id), sanitizeForFirestore(th));
      }
    }

    const appsSnap = await getDocs(collection(db, 'applications'));
    if (appsSnap.empty) {
      console.log('Seeding initial applications into Firestore...');
      for (const appItem of INITIAL_APPLICATIONS) {
        await setDoc(doc(db, 'applications', appItem.id), sanitizeForFirestore(appItem));
      }
    }

    const reSnap = await getDocs(collection(db, 'reInscriptions'));
    if (reSnap.empty) {
      console.log('Seeding initial reInscriptions into Firestore...');
      for (const record of INITIAL_REINSCIPTIONS) {
        await setDoc(doc(db, 'reInscriptions', record.id), sanitizeForFirestore(record));
      }
    }

    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      console.log('Seeding initial users into Firestore...');
      for (const user of USERS) {
        await setDoc(doc(db, 'users', user.id), sanitizeForFirestore(user));
      }
    }
  } catch (error) {
    console.warn('Database seed skipped or already initialized:', error);
  }
}

// Firestore operations for Theses
export async function saveThesisToDb(thesis: ThesisTopic): Promise<void> {
  const path = `theses/${thesis.id}`;
  try {
    await setDoc(doc(db, 'theses', thesis.id), sanitizeForFirestore(thesis));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Firestore operations for Applications
export async function saveApplicationToDb(appData: CandidateApplication): Promise<void> {
  const path = `applications/${appData.id}`;
  try {
    const safeApp: CandidateApplication = sanitizeForFirestore({
      ...appData,
      documents: sanitizeApplicationDocsForFirestore(appData.documents),
    });
    await setDoc(doc(db, 'applications', appData.id), safeApp);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateApplicationInDb(
  appId: string,
  updates: Partial<CandidateApplication>
): Promise<void> {
  const path = `applications/${appId}`;
  try {
    const prepared = { ...updates };
    if (prepared.documents) {
      prepared.documents = sanitizeApplicationDocsForFirestore(prepared.documents);
    }
    await updateDoc(doc(db, 'applications', appId), sanitizeForFirestore(prepared));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Firestore operations for Users
export async function saveUserToDb(user: UserProfile): Promise<void> {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), sanitizeForFirestore(user));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Firestore operations for Re-inscriptions
export async function saveReInscriptionToDb(record: ReInscriptionRecord): Promise<void> {
  const path = `reInscriptions/${record.id}`;
  try {
    await setDoc(doc(db, 'reInscriptions', record.id), sanitizeForFirestore(record));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
