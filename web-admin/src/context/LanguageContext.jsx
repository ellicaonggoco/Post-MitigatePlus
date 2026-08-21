import React, { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

export const TRANSLATIONS = {
  en: {
    // Nav Headers
    mainMenu: 'MAIN MENU',
    cityOps: 'CITY OPERATIONS',
    execTools: 'EXECUTIVE TOOLS',
    brgyTools: 'BARANGAY TOOLS',

    // Sidebar items
    dashboard: 'Dashboard',
    verificationQueue: 'Verification Queue',
    priorityIndex: 'Priority Index',
    heatmap: 'Barangay Heatmap',
    distributionEvents: 'Distribution Events',
    warehouseInventory: 'Warehouse Inventory',
    reliefAllocation: 'Relief Allocation Engine',
    fraudInterception: 'Fraud Interception',
    specialRequests: 'Special Requests',
    announcements: 'Announcements',
    reports: 'Reports & Audit',
    provisionAccounts: 'Account Management',
    fieldAccounts: 'Account Management',
    accountSecurity: 'Account Security',
    globalPolicy: 'Global Policy Config',
    recoveryProgress: 'Recovery Progress',
    settings: 'Settings',
    logout: 'Logout',

    // Welcome Headers & Badges
    welcomeTitleSuper: 'City of Manila Executive Dashboard',
    welcomeSubSuper: 'City-wide statistics across all 897 barangays of Manila.',
    welcomeTitleAdmin: 'Operational Command Center',
    welcomeSubAdmin: 'Manage city-wide relief distribution, field staff, and warehouse inventory.',
    welcomeTitleBrgy: 'Magandang araw, Barangay',
    welcomeSubBrgy: 'Official Operations Panel for Barangay',

    // Actions & Buttons
    searchPlaceholder: 'Search name, barangay, or keyword...',
    exportCSV: 'Export CSV Report',
    previous: 'Previous',
    next: 'Next',
    saveChanges: 'Save Changes',
    saved: 'Saved!',
  },
  fil: {
    // Nav Headers
    mainMenu: 'PANGUNAHING MENU',
    cityOps: 'OPERASYON NG LUNGSOD',
    execTools: 'MGA GAMIT NG OPISYAL',
    brgyTools: 'MGA GAMIT NG BARANGAY',

    // Sidebar items
    dashboard: 'Dashboard ng Operasyon',
    verificationQueue: 'Pila ng Beripikasyon',
    priorityIndex: 'Indeks ng Priyoridad',
    heatmap: 'Mapa ng Panganib sa Barangay',
    distributionEvents: 'Aktibidad ng Pamamahagi',
    warehouseInventory: 'Imbentaryo sa Imbakan',
    reliefAllocation: 'Kalkulador ng Ayuda',
    fraudInterception: 'Paghaharang sa Pandaraya',
    specialRequests: 'Espesyal na Kahilingan',
    announcements: 'Mga Anunsyo sa Residente',
    reports: 'Ulat at Pagsusuri',
    provisionAccounts: 'Paggawa ng Akawnt',
    fieldAccounts: 'Akawnt ng Field Staff',
    accountSecurity: 'Kasegurohan ng Akawnt',
    globalPolicy: 'Patakaran ng Sistema',
    recoveryProgress: 'Antas ng Pagbangon',
    settings: 'Mga Setting ng Sistema',
    logout: 'Mag-logout',

    // Welcome Headers & Badges
    welcomeTitleSuper: 'Eksklusibong Dashboard ng Lungsod ng Maynila',
    welcomeSubSuper: 'Kabuuan at istatistika sa buong 897 barangay ng Maynila.',
    welcomeTitleAdmin: 'Sentro ng Operasyon sa Maynila',
    welcomeSubAdmin: 'Pamahalaan ang pamamahagi ng ayuda, field staff, at imbentaryo.',
    welcomeTitleBrgy: 'Magandang araw, Barangay',
    welcomeSubBrgy: 'Opisyal na Panel ng Operasyon para sa Barangay',

    // Actions & Buttons
    searchPlaceholder: 'Mag-search ng pangalan, barangay, o keyword...',
    exportCSV: 'I-download ang Ulat sa CSV',
    previous: 'Nakaraan',
    next: 'Susunod',
    saveChanges: 'I-save ang mga Pagbabago',
    saved: 'Nai-save na!',
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem('mitigateplus_lang') || 'en');

  const setLanguage = (newLang) => {
    setLangState(newLang);
    localStorage.setItem('mitigateplus_lang', newLang);
    window.dispatchEvent(new Event('mitigateplus_lang_changed'));
  };

  useEffect(() => {
    const handleLangChange = () => {
      const savedLang = localStorage.getItem('mitigateplus_lang') || 'en';
      setLangState(savedLang);
    };

    window.addEventListener('mitigateplus_lang_changed', handleLangChange);
    return () => window.removeEventListener('mitigateplus_lang_changed', handleLangChange);
  }, []);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
