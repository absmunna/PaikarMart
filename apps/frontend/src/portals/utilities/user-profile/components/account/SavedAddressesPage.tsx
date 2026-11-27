import React, { useState, useEffect } from 'react';
import { AlertCircle, MapPin, Plus, Home, Building2, Trash2, X } from 'lucide-react';
import { SavedAddress } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/features/auth';
import { createSavedAddress, deleteSavedAddress, fetchSavedAddresses, setDefaultSavedAddress } from '@/features/auth';
import { useLocationSettings } from '@/contexts/LocationContext';
import { AdministrativeAreaFields } from '@/components/shared/AdministrativeAreaFields';
import type { AdministrativeArea } from '@/types';
import { formatAdministrativeArea } from '@/utils/administrativeArea';

const DEMO_ADDRESS_IDS = new Set(['addr_1', 'addr_2']);

export const SavedAddressesPage: React.FC = () => {
  const { language } = useLanguage();
  const { firebaseUser } = useAuth();
  const { setManualLocation } = useLocationSettings();
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => {
    try {
      const stored = localStorage.getItem('paikarmart_user_addresses');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((address) => !DEMO_ADDRESS_IDS.has(address?.id));
        }
      }
    } catch (error) {
      console.error('Unable to load saved addresses from this device:', error);
    }
    return [];
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(Boolean(firebaseUser));
  const [addressError, setAddressError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [serviceArea, setServiceArea] = useState<AdministrativeArea>({});
  const [tag, setTag] = useState<'home' | 'office' | 'other'>('home');
  const [notes, setNotes] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isBn = language === 'bn';

  useEffect(() => {
    if (!firebaseUser) {
      setIsLoadingAddresses(false);
      return;
    }

    let active = true;
    setIsLoadingAddresses(true);
    void fetchSavedAddresses()
      .then((remote) => {
        if (!active) return;
        if (remote.length > 0) setAddresses(remote);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Unable to load saved addresses from the account:', error);
        setAddressError(
          isBn
            ? 'অ্যাকাউন্টের ঠিকানা লোড করা যায়নি। আবার চেষ্টা করুন।'
            : 'Saved addresses could not be loaded from your account. Try again.'
        );
      })
      .finally(() => {
        if (active) setIsLoadingAddresses(false);
      });

    return () => {
      active = false;
    };
  }, [firebaseUser, isBn]);

  useEffect(() => {
    try {
      localStorage.setItem('paikarmart_user_addresses', JSON.stringify(addresses));
    } catch (error) {
      console.error('Unable to save addresses on this device:', error);
      setAddressError(
        isBn
          ? 'এই ডিভাইসে ঠিকানা সংরক্ষণ করা যায়নি।'
          : 'Addresses could not be saved on this device.'
      );
    }
  }, [addresses, isBn]);

  const handleSetDefault = async (id: string) => {
    setAddressError(null);
    if (firebaseUser && !id.startsWith('addr_')) {
      try {
        await setDefaultSavedAddress(id);
      } catch (error) {
        console.error('Unable to update the default address:', error);
        setAddressError(
          isBn
            ? 'ডিফল্ট ঠিকানা আপডেট করা যায়নি। আবার চেষ্টা করুন।'
            : 'The default address could not be updated. Try again.'
        );
        return;
      }
    }
    setAddresses(prev => prev.map(a => ({
      ...a,
      isDefault: a.id === id
    })));
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !phone.trim() || !streetAddress.trim() || !city.trim()) return;
    setAddressError(null);
    setIsSavingAddress(true);

    const newAddress: SavedAddress = {
      id: `addr_${Date.now()}`,
      label: label.trim() || (tag === 'home' ? 'Home' : tag === 'office' ? 'Office' : 'Other Place'),
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      streetAddress: streetAddress.trim(),
      apartment: apartment.trim() || undefined,
      city: city.trim(),
      ...serviceArea,
      postalCode: serviceArea.postalCode,
      tag,
      isDefault: addresses.length === 0,
      notes: notes.trim() || undefined
    };

    setAddresses(prev => [newAddress, ...prev]);
    if (firebaseUser) {
      const { id, ...addressPayload } = newAddress;
      try {
        const savedAddress = await createSavedAddress(addressPayload);
        setAddresses(prev => prev.map(address => address.id === id ? savedAddress : address));
      } catch (error) {
        console.error('Address account sync failed:', error);
        setAddressError(
          isBn
            ? 'ঠিকানাটি এই ডিভাইসে রাখা হয়েছে, কিন্তু অ্যাকাউন্টে সিঙ্ক হয়নি।'
            : 'The address is saved on this device, but could not be synced to your account.'
        );
      }
    }
    setShowAddForm(false);
    setRecipientName('');
    setPhone('');
    setStreetAddress('');
    setApartment('');
    setLabel('');
    setCity('');
    setServiceArea({});
    setNotes('');
    setIsSavingAddress(false);
  };

  const confirmDelete = async (address: SavedAddress) => {
    setAddressError(null);
    if (firebaseUser && !address.id.startsWith('addr_')) {
      try {
        await deleteSavedAddress(address.id);
      } catch (error) {
        console.error('Unable to delete the saved address:', error);
        setAddressError(
          isBn
            ? 'ঠিকানাটি মুছে ফেলা যায়নি। আবার চেষ্টা করুন।'
            : 'The address could not be deleted. Try again.'
        );
        return;
      }
    }
    setAddresses(prev => prev.filter(item => item.id !== address.id));
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-[var(--pm-text)]">
            {isBn ? 'সংরক্ষিত ডেলিভারি ঠিকানা' : 'Saved Delivery Addresses'}
          </h3>
          <p className="text-xs text-[var(--pm-muted)]">
            {isBn 
              ? 'ই-কমার্স পণ্য এবং রাইড ড্রপ-অফের জন্য ঠিকানা সংরক্ষণ ও পরিচালনা করুন' 
              : 'Manage frequent delivery drop-off locations for instant express checkout'}
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--pm-accent)] px-3.5 py-2 text-xs font-bold text-[var(--pm-accent-fg)] shadow-md transition-colors hover:bg-[var(--pm-accent-hover)] active:scale-95 cursor-pointer sm:w-auto"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? (isBn ? 'বাতিল' : 'Cancel') : (isBn ? 'নতুন ঠিকানা' : 'Add Address')}</span>
        </button>
      </div>

      {addressError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--pm-danger)]/30 bg-[var(--pm-danger-soft)] p-3 text-sm text-[var(--pm-danger)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{addressError}</span>
        </div>
      )}

      {/* Add Address Form Drawer/Card */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="p-5 rounded-3xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-4 animate-fadeIn">
          <h4 className="text-sm font-bold text-[var(--pm-text)]">
            {isBn ? 'নতুন ডেলিভারি ঠিকানা যোগ করুন' : 'Add New Delivery Address'}
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'প্রাপকের নাম' : 'Recipient name'}
              </span>
              <input
                type="text"
                autoComplete="name"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                required
                className="min-h-11 w-full rounded-xl border border-[var(--pm-border)] bg-[var(--pm-input)] px-3 text-sm font-semibold text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] focus:border-[var(--pm-accent)] focus:outline-hidden"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'ফোন নম্বর' : 'Phone number'}
              </span>
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="min-h-11 w-full rounded-xl border border-[var(--pm-border)] bg-[var(--pm-input)] px-3 text-sm font-semibold text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] focus:border-[var(--pm-accent)] focus:outline-hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'ঠিকানার ধরন' : 'Address Type'}
              </label>
              <div className="flex gap-1.5">
                {(['home', 'office', 'other'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`min-h-11 flex-1 text-xs font-bold rounded-xl border capitalize transition-all cursor-pointer ${
                      tag === t 
                        ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-[var(--pm-accent)] shadow-2xs' 
                        : 'bg-[var(--pm-card)] border-[var(--pm-border)] text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'ঠিকানার শিরোনাম' : 'Label / Nickname'}
              </label>
              <input
                type="text"
                placeholder={isBn ? 'যেমন: বাসা / ফার্মগেট ফ্ল্যাট' : 'e.g. My Apartment'}
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full min-h-11 px-3 rounded-xl bg-[var(--pm-input)] text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] font-semibold focus:outline-hidden focus:border-[var(--pm-accent)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'শহর' : 'City'}
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                required
                className="w-full min-h-11 px-3 rounded-xl bg-[var(--pm-input)] text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] font-semibold focus:outline-hidden focus:border-[var(--pm-accent)]"
              />
            </div>
          </div>

          <AdministrativeAreaFields
            value={serviceArea}
            onChange={(area) => {
              setServiceArea(area);
              if (area.district) setCity(area.district);
            }}
            isBn={isBn}
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--pm-text)]">
              {isBn ? 'রাস্তা, বাড়ি ও এলাকা' : 'Street Address & Road'}
            </label>
            <input
              type="text"
              placeholder={isBn ? 'বাড়ি নং, রোড নং, সেক্টর/ব্লক' : 'House / Road / Block / Area'}
              value={streetAddress}
              onChange={e => setStreetAddress(e.target.value)}
              required
              className="w-full min-h-11 px-3.5 rounded-xl bg-[var(--pm-input)] text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] font-semibold focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'ফ্ল্যাট / তলা (ঐচ্ছিক)' : 'Apt / Floor / Unit (Optional)'}
              </label>
              <input
                type="text"
                placeholder={isBn ? 'যেমন: ফ্ল্যাট ৪সি, লিফটের ৩' : 'e.g. Suite 402, 4th Floor'}
                value={apartment}
                onChange={e => setApartment(e.target.value)}
                className="w-full min-h-11 px-3 rounded-xl bg-[var(--pm-input)] text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] font-semibold focus:outline-hidden focus:border-[var(--pm-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'ডেলিভারি নোট (রাইডারের জন্য)' : 'Rider Instructions Note'}
              </label>
              <input
                type="text"
                placeholder={isBn ? 'যেমন: গেটে বেল বাজাবেন' : 'e.g. Ring the bell at gate'}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full min-h-11 px-3 rounded-xl bg-[var(--pm-input)] text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] font-semibold focus:outline-hidden focus:border-[var(--pm-accent)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSavingAddress}
              onClick={() => setShowAddForm(false)}
              className="min-h-11 rounded-xl bg-[var(--pm-card)] px-4 text-xs font-bold text-[var(--pm-muted)] transition-colors hover:text-[var(--pm-text)] cursor-pointer disabled:opacity-50"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSavingAddress}
              className="min-h-11 rounded-xl bg-[var(--pm-accent)] px-5 text-xs font-bold text-[var(--pm-accent-fg)] shadow-xs transition-colors hover:bg-[var(--pm-accent-hover)] cursor-pointer disabled:opacity-50"
            >
              {isSavingAddress
                ? (isBn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…')
                : (isBn ? 'ঠিকানা সেভ করুন' : 'Save Address')}
            </button>
          </div>
        </form>
      )}

      {isLoadingAddresses && (
        <p role="status" className="text-sm text-[var(--pm-muted)]">
          {isBn ? 'ঠিকানা লোড হচ্ছে…' : 'Loading saved addresses…'}
        </p>
      )}

      {addresses.length === 0 && !showAddForm && !isLoadingAddresses && !addressError && (
        <div role="status" className="rounded-2xl border border-dashed border-[var(--pm-border)] bg-[var(--pm-surface)] p-5 text-center">
          <MapPin className="mx-auto h-5 w-5 text-[var(--pm-muted)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--pm-text)]">
            {isBn ? 'এখনো কোনো ঠিকানা সংরক্ষিত নেই' : 'No saved addresses yet'}
          </p>
          <p className="mt-1 text-sm text-[var(--pm-muted)]">
            {isBn ? 'চেকআউট দ্রুত করতে একটি ঠিকানা যোগ করুন।' : 'Add an address to make checkout quicker.'}
          </p>
        </div>
      )}

      {/* Address Cards List */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {addresses.map(addr => {
          const Icon = addr.tag === 'home' ? Home : addr.tag === 'office' ? Building2 : MapPin;

          return (
            <div
              key={addr.id}
              className={`p-4 rounded-3xl border transition-all relative flex flex-col justify-between ${
                addr.isDefault 
                  ? 'bg-[var(--pm-accent-soft)] border-[var(--pm-accent-border)]'
                  : 'bg-[var(--pm-card)] border-[var(--pm-border)]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${addr.isDefault ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)]' : 'bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-text)]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--pm-text)]">{addr.label}</h4>
                      <p className="text-[10px] text-[var(--pm-muted)] capitalize">{addr.tag}</p>
                    </div>
                  </div>

                  {addr.isDefault ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-2xs">
                      {isBn ? 'ডিফল্ট ঠিকানা' : 'Default'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-[10px] font-bold text-[var(--pm-accent)] hover:underline cursor-pointer"
                    >
                      {isBn ? 'ডিফল্ট করুন' : 'Set Default'}
                    </button>
                  )}
                </div>

                <div className="text-xs text-[var(--pm-muted)] space-y-0.5 pt-1">
                  <p className="font-semibold text-[var(--pm-text)]">{addr.recipientName}</p>
                  <p className="font-semibold text-[var(--pm-text)]">
                    {addr.streetAddress}{addr.apartment ? `, ${addr.apartment}` : ''}
                  </p>
                  <p className="text-[11px] text-[var(--pm-muted)]">
                    {addr.city}{addr.postalCode ? ` - ${addr.postalCode}` : ''} · {addr.phone}
                  </p>
                  {formatAdministrativeArea(addr) && (
                    <p className="text-[11px] text-[var(--pm-muted)]">
                      {formatAdministrativeArea(addr)}
                    </p>
                  )}
                  {addr.notes && (
                    <p className="text-[10px] text-[var(--pm-warning)] italic pt-1">
                      Note: "{addr.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--pm-border)] mt-3">
                <button
                  type="button"
                  onClick={() =>
                    setManualLocation(
                      [addr.upazila, addr.thana, addr.district, addr.division].filter(Boolean).join(', ') || addr.city,
                      undefined,
                      addr,
                    )
                  }
                  className="mr-auto px-2 py-1 text-[10px] font-bold text-[var(--pm-accent)] hover:underline cursor-pointer"
                >
                  {isBn ? 'এই এলাকার দোকান দেখুন' : 'Use this area'}
                </button>
                {deleteConfirmId === addr.id ? (
                  <>
                    <span className="text-[10px] text-[var(--pm-muted)]">{isBn ? 'মুছে ফেলবেন?' : 'Delete this address?'}</span>
                    <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold text-[var(--pm-muted)] hover:text-[var(--pm-text)]">{isBn ? 'না' : 'Cancel'}</button>
                    <button type="button" onClick={() => void confirmDelete(addr)} className="px-2 py-1 rounded-lg bg-[var(--pm-danger)] text-white text-[10px] font-bold">{isBn ? 'হ্যাঁ, মুছুন' : 'Delete'}</button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className="p-1.5 text-[var(--pm-muted)] hover:text-[var(--pm-danger)] transition-colors cursor-pointer"
                    title={isBn ? 'মুছে ফেলুন' : 'Delete Address'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
