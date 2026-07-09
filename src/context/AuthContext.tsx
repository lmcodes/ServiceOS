import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
  tenantId: string | null;
  branchIds: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClaims = async (currentUser: User): Promise<AuthUser> => {
    const tokenResult = await currentUser.getIdTokenResult(true);
    const claims = tokenResult.claims;
    
    let role = (claims.role as UserRole) || null;
    let tenantId = (claims.tenantId as string) || null;
    const branchIds = (claims.branchIds as string[]) || [];

    // Development Fallback: If claims are missing, check if a tenant document exists in Firestore
    if (!role || !tenantId) {
      try {
        const tenantRef = doc(db, 'tenants', currentUser.uid);
        const tenantSnap = await getDoc(tenantRef);
        if (tenantSnap.exists()) {
          const tenantData = tenantSnap.data();
          if (tenantData.status === 'active') {
            role = 'owner';
            tenantId = currentUser.uid;
          }
        }
      } catch (error) {
        console.warn('[AuthContext] Dev fallback claims fetch failed:', error);
      }
    }
    
    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      role,
      tenantId,
      branchIds,
    };
  };

  const refreshClaims = async () => {
    if (auth.currentUser) {
      setLoading(true);
      try {
        const authUser = await fetchClaims(auth.currentUser);
        setUser(authUser);
      } catch (error) {
        console.error('Failed to refresh claims:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        try {
          const authUser = await fetchClaims(currentUser);
          setUser(authUser);
        } catch (error) {
          console.error('Error fetching token claims:', error);
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: null,
            tenantId: null,
            branchIds: [],
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout, refreshClaims }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
