import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export type UserRole = 'super_admin' | 'owner' | 'admin' | 'manager' | 'staff';

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
    let role: UserRole | null = null;
    let tenantId: string | null = null;
    let branchIds: string[] = [];

    // 1. Prioritize checking Firestore users collection for super_admin override
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.role === 'super_admin') {
          role = 'super_admin';
          tenantId = 'system';
          branchIds = userData.branchIds || [];
        } else {
          branchIds = userData.branchIds || [];
        }
      }
    } catch (error) {
      console.warn('[AuthContext] Error checking super_admin document:', error);
    }

    // 2. If not super_admin, fall back to Custom Claims on ID Token
    if (role !== 'super_admin') {
      const tokenResult = await currentUser.getIdTokenResult(true);
      const claims = tokenResult.claims;
      
      role = (claims.role as UserRole) || null;
      tenantId = (claims.tenantId as string) || null;
      if (claims.branchIds) {
        branchIds = claims.branchIds as string[];
      }

      // 3. If custom claims are missing, check if they are a tenant owner in Firestore
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
