import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle } from '@/features/auth/repository/authRepository';

export function useLogin() {
  const navigate = useNavigate();

  const emailMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signInWithEmail(email, password),
    onSuccess: (result) => {
      if (result.error) return; // error handled in component
      // AuthContext listener will pick up the user, then redirect happens
      navigate('/dashboard/queues', { replace: true });
    },
  });

  const googleMutation = useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: (result) => {
      if (result.error) return;
      if (result.isNewUser) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard/queues', { replace: true });
      }
    },
  });

  return { emailMutation, googleMutation };
}
