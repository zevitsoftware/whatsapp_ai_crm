import { useLanguage } from '../i18n/index.jsx';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ compact = false }) => {
  const { language, toggleLanguage } = useLanguage();

  if (compact) {
    return (
      <button
        onClick={toggleLanguage}
        className="p-3 rounded-2xl bg-muted/30 hover:bg-muted transition-all group border border-border"
        title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
      >
        <Globe size={20} className="text-muted-foreground group-hover:text-foreground" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-muted/30 hover:bg-muted transition-all border border-border text-sm font-bold"
    >
      <Globe size={16} className="text-primary" />
      <span className="text-white">{language === 'id' ? 'ID' : 'EN'}</span>
    </button>
  );
};

export default LanguageSwitcher;
