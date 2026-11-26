import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  X,
  Phone,
  User,
  Package,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { logisticsOrderApiClient } from '@/features/logistics/services/logisticsOrderApiClient';

interface LiveTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackingNumber?: string;
}

export const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({
  isOpen,
  onClose,
  initialTrackingNumber = '',
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [trackingKey, setTrackingKey] = useState(initialTrackingNumber);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [podOtp, setPodOtp] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isPodSubmitting, setIsPodSubmitting] = useState(false);
  const [podSuccess, setPodSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchTracking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = trackingKey.trim();
    if (!clean) {
      setErrorMsg(isBn ? 'সঠিক ট্র্যাকিং নম্বর বা অর্ডার আইডি দিন।' : 'Enter a valid tracking number or order ID.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setPodSuccess(null);

    try {
      const result = await logisticsOrderApiClient.trackOrderOrWaybill(clean);
      if (result.shipment || result.order) {
        setShipmentData(result.shipment);
        setOrderData(result.order);
      } else {
        setErrorMsg(isBn ? 'শিপমেন্ট বা ট্র্যাকিং নম্বর পাওয়া যায়নি।' : 'Shipment or tracking number not found.');
      }
    } catch {
      setErrorMsg(isBn ? 'ট্র্যাকিং ডাটা লোড করতে সমস্যা হয়েছে।' : 'Failed to fetch tracking information.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPod = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = podOtp.trim();
    const orderId = orderData?.id || shipmentData?.orderId;
    if (!cleanOtp || !orderId) {
      setErrorMsg(isBn ? 'ডেলিভারি OTP দিন।' : 'Delivery OTP is required.');
      return;
    }

    setIsPodSubmitting(true);
    setErrorMsg(null);

    try {
      const data = await logisticsOrderApiClient.submitPodOtp(orderId, {
        otp: cleanOtp,
        recipientName: recipientName.trim() || 'Verified Recipient',
      });
      if (data.success) {
        setPodSuccess(isBn ? 'ডেলিভারি সফলভাবে ভেরিফাই ও কনফার্ম হয়েছে!' : 'Delivery verified and confirmed successfully!');
        if (data.shipment) setShipmentData(data.shipment);
      } else {
        setErrorMsg(data.error || 'POD verification failed.');
      }
    } catch {
      setErrorMsg(isBn ? 'ডেলিভারি ভেরিফিকেশন ব্যর্থ হয়েছে।' : 'Delivery verification failed.');
    } finally {
      setIsPodSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--pm-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--pm-text)]">
                {isBn ? 'লাইভ কুরিয়ার ও ফ্লিট ট্র্যাকিং' : 'Live Courier & Fleet Tracking'}
              </h3>
              <p className="text-[11px] text-[var(--pm-muted)]">
                {isBn ? 'রিয়েল-টাইম চেকপয়েন্ট এবং OTP ভেরিফিকেশন' : 'Real-time waypoints & OTP proof-of-delivery'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close live tracking"
            className="w-9 h-9 rounded-full bg-[var(--pm-surface)] text-[var(--pm-muted)] hover:text-[var(--pm-text)] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 bg-[var(--pm-surface)] border-b border-[var(--pm-border)] shrink-0">
          <form onSubmit={handleFetchTracking} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pm-muted)]" />
              <input
                type="text"
                required
                value={trackingKey}
                onChange={(e) => setTrackingKey(e.target.value)}
                placeholder={isBn ? 'ট্র্যাকিং নম্বর বা অর্ডার আইডি দিন (যেমন: PKM-XXXXXX)' : 'Enter tracking # or Order ID (e.g. PKM-123456)'}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs font-mono font-bold border border-[var(--pm-border)] focus:border-[var(--pm-accent)] outline-none text-[var(--pm-text)]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{isBn ? 'ট্র্যাক করুন' : 'Track'}</span>
            </button>
          </form>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 flex items-center gap-2.5 text-[var(--pm-danger)] text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {podSuccess && (
            <div className="p-3 rounded-2xl bg-[var(--pm-success-soft)] border border-[var(--pm-success)]/30 flex items-center gap-2.5 text-[var(--pm-success)] text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{podSuccess}</span>
            </div>
          )}

          {!shipmentData && !isLoading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-muted)] flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-xs text-[var(--pm-muted)]">
                {isBn ? 'যেকোনো চালানের রিয়েল-টাইম অবস্থা দেখতে ওপরের বক্সে ট্র্যাকিং নম্বর লিখুন।' : 'Enter a waybill tracking number or order ID above to inspect live checkpoints and rider telemetry.'}
              </p>
            </div>
          )}

          {shipmentData && (
            <div className="space-y-4 animate-fade-in">
              {/* Waybill Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                      {shipmentData.courierPartner || 'PaikarForce Express'} · Waybill
                    </span>
                    <h4 className="text-base font-mono font-black mt-0.5 tracking-tight">
                      {shipmentData.trackingNumber}
                    </h4>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wide">
                    {shipmentData.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-blue-200 block">ETA</span>
                    <span className="font-mono font-bold text-white">{shipmentData.etaText || '35 mins'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-200 block">Distance Remaining</span>
                    <span className="font-mono font-bold text-white">{shipmentData.distanceRemaining || '4.2 km'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-200 block">Shipping Fee</span>
                    <span className="font-mono font-bold text-amber-300">৳{shipmentData.shippingFee ?? 60}</span>
                  </div>
                </div>
              </div>

              {/* Rider Telemetry & Contact */}
              {shipmentData.rider && (
                <div className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--pm-text)] truncate">{shipmentData.rider.name}</p>
                      <p className="text-[10px] text-[var(--pm-muted)] font-mono">
                        {shipmentData.rider.vehicleType.toUpperCase()} · ★ {shipmentData.rider.rating} ({shipmentData.rider.tripsCount} trips)
                      </p>
                    </div>
                  </div>
                  <a
                    href={`tel:${shipmentData.rider.phone}`}
                    className="px-3.5 py-2 rounded-xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Rider</span>
                  </a>
                </div>
              )}

              {/* 3-Step POD Verification Box (If not delivered) */}
              {shipmentData.status !== 'DELIVERED' && (
                <div className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--pm-success)]" />
                    <h5 className="text-xs font-bold text-[var(--pm-text)]">
                      {isBn ? '৩-ধাপের প্রুফ-অফ-ডেলিভারি (POD) ভেরিফিকেশন' : '3-Step Proof-of-Delivery (POD) Verification'}
                    </h5>
                  </div>
                  <form onSubmit={handleVerifyPod} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--pm-muted)] uppercase block mb-1">
                          {isBn ? 'ডেলিভারি ৪-সংখ্যার OTP' : 'Delivery 4-Digit OTP'}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={4}
                          value={podOtp}
                          onChange={(e) => setPodOtp(e.target.value)}
                          placeholder="1234"
                          className="w-full px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-mono font-bold tracking-widest text-center outline-none focus:border-[var(--pm-accent)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--pm-muted)] uppercase block mb-1">
                          {isBn ? 'প্রাপকের নাম' : 'Recipient Name'}
                        </label>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Alex Rivera"
                          className="w-full px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-bold outline-none focus:border-[var(--pm-accent)]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isPodSubmitting}
                      className="w-full py-2.5 rounded-xl bg-[var(--pm-success)] text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isPodSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{isBn ? 'ডেলিভারি কনফার্ম ও এসক্রো রিলিজ করুন' : 'Confirm Delivery & Release Escrow'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Waypoint Checkpoint Timeline */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-[var(--pm-muted)]">
                  {isBn ? 'কুরিয়ার ওয়ে পয়েন্ট চেকপয়েন্ট' : 'Courier Waypoint Checkpoints'}
                </p>
                <div className="space-y-2">
                  {Array.isArray(shipmentData.checkpoints) && shipmentData.checkpoints.map((cp: any, idx: number) => (
                    <div
                      key={cp.id || idx}
                      className="p-3 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-start gap-3"
                    >
                      <div className="w-3 h-3 rounded-full bg-[var(--pm-accent)] mt-1 shrink-0 ring-4 ring-[var(--pm-accent-soft)]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[var(--pm-text)] truncate">{cp.message}</p>
                          <span className="text-[10px] font-mono text-[var(--pm-muted)] shrink-0">{cp.time}</span>
                        </div>
                        <p className="text-[11px] text-[var(--pm-muted)] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{cp.location}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
