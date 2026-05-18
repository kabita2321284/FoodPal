import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'ne', name: 'Nepali', native: 'नेपाली' }
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
      >
        <Languages size={18} />
        <span className="text-sm font-medium">{currentLang.native}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-40 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="py-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      i18n.changeLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={`w-full flex flex-col items-start px-4 py-2 hover:bg-orange-50 transition-colors ${
                      i18n.language === lang.code ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-sm font-semibold">{lang.native}</span>
                    <span className="text-xs opacity-60">{lang.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
