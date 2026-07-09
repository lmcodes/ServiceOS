import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  AuthError,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

const googleProvider = new GoogleAuthProvider();

/**
 * Map Firebase AuthError codes to user-friendly Thai messages
 */
function mapAuthError(error: unknown): string {
  const code = (error as AuthError)?.code ?? '';
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'auth/email-already-in-use':
      return 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบแทน';
    case 'auth/weak-password':
      return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    case 'auth/invalid-email':
      return 'รูปแบบอีเมลไม่ถูกต้อง';
    case 'auth/too-many-requests':
      return 'ลองใหม่ภายหลัง บัญชีถูกล็อคชั่วคราว';
    case 'auth/popup-closed-by-user':
      return 'ยกเลิกการเข้าสู่ระบบด้วย Google';
    case 'auth/network-request-failed':
      return 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต';
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    case 'auth/invalid-api-key':
      return 'การตั้งค่า Firebase ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ';
    default:
      console.error('[AuthError]', error);
      return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  }
}

/**
 * Write the initial tenant document to Firestore after signup.
 * This is fire-and-forget — we do NOT block the auth flow on this.
 * Firestore rules: allow create if isAuth() (new user is now authenticated).
 */
function createInitialTenantDoc(uid: string, email: string, displayName: string): void {
  // Non-blocking: we fire the write but don't await it in the signup flow
  setDoc(doc(db, 'tenants', uid), {
    name: displayName || '',
    slug: '',
    businessType: null,
    ownerId: uid,
    email,
    status: 'pending_onboarding',
    settings: {
      timezone: 'Asia/Bangkok',
      locale: 'th',
      currency: 'THB',
      dateFormat: 'DD/MM/YYYY',
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch((err) => {
    // Log but don't surface to user — the Cloud Function TS-02 will also handle this
    console.warn('[Tenant Doc] Could not write initial tenant doc. Will retry on login.', err);
  });
}

// ─── Auth Actions ──────────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: import('firebase/auth').User | null; error: string | null }> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (err) {
    return { user: null, error: mapAuthError(err) };
  }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ user: import('firebase/auth').User | null; error: string | null }> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Update display name (best-effort, non-blocking on failure)
    await updateProfile(result.user, { displayName: name }).catch(() => {});
    // Fire-and-forget: write tenant doc (non-blocking)
    createInitialTenantDoc(result.user.uid, email, name);
    return { user: result.user, error: null };
  } catch (err) {
    return { user: null, error: mapAuthError(err) };
  }
}

export async function signInWithGoogle(): Promise<{
  user: import('firebase/auth').User | null;
  isNewUser: boolean;
  error: string | null;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const isNewUser =
      result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    if (isNewUser) {
      createInitialTenantDoc(
        result.user.uid,
        result.user.email ?? '',
        result.user.displayName ?? ''
      );
    }
    return { user: result.user, isNewUser, error: null };
  } catch (err) {
    return { user: null, isNewUser: false, error: mapAuthError(err) };
  }
}

export async function sendPasswordReset(
  email: string
): Promise<{ error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (err) {
    return { error: mapAuthError(err) };
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}
