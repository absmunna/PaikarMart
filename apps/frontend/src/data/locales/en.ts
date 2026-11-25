export const en = {
  // Navigation & Tabs
  nav: {
    home: 'Feed',
    shop: 'Market',
    wholesale: 'Wholesale',
    services: 'Services',
    rides: 'Transit',
    creator: 'Studio',
    profile: 'Profile',
    superHub: 'Hub',
    nearby: 'Nearby',
    wishlist: 'Wishlist',
    searchPlaceholder: 'Search products, creators, services...',
    settings: 'Settings',
    cart: 'Cart',
    notifications: 'Notifications',
    menu: 'Menu',
  },

  // Common Settings
  settings: {
    title: 'Settings & Preferences',
    subtitle: 'Customize theme, language, and location delivery radar',
    tabs: {
      appearance: 'Appearance',
      language: 'Language',
      location: 'Location & GPS',
      about: 'About App',
    },
    theme: {
      title: 'Display Theme',
      subtitle: 'Choose how PaikarMart looks on your screen',
      light: 'Light Mode',
      lightDesc: 'Clean bright palette for daytime viewing',
      dark: 'Dark Mode',
      darkDesc: 'OLED pitch dark for comfortable night usage',
      system: 'System Auto',
      systemDesc: 'Sync automatically with your device settings',
    },
    language: {
      title: 'App Language',
      subtitle: 'Select your preferred language for interfaces and menus',
      english: 'English (US)',
      englishDesc: 'Default global interface',
      bangla: 'বাংলা (Bengali)',
      banglaDesc: 'সহজ ও সাবলীল বাংলা ইন্টারফেস',
      currentTag: 'Active',
    },
    location: {
      title: 'Delivery & Live Radar Location',
      subtitle: 'Set your current address area and GPS coordinates',
      detectGPS: 'Detect My Live Location (GPS)',
      detectingGPS: 'Locking Satellite GPS Signal...',
      continuousWatch: 'Continuous GPS Tracking',
      continuousWatchDesc: 'Keep live coordinates updated for maps and travel estimates',
      currentCoordinates: 'Active GPS Coordinates',
      latitude: 'Latitude',
      longitude: 'Longitude',
      accuracy: 'Accuracy',
      savedZones: 'Saved Areas',
      openInteractiveMap: 'Open Interactive Google Map',
    },
    close: 'Close',
    saveChanges: 'Save Preferences',
    savedNotification: 'Settings saved successfully!',
  },

  // Common Actions
  common: {
    apply: 'Apply',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    loading: 'Loading...',
    status: 'Status',
    viewAll: 'View All',
  }
};

export type TranslationKey = typeof en;
