import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { signUpWithEmail, signInWithGoogle } from '@/features/auth/repository/authRepository';

export function useSignup() {
  const navigate = useNavigate();

  const emailMutation = useMutation({
    mutationFn: ({ name, email, password }: { name: string; email: string; password: string }) =>
      signUpWithEmail(name, email, password),
    onSuccess: (result) => {
      if (result.error) return;
      // After signup, go to onboarding to complete tenant profile
      navigate('/onboarding', { replace: true });
    },
  });

  const googleMutation = useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: (result) => {
      if (result.error) return;
      navigate('/onboarding', { replace: true });
    },
  });

  return { emailMutation, googleMutation };
}
