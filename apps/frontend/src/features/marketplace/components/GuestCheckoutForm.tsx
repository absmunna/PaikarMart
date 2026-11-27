import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';
import {
  loadGuestCheckoutDraft,
  saveGuestCheckoutDraft,
  clearGuestCheckoutDraft,
} from '@/shared/hooks/useGuestSessionPersistence';
import { FormInput, FormSelect, FormTextArea } from '@/components/shared/FormControls';

interface GuestCheckoutFormProps {
  onVerify: (data: { name: string; phone: string; email: string; address: string }) => Promise<boolean>;
  onComplete: (data: { 
    name: string; 
    phone: string; 
    email: string; 
    address: string;
    courier: string;
    paymentMethod: string;
  }) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

export const GuestCheckoutForm: React.FC<GuestCheckoutFormProps> = ({ onVerify, onComplete, disabled = false, disabledMessage }) => {
  const [formData, setFormData] = useState(() => ({
    ...loadGuestCheckoutDraft(),
    paymentMethod: 'Cash on Delivery',
  }));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    saveGuestCheckoutDraft(formData);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!formData.name || !formData.phone || !formData.address) {
      setError('Please fill in all required fields.');
      setIsLoading(false);
      return;
    }

    const isNewUser = await onVerify(formData);
    
    setIsLoading(false);
    if (!isNewUser) {
      setError('An account with this phone or email already exists. Please log in.');
    } else {
      clearGuestCheckoutDraft();
      onComplete({ ...formData, paymentMethod: 'Cash on Delivery' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-1">
        <label className="text-xs font-bold text-[var(--pm-text)]">Name*</label>
        <div className="relative">
          <User className="absolute left-3 top-3 w-4 h-4 text-[var(--pm-muted)]" />
          <FormInput required type="text" className="w-full pl-10 pr-4 py-2 bg-[var(--pm-input)] text-[var(--pm-text)] text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
      </div>
      
      <div className="space-y-1">
        <label className="text-xs font-bold text-[var(--pm-text)]">Phone Number*</label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 w-4 h-4 text-[var(--pm-muted)]" />
          <FormInput required type="tel" className="w-full pl-10 pr-4 py-2 bg-[var(--pm-input)] text-[var(--pm-text)] text-xs" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-[var(--pm-text)]">Email (Optional)</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 w-4 h-4 text-[var(--pm-muted)]" />
          <FormInput type="email" className="w-full pl-10 pr-4 py-2 bg-[var(--pm-input)] text-[var(--pm-text)] text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-[var(--pm-text)]">Delivery Address*</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-[var(--pm-muted)]" />
          <FormTextArea required className="w-full pl-10 pr-4 py-2 bg-[var(--pm-input)] text-[var(--pm-text)] text-xs" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-[var(--pm-muted)] tracking-wider">Courier (Optional)</label>
          <FormSelect
            className="w-full px-3 py-2 bg-[var(--pm-input)] text-[var(--pm-text)] text-xs font-bold"
            value={formData.courier}
            onChange={e => setFormData({...formData, courier: e.target.value})}
          >
            <option>Pathao Express</option>
            <option>Steadfast Courier</option>
            <option>RedX Delivery</option>
            <option>Sundarban Courier</option>
          </FormSelect>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-[var(--pm-muted)] tracking-wider">Payment Method</label>
          <div className="px-3 py-2 rounded-xl bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] text-xs font-bold border border-[var(--pm-accent-border)]">
            Cash on Delivery
            <p className="mt-1 text-[11px] font-normal text-[var(--pm-muted)]">
              Pay the courier when your order arrives. Online payment is temporarily unavailable.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[var(--pm-danger)] text-[10px] font-bold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <button type="submit" disabled={isLoading || disabled} className="w-full py-3 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--pm-accent-fg)] font-bold text-xs shadow-lg cursor-pointer transition-colors">
        {isLoading ? 'Verifying...' : disabled ? (disabledMessage || 'Variant unavailable') : 'Place Order & Complete'}
      </button>
    </form>
  );
};
;
