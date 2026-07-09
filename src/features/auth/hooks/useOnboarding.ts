import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { completeOnboarding, OnboardingData } from '@/features/auth/repository/authRepository';

export function useOnboarding() {
  const navigate = useNavigate();
  const { user, refreshClaims } = useAuth();

  return useMutation({
    mutationFn: async (data: OnboardingData) => {
      if (!user) {
        return { error: 'ไม่พบผู้ใช้ที่เข้าสู่ระบบ' };
      }
      // During onboarding, the tenantId is the owner's Auth UID
      const tenantId = user.tenantId || user.uid;
      return completeOnboarding(tenantId, data, user.email || undefined);
    },
    onSuccess: async (result) => {
      if (result.error) return;
      
      try {
        // Force refresh user ID token to propagate custom claims (role and tenantId)
        await refreshClaims();
      } catch (err) {
        console.error('Error refreshing token claims after onboarding:', err);
      }
      
      // Navigate to main dashboard view
      navigate('/dashboard/queues', { replace: true });
    },
  });
}
