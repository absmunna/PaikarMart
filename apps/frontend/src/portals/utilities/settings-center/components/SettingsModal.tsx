import React, { useEffect, useState } from 'react';
import { 
  X, 
  Palette, 
  Languages, 
  MapPin, 
  Info, 
  Sun, 
  Moon, 
  Laptop, 
  Check, 
  Sparkles,
  ShieldCheck,
  Cpu,
  Users,
  UserPlus,
  Shield
} from 'lucide-react';
import { useSettings, SettingsTab } from '@/contexts/SettingsContext';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/features/auth';
import { LocationPreferences } from '@/portals/utilities/settings-center/components/LocationPreferences';

interface SettingsModalProps {
  onOpenLocationModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onOpenLocationModal }) => {
  const { isSettingsOpen, closeSettings, activeSettingsTab, setActiveSettingsTab } = useSettings();
  const { themeMode, setThemeMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const isBn = language === 'bn';
  const { 
    hasPaikarMartAccess, 
    paikarMartDelegates, 
    grantPaikarMartAccess, 
    revokePaikarMartAccess 
  } = useAuth();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [teamMsg, setTeamMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings();
    };
    if (isSettingsOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  const handleInviteDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setTeamMsg({ type: 'error', text: isBn ? 'সঠিক ইমেইল ঠিকানা দিন।' : 'Please enter a valid email address.' });
      return;
    }
    try {
      const roleToGrant = inviteRole === 'admin' ? 'admin' : inviteRole === 'editor' ? 'moderator' : 'consumer';
      await grantPaikarMartAccess(inviteEmail, inviteName, roleToGrant as any);
      setTeamMsg({ type: 'success', text: isBn ? 'সফলভাবে টিম মেম্বার যুক্ত হয়েছে।' : `Successfully invited ${inviteEmail} as ${inviteRole.toUpperCase()}.` });
      setInviteEmail('');
      setInviteName('');
      setTimeout(() => setTeamMsg(null), 4000);
    } catch (err: any) {
      setTeamMsg({ type: 'error', text: err?.message || 'Failed to grant access.' });
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'appearance', label: t.settings.tabs.appearance, icon: Palette },
    { id: 'language', label: t.settings.tabs.language, icon: Languages },
    { id: 'location', label: t.settings.tabs.location, icon: MapPin },
    { id: 'team_access', label: isBn ? 'টিম অ্যাক্সেস' : 'Team Access', icon: Users },
    { id: 'about', label: t.settings.tabs.about, icon: Info },
  ];

  const themeOptions: {
    id: ThemeMode;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    swatchBg: string;
    swatchAccent: string;
  }[] = [
    {
      id: 'light',
      label: t.settings.theme.light,
      desc: t.settings.theme.lightDesc,
      icon: Sun,
      swatchBg: '#f1f5f9',
      swatchAccent: '#2563eb',
    },
    {
      id: 'nakshiLight',
      label: language === 'bn' ? 'নকশী লাইট (Nakshi)' : 'Nakshi Light',
      desc: language === 'bn' ? 'বাংলার উষ্ণ সোনালি হেরিটেজ লাইট থিম' : 'Warm saffron & cream heritage palette',
      icon: Sparkles,
      swatchBg: '#fffbeb',
      swatchAccent: '#b45309',
    },
    {
      id: 'greenField',
      label: language === 'bn' ? 'সবুজ প্রান্তর (Green Field)' : 'Green Field',
      desc: language === 'bn' ? 'গভীর পান্না ও সবুজ বাংলার হাই-কনট্রাস্ট' : 'Emerald soil dark & forest green contrast',
      icon: Sparkles,
      swatchBg: '#021a12',
      swatchAccent: '#10b981',
    },
    {
      id: 'deepDark',
      label: language === 'bn' ? 'ডিপ ডার্ক (Deep Dark)' : 'Deep Dark',
      desc: language === 'bn' ? 'গভীর ওলেড কালো ও অ্যাম্বার অ্যাকসেন্ট' : 'Obsidian OLED canvas with vibrant orange',
      icon: Moon,
      swatchBg: '#07080b',
      swatchAccent: '#ff7a00',
    },
    {
      id: 'dark',
      label: t.settings.theme.dark,
      desc: t.settings.theme.darkDesc,
      icon: Moon,
      swatchBg: '#020617',
      swatchAccent: '#3b82f6',
    },
    {
      id: 'system',
      label: t.settings.theme.system,
      desc: t.settings.theme.systemDesc,
      icon: Laptop,
      swatchBg: '#334155',
      swatchAccent: '#0ea5e9',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={closeSettings}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative w-full max-w-xl bg-[var(--pm-card)] text-[var(--pm-text)] rounded-3xl shadow-2xl border border-[var(--pm-border)] flex flex-col max-h-[90vh] overflow-hidden z-10"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--pm-border)] flex items-center justify-between bg-[var(--pm-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="settings-modal-title" className="text-sm sm:text-base font-black text-[var(--pm-text)]">
                {t.settings.title}
              </h3>
              <p className="text-[11px] text-[var(--pm-muted)]">
                {t.settings.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={closeSettings}
            className="p-1.5 rounded-full text-[var(--pm-muted)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="flex items-center px-4 pt-2 border-b border-[var(--pm-border)] gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeSettingsTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSettingsTab(id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[var(--pm-accent)] text-[var(--pm-accent)]'
                    : 'border-transparent text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: APPEARANCE / THEME */}
          {activeSettingsTab === 'appearance' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[var(--pm-text)]">
                  {t.settings.theme.title}
                </h4>
                <p className="text-xs text-[var(--pm-muted)]">
                  {t.settings.theme.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {themeOptions.map(({ id, label, desc, icon: Icon, swatchBg, swatchAccent }) => {
                  const isSelected = themeMode === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setThemeMode(id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer group ${
                        isSelected
                          ? 'bg-[var(--pm-accent-soft)] border-[var(--pm-accent)] ring-2 ring-[var(--pm-accent-border)]'
                          : 'bg-[var(--pm-card)] border-[var(--pm-border)] hover:bg-[var(--pm-card-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs border border-black/10"
                          style={{ backgroundColor: swatchBg, color: swatchAccent }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <div
                            className="w-5 h-5 rounded-full text-white flex items-center justify-center"
                            style={{ backgroundColor: swatchAccent }}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-[var(--pm-text)] group-hover:text-[var(--pm-accent)] transition-colors">
                          {label}
                        </h5>
                        <p className="text-[10px] text-[var(--pm-muted)] mt-0.5 line-clamp-2">
                          {desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LANGUAGE */}
          {activeSettingsTab === 'language' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[var(--pm-text)]">
                  {t.settings.language.title}
                </h4>
                <p className="text-xs text-[var(--pm-muted)]">
                  {t.settings.language.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bangla Option */}
                <button
                  onClick={() => setLanguage('bn')}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                    language === 'bn'
                      ? 'bg-[var(--pm-accent-soft)] border-[var(--pm-accent)] ring-2 ring-[var(--pm-accent-border)]'
                      : 'bg-[var(--pm-card)] border-[var(--pm-border)] hover:bg-[var(--pm-card-hover)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🇧🇩</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-[var(--pm-text)]">
                          {t.settings.language.bangla}
                        </h5>
                        {language === 'bn' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] border border-[var(--pm-accent-border)]">
                            {t.settings.language.currentTag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--pm-muted)] mt-1">
                        {t.settings.language.banglaDesc}
                      </p>
                    </div>
                  </div>
                  {language === 'bn' && (
                    <div className="w-5 h-5 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>

                {/* English Option */}
                <button
                  onClick={() => setLanguage('en')}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                    language === 'en'
                      ? 'bg-[var(--pm-accent-soft)] border-[var(--pm-accent)] ring-2 ring-[var(--pm-accent-border)]'
                      : 'bg-[var(--pm-card)] border-[var(--pm-border)] hover:bg-[var(--pm-card-hover)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🇺🇸</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-[var(--pm-text)]">
                          {t.settings.language.english}
                        </h5>
                        {language === 'en' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] border border-[var(--pm-accent-border)]">
                            {t.settings.language.currentTag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--pm-muted)] mt-1">
                        {t.settings.language.englishDesc}
                      </p>
                    </div>
                  </div>
                  {language === 'en' && (
                    <div className="w-5 h-5 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LOCATION & GPS */}
          {activeSettingsTab === 'location' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[var(--pm-text)]">
                  {t.settings.location.title}
                </h4>
                <p className="text-xs text-[var(--pm-muted)]">
                  {t.settings.location.subtitle}
                </p>
              </div>

              <LocationPreferences onOpenLocationModal={onOpenLocationModal} />
            </div>
          )}

          {/* TAB 4: TEAM ACCESS (Facebook Pages style) */}
          {activeSettingsTab === 'team_access' && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[var(--pm-text)]">
                  {isBn ? 'পাইকারমার্ট টিম ও পেজ অ্যাক্সেস' : 'PaikarMart Team & Page Access'}
                </h4>
                <p className="text-xs text-[var(--pm-muted)]">
                  {isBn 
                    ? 'ফেসবুক পেজ ম্যানেজমেন্টের মতো আপনার অর্গানাইজেশন প্রোফাইল পরিচালনার জন্য অন্য ব্যবহারকারীদের অ্যাডমিন, এডিটর বা ভিউয়ার হিসেবে যুক্ত করুন।' 
                    : 'Manage who has access to your PaikarMart organization profile and what they can control, mirroring Facebook Page roles.'}
                </p>
              </div>

              {!hasPaikarMartAccess ? (
                <div className="p-6 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-center space-y-2">
                  <Shield className="w-8 h-8 text-amber-500 mx-auto" />
                  <h5 className="text-xs font-bold text-[var(--pm-text)]">
                    {isBn ? 'সুপার অ্যাডমিন অ্যাক্সেস প্রয়োজন' : 'Super Admin Access Required'}
                  </h5>
                  <p className="text-[11px] text-[var(--pm-muted)]">
                    {isBn ? 'টিম মেম্বার পরিচালনা করতে আপনার অ্যাকাউন্টকে পাইকারমার্ট সুপার অ্যাডমিন মোডে থাকতে হবে।' : 'Switch to PaikarMart Super Admin mode to manage team roles and delegates.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMsg && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${teamMsg.type === 'success' ? 'bg-[var(--pm-success-soft)] text-[var(--pm-success)]' : 'bg-[var(--pm-danger-soft)] text-[var(--pm-danger)]'}`}>
                      {teamMsg.text}
                    </div>
                  )}

                  {/* Invite Form */}
                  <form onSubmit={handleInviteDelegate} className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3">
                    <h5 className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-[var(--pm-accent)]" />
                      <span>{isBn ? 'নতুন টিম মেম্বার বা পেজ রোল যুক্ত করুন' : 'Assign New Page Role / Invite Member'}</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder={isBn ? 'সদস্যের নাম (ঐচ্ছিক)' : 'Member Name'}
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                      />
                      <input
                        type="email"
                        required
                        placeholder="user@gmail.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--pm-muted)]">{isBn ? 'রোল:' : 'Role:'}</span>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-bold text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                        >
                          <option value="admin">{isBn ? 'অ্যাডমিন (Admin - Full Control)' : 'Admin (Full Control)'}</option>
                          <option value="editor">{isBn ? 'এডিটর (Editor - Content & Products)' : 'Editor (Content & Products)'}</option>
                          <option value="viewer">{isBn ? 'ভিউয়ার (Viewer - Read Only)' : 'Viewer (Read Only)'}</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isBn ? 'ইনভাইট পাঠান' : 'Grant Access'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Delegates List */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-[var(--pm-muted)] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{isBn ? `অ্যাক্সেসপ্রাপ্ত টিম মেম্বার (${paikarMartDelegates.length})` : `Existing Team Members (${paikarMartDelegates.length})`}</span>
                    </h5>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {paikarMartDelegates.map((del) => (
                        <div key={del.id} className="p-3 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-[var(--pm-text)] truncate">{del.name}</p>
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] uppercase">
                                {del.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--pm-muted)] font-mono truncate">
                              {del.email} · Added by {del.addedBy} on {del.addedAt}
                            </p>
                          </div>
                          {del.email !== 'abs.munna1@gmail.com' && (
                            <button
                              type="button"
                              onClick={() => void revokePaikarMartAccess(del.email)}
                              className="px-2.5 py-1 rounded-lg bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] text-[11px] font-bold shrink-0 hover:opacity-80 cursor-pointer"
                              title="Revoke access"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ABOUT APP */}
          {activeSettingsTab === 'about' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center font-black text-xl shadow-md">
                    P
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--pm-text)]">
                      PaikarMart Super-App Platform
                    </h4>
                    <p className="text-xs text-[var(--pm-muted)]">
                      Version 2.4.0 (Modular Engine)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div className="p-2.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--pm-success)]" />
                    <div>
                      <span className="text-[10px] text-[var(--pm-muted)] block">Architecture</span>
                      <span className="font-semibold text-[var(--pm-text)]">Modular Split Context</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[var(--pm-accent)]" />
                    <div>
                      <span className="text-[10px] text-[var(--pm-muted)] block">Performance</span>
                      <span className="font-semibold text-[var(--pm-text)]">Zero-lag Re-renders</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--pm-muted)] leading-relaxed">
                Social Commerce, On-Demand Nearby Services, Live Ride Sharing, and Creator Monetization under a unified, high-performance modular frontend.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--pm-border)] flex items-center justify-end bg-[var(--pm-surface)]">
          <button
            onClick={closeSettings}
            className="px-5 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            {t.settings.close}
          </button>
        </div>
      </div>
    </div>
  );
};
