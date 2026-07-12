import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { Tenant, Subscription } from '@/types/firestore';

interface TenantContextType {
  tenant: Tenant | null;
  subscription: Subscription | null;
  loading: boolean;
  error: Error | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only fetch details if we have an active tenantId associated with the user
    if (!user || !user.tenantId) {
      setTenant(null);
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, 'tenants', user.tenantId);
    const subRef = doc(db, 'subscriptions', user.tenantId);

    let tenantLoaded = false;
    let subLoaded = false;

    const checkLoadingFinished = () => {
      if (tenantLoaded && subLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeTenant = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setTenant({ id: docSnap.id, ...docSnap.data() } as Tenant);
        } else {
          setError(new Error('Tenant document not found'));
          setTenant(null);
        }
        tenantLoaded = true;
        checkLoadingFinished();
      },
      (err) => {
        console.error('Error fetching tenant details:', err);
        setError(err as Error);
        tenantLoaded = true;
        checkLoadingFinished();
      }
    );

    const unsubscribeSub = onSnapshot(
      subRef,
      (subSnap) => {
        if (subSnap.exists()) {
          setSubscription({ tenantId: subSnap.id, ...subSnap.data() } as Subscription);
        } else {
          // Default to Starter (Free) plan limits if no subscription document exists
          setSubscription({
            tenantId: user.tenantId,
            planId: 'starter',
            status: 'active',
            limits: {
              branches: 1,
              servicesPerBranch: 2,
              usersPerBranch: 5,
              queueItemsPerDay: 50,
              smsIncluded: 0
            },
            usage: {
              smsSentThisMonth: 0,
              queuesCreatedThisMonth: 0
            },
            currentPeriodEndsAt: { seconds: Math.floor(Date.now() / 1000) + 365*24*60*60, nanoseconds: 0 },
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
            updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
          } as unknown as Subscription);
        }
        subLoaded = true;
        checkLoadingFinished();
      },
      (err) => {
        console.error('Error fetching subscription details:', err);
        subLoaded = true;
        checkLoadingFinished();
      }
    );

    return () => {
      unsubscribeTenant();
      unsubscribeSub();
    };
  }, [user]);

  return (
    <TenantContext.Provider value={{ tenant, subscription, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
