import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AppRoutes from '@/routes/AppRoutes';

// Initialize i18next (must be imported before any component that uses useTranslation)
import '@/config/i18n';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default cache stale duration
      refetchOnWindowFocus: false, // Prevents aggressive background refreshes
      retry: 1, // Limit retries to prevent looping quota charges on auth failures
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <TenantProvider>
              <AppRoutes />
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
      {/* Devtools helper (only active during development compilation) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
