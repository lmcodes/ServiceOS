import React from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Globe } from 'lucide-react';

export const SettingsSwitcher: React.FC = () => {
  const { locale, setLocale } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {/* Language Switcher */}
      <button
        type="button"
        onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/20 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-800/80 backdrop-blur-md shadow-glass transition-all duration-200"
      >
        <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>{locale === 'th' ? 'EN' : 'ไทย'}</span>
      </button>

      {/* Theme Switcher */}
      <button
        type="button"
        onClick={toggleTheme}
        className="p-2 rounded-xl bg-white/20 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-800/80 backdrop-blur-md shadow-glass transition-all duration-200"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        ) : (
          <Sun className="w-4 h-4 text-warning" />
        )}
      </button>
    </div>
  );
};

export default SettingsSwitcher;
