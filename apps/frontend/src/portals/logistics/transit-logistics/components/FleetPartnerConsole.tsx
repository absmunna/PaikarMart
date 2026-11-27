import React, { useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  X,
  ShieldCheck,
  Power,
  CheckCircle2,
  RotateCcw,
  KeyRound,
  Lock
} from 'lucide-react';
import { User } from '@/types';
import { LogisticsVehicleClass, useLogisticsStore } from '@/features/logistics';
import type { CourierPartner } from '@/features/logistics';

interface FleetPartnerConsoleProps {
  currentUser?: User;
}

export const FleetPartnerConsole: React.FC<FleetPartnerConsoleProps> = ({ currentUser }) => {
  const {
    fleetVehicles,
    shipments,
    dispatches,
    returns,
    fetchFleetAndDispatches,
    registerFleetVehicle,
    toggleVehicleOnline,
    assignCourierPartner,
    verifyShipmentPod
  } = useLogisticsStore();

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState<LogisticsVehicleClass>('bike');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState('Up to 25 kg parcel');
  const [driverName, setDriverName] = useState(currentUser?.name || '');
  const [driverPhone, setDriverPhone] = useState('');
  const [currentArea, setCurrentArea] = useState('');

  const [podOrderId, setPodOrderId] = useState('');
  const [podOtp, setPodOtp] = useState('');
  const [podMessage, setPodMessage] = useState<string | null>(null);
  const [courierUids, setCourierUids] = useState<Record<string, string>>({});
  const [assignmentOrderId, setAssignmentOrderId] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    void fetchFleetAndDispatches();
  }, [fetchFleetAndDispatches]);

  const hasPartnerAccess = Boolean(
    currentUser?.vendorProfile ||
      currentUser?.isVendor ||
      currentUser?.role === 'vendor' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super_admin'
  );
  const canAssignCourier =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const shipmentList = Object.values(shipments);
  const activeShipments = shipmentList.filter((s) => s.status !== 'DELIVERED');

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !licensePlate.trim() || !driverName.trim()) return;
    await registerFleetVehicle({
      type: vehicleType,
      model: model.trim(),
      licensePlate: licensePlate.trim(),
      capacity: capacity.trim(),
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      currentArea: currentArea.trim()
    });
    setModel('');
    setIsRegisterOpen(false);
  };

  const handleConsolePodVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podOrderId.trim() || !podOtp.trim()) return;
    const res = await verifyShipmentPod(podOrderId.trim(), {
      otp: podOtp.trim(),
      recipientName: 'Partner App Verification',
      photoDataUrl: 'pod://fleet-console-photo',
      signatureDataUrl: 'pod://fleet-console-sig'
    });
    setPodMessage(res.ok ? `POD verified for ${podOrderId}` : res.error || 'OTP mismatch');
    if (res.ok) {
      setPodOtp('');
      setPodOrderId('');
    }
  };

  const handleCourierAssignment = async (
    e: React.FormEvent,
    orderId: string,
    partner: CourierPartner
  ) => {
    e.preventDefault();
    const assignedCourierUid = courierUids[orderId]?.trim();
    if (!assignedCourierUid) return;

    setAssignmentOrderId(orderId);
    setAssignmentMessage(null);
    try {
      await assignCourierPartner(orderId, partner, assignedCourierUid);
      setCourierUids((current) => ({ ...current, [orderId]: '' }));
      setAssignmentMessage({ type: 'success', text: `Courier assigned to ${orderId}.` });
    } catch (error) {
      setAssignmentMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Courier assignment could not be saved.'
      });
    } finally {
      setAssignmentOrderId(null);
    }
  };

  if (!hasPartnerAccess) {
    return (
      <div className="p-8 rounded-[2rem] bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--pm-accent-soft)] border border-[var(--pm-accent-border)] flex items-center justify-center text-[var(--pm-accent)]">
          <Lock className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-lg font-bold text-[var(--pm-text)]">
            Fleet & Rider Partner Verification Required
          </h3>
          <p className="text-xs text-[var(--pm-muted)] leading-relaxed">
            The Driver & Fleet Partner Console is role-gated to verified commercial merchants, courier partners, and fleet operators. Activate your Vendor / Partner profile in Seller Central to register vehicles and accept dispatches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Register Trigger */}
      <div className="p-5 sm:p-6 rounded-[2rem] bg-[var(--pm-card)] border border-[var(--pm-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--pm-text)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--pm-success)]" />
            <span>Fleet & Rider Partner Console</span>
          </h2>
          <p className="text-xs text-[var(--pm-muted)] mt-0.5">
            {fleetVehicles.filter((v) => v.isOnline).length} online · {fleetVehicles.length} registered vehicles · {activeShipments.length} open shipments
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap active-scale cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Vehicle</span>
        </button>
      </div>

      {/* Vehicle Registry & Online GPS Toggle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fleetVehicles.length === 0 ? (
          <div
            role="status"
            className="md:col-span-2 flex items-center gap-3 p-5 rounded-2xl bg-[var(--pm-card)] border border-dashed border-[var(--pm-border-strong)]"
          >
            <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--pm-text)]">No vehicles registered</h3>
              <p className="text-xs text-[var(--pm-muted)] mt-0.5">
                Register a vehicle to manage its availability and dispatches here.
              </p>
            </div>
          </div>
        ) : fleetVehicles.map((veh) => (
          <div
            key={veh.id}
            className="p-4 sm:p-5 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-start justify-between gap-4"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-[var(--pm-muted)] font-mono">
                <span className="font-bold text-[var(--pm-text)]">{veh.licensePlate}</span>
                <span aria-hidden="true">·</span>
                <span className={veh.isOnline ? 'text-[var(--pm-success)] font-bold' : 'text-[var(--pm-muted)]'}>
                  {veh.isOnline ? 'GPS Online' : 'Offline'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[var(--pm-text)] truncate">{veh.model}</h3>
              <p className="text-xs text-[var(--pm-muted)] truncate">
                {veh.driverName} · {veh.currentArea} · {veh.capacity}
              </p>
              <p className="text-xs font-mono tabular-nums font-bold text-[var(--pm-accent)]">
                Base ৳{veh.baseFareBdt} · ৳{veh.perKmBdt}/km
              </p>
            </div>

            <button
              type="button"
              onClick={() => void toggleVehicleOnline(veh.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer active-scale transition-colors ${
                veh.isOnline
                  ? 'bg-[var(--pm-success-soft)] text-[var(--pm-success)] border border-[var(--pm-success)]/30'
                  : 'bg-[var(--pm-surface)] text-[var(--pm-muted)] border border-[var(--pm-border)] hover:text-[var(--pm-text)]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{veh.isOnline ? 'Online' : 'Go Live'}</span>
            </button>
          </div>
        ))}
      </div>

      {/* 2-Column Operations: Quick POD Pad + Active Returns/Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form
          onSubmit={(e) => void handleConsolePodVerify(e)}
          className="lg:col-span-5 p-5 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] space-y-3.5"
        >
          <h3 className="text-sm font-bold text-[var(--pm-text)] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[var(--pm-success)]" />
            <span>Rider POD & OTP Settlement</span>
          </h3>
          <p className="text-xs text-[var(--pm-muted)]">
            Verify recipient 4-digit delivery OTP to mark shipment delivered and release held escrow.
          </p>

          {podMessage && (
            <div className="p-2.5 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-xs font-bold text-[var(--pm-text)]">
              {podMessage}
            </div>
          )}

          <input
            type="text"
            required
            value={podOrderId}
            onChange={(e) => setPodOrderId(e.target.value)}
            placeholder="Order ID (e.g. ORD-9021)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs font-mono text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
          />
          <input
            type="text"
            required
            maxLength={4}
            value={podOtp}
            onChange={(e) => setPodOtp(e.target.value)}
            placeholder="4-digit Delivery OTP"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs font-mono font-bold text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[var(--pm-success)] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active-scale"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Verify POD & Complete Handover</span>
          </button>
        </form>

        <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--pm-text)] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[var(--pm-accent)]" />
              <span>Active Queue & Reverse Returns</span>
            </h3>
            <span className="text-xs font-mono text-[var(--pm-muted)]">
              {dispatches.length} trips · {returns.length} returns
            </span>
          </div>

          {assignmentMessage && (
            <p
              role={assignmentMessage.type === 'error' ? 'alert' : 'status'}
              className={`text-xs ${
                assignmentMessage.type === 'error'
                  ? 'text-[var(--pm-danger)]'
                  : 'text-[var(--pm-success)]'
              }`}
            >
              {assignmentMessage.text}
            </p>
          )}

          {activeShipments.length === 0 && returns.length === 0 ? (
            <p className="text-xs text-[var(--pm-muted)] py-6 text-center">
              No pending deliveries or reverse pickups queued right now. Open any order in Orders Hub to dispatch a waybill.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {activeShipments.map((shp) => (
                <div
                  key={shp.id}
                  className="p-3 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3"
                >
                  <button
                    type="button"
                    onClick={() => setPodOrderId(shp.orderId)}
                    className="w-full flex items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-mono font-bold text-[var(--pm-text)] truncate">
                        {shp.orderId} · {shp.trackingNumber}
                      </span>
                      <span className="block text-[11px] text-[var(--pm-muted)] truncate">
                        {shp.dropLocation}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-[var(--pm-accent)] shrink-0">
                      {shp.status.replace(/_/g, ' ')}
                    </span>
                  </button>

                  {canAssignCourier && (
                    <form
                      onSubmit={(event) =>
                        void handleCourierAssignment(event, shp.orderId, shp.courierPartner)
                      }
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <label className="sr-only" htmlFor={`courier-uid-${shp.id}`}>
                        Courier Firebase account UID for order {shp.orderId}
                      </label>
                      <input
                        id={`courier-uid-${shp.id}`}
                        type="text"
                        value={courierUids[shp.orderId] || ''}
                        onChange={(event) =>
                          setCourierUids((current) => ({
                            ...current,
                            [shp.orderId]: event.target.value
                          }))
                        }
                        maxLength={128}
                        placeholder="Courier Firebase account UID"
                        className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-[var(--pm-input)] text-xs font-mono text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
                      />
                      <button
                        type="submit"
                        disabled={!courierUids[shp.orderId]?.trim() || assignmentOrderId === shp.orderId}
                        className="px-3 py-2 rounded-lg bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assignmentOrderId === shp.orderId ? 'Assigning...' : 'Assign courier'}
                      </button>
                    </form>
                  )}
                </div>
              ))}

              {returns.map((rtn) => (
                <div
                  key={rtn.id}
                  className="p-3 rounded-xl bg-[var(--pm-warning-soft)] border border-[var(--pm-warning)]/30 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-bold text-[var(--pm-warning)] flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>{rtn.returnWaybill} · Order {rtn.orderId}</span>
                    </p>
                    <p className="text-[11px] text-[var(--pm-warning)]/80 truncate">{rtn.reason}</p>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--pm-warning)] shrink-0">
                    {rtn.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Register New Vehicle (Replaces legacy window.prompt) */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fleet-register-title"
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-3xl bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] p-5 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--pm-border)] pb-3">
              <h3 id="fleet-register-title" className="text-base font-bold text-[var(--pm-text)]">
                Register Fleet Vehicle
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="p-1.5 rounded-full text-[var(--pm-muted)] hover:bg-[var(--pm-card-hover)] cursor-pointer"
                aria-label="Close vehicle registration"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleRegisterVehicle(e)} className="space-y-3">
              <div>
                <label htmlFor="fleet-vehicle-class" className="block text-xs font-bold text-[var(--pm-muted)] mb-1">
                  Vehicle Class
                </label>
                <select
                  id="fleet-vehicle-class"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as LogisticsVehicleClass)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs font-bold text-[var(--pm-text)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
                >
                  <option value="bike">Express Moto Bike</option>
                  <option value="parcel">Parcel Delivery Van</option>
                  <option value="cng">City CNG Auto</option>
                  <option value="car">Sedan Car</option>
                  <option value="pickup">1-Ton Pickup</option>
                  <option value="truck">Covered Freight Truck</option>
                </select>
              </div>

              <div>
                <label htmlFor="fleet-vehicle-model" className="block text-xs font-bold text-[var(--pm-muted)] mb-1">
                  Vehicle model
                </label>
                <input
                  id="fleet-vehicle-model"
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Yamaha FZ-S"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
                />
              </div>
              <div>
                <label htmlFor="fleet-license-plate" className="block text-xs font-bold text-[var(--pm-muted)] mb-1">
                  License plate
                </label>
                <input
                  id="fleet-license-plate"
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="e.g. DHAKA METRO-HA 55-2201"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs font-mono text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="fleet-driver-name" className="block text-xs font-bold text-[var(--pm-muted)] mb-1">
                    Driver name
                  </label>
                  <input
                    id="fleet-driver-name"
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
                  />
                </div>
                <div>
                  <label htmlFor="fleet-driver-phone" className="block text-xs font-bold text-[var(--pm-muted)] mb-1">
                    Driver phone
                  </label>
                  <input
                    id="fleet-driver-phone"
                    type="tel"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="+8801XXXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs font-mono text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="fleet-operating-area" className="block text-xs font-bold text-[var(--pm-muted)] mb-1">
                  Base operating area
                </label>
                <input
                  id="fleet-operating-area"
                  type="text"
                  value={currentArea}
                  onChange={(e) => setCurrentArea(e.target.value)}
                  placeholder="e.g. Tejgaon, Dhaka"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
                />
              </div>
              <div>
                <label htmlFor="fleet-capacity" className="block text-xs font-bold text-[var(--pm-muted)] mb-1">
                  Payload capacity
                </label>
                <input
                  id="fleet-capacity"
                  type="text"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. Up to 25 kg"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--pm-muted)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold cursor-pointer active-scale transition-colors"
                >
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
