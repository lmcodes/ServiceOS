import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Globe } from 'lucide-react';

interface SettingsSwitcherProps {
  className?: string;
  isFloating?: boolean;
}

export const SettingsSwitcher: React.FC<SettingsSwitcherProps> = ({ className = '', isFloating = true }) => {
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const currentLocale = i18n.language?.startsWith('th') ? 'th' : 'en';

  const handleToggleLanguage = () => {
    const nextLocale = currentLocale === 'th' ? 'en' : 'th';
    i18n.changeLanguage(nextLocale);
  };

  const containerClasses = isFloating
    ? `fixed top-4 right-4 z-50 flex items-center gap-2 ${className}`
    : `flex items-center gap-2 ${className}`;

  return (
    <div className={containerClasses}>
      {/* Language Switcher */}
      <button
        type="button"
        onClick={handleToggleLanguage}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 backdrop-blur-md shadow-sm transition-all duration-200 cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>{currentLocale === 'th' ? 'EN' : 'ไทย'}</span>
      </button>

      {/* Theme Switcher */}
      <button
        type="button"
        onClick={toggleTheme}
        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 backdrop-blur-md shadow-sm transition-all duration-200 cursor-pointer"
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
