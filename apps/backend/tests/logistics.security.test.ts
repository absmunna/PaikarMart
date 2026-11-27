import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrCreateShipment,
  canAccessShipmentOutboundPayload,
  canUpdateShipmentCheckpoint,
  canVerifyShipmentPodForProfile,
  toOrderOwnerShipmentRecord,
  toPublicShipmentRecord,
  verifyShipmentPod
} from '../modules/logistics/logisticsService.js';

test('public shipment projection excludes delivery OTP and POD receipt', () => {
  const shipment = getOrCreateShipment('security-projection-order');
  shipment.podReceipt = {
    verifiedAt: new Date().toISOString(),
    verifiedOtp: shipment.deliveryOtp,
    photoDataUrl: 'private-photo',
    signatureDataUrl: 'private-signature'
  };
  shipment.assignedCourierProfileId = 'courier-profile-id';

  const publicShipment = toPublicShipmentRecord(shipment);
  const ownerShipment = toOrderOwnerShipmentRecord(shipment);

  assert.equal('deliveryOtp' in publicShipment, false);
  assert.equal('podReceipt' in publicShipment, false);
  assert.equal('rider' in publicShipment, false);
  assert.equal('dropLocation' in publicShipment, false);
  assert.equal('assignedCourierProfileId' in publicShipment, false);
  assert.equal('assignedCourierProfileId' in ownerShipment, false);
  assert.equal(ownerShipment.deliveryOtp, shipment.deliveryOtp);
});

test('invalid POD verification does not disclose the expected OTP', async () => {
  const shipment = getOrCreateShipment('security-invalid-otp-order');
  const result = await verifyShipmentPod(shipment.orderId, { otp: 'not-the-otp' });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Invalid Delivery OTP.');
  assert.equal(result.error?.includes(shipment.deliveryOtp), false);
});

test('POD authorization is limited to order owner, assigned courier, or privileged staff', () => {
  assert.equal(canVerifyShipmentPodForProfile('buyer-1', 'buyer-1', 'courier-1', false), true);
  assert.equal(canVerifyShipmentPodForProfile('courier-1', 'buyer-1', 'courier-1', false), true);
  assert.equal(canVerifyShipmentPodForProfile('other-user', 'buyer-1', 'courier-1', false), false);
  assert.equal(canVerifyShipmentPodForProfile(undefined, 'buyer-1', undefined, true), true);
});

test('outbound courier payload is limited to assigned courier or privileged staff', () => {
  assert.equal(canAccessShipmentOutboundPayload('courier-1', 'courier-1', false), true);
  assert.equal(canAccessShipmentOutboundPayload('buyer-1', 'courier-1', false), false);
  assert.equal(canAccessShipmentOutboundPayload(undefined, undefined, false), false);
  assert.equal(canAccessShipmentOutboundPayload(undefined, undefined, true), true);
});

test('shipment checkpoint updates are limited to assigned courier or privileged staff', () => {
  assert.equal(canUpdateShipmentCheckpoint('courier-1', 'courier-1', false), true);
  assert.equal(canUpdateShipmentCheckpoint('other-user', 'courier-1', false), false);
  assert.equal(canUpdateShipmentCheckpoint(undefined, undefined, false), false);
  assert.equal(canUpdateShipmentCheckpoint(undefined, undefined, true), true);
});
