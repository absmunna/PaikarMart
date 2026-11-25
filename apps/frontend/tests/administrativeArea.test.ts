import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatAdministrativeArea,
  matchesAdministrativeArea,
  normalizeAdministrativeArea,
} from '../src/utils/administrativeArea';

test('a district-wide provider serves a user in a more specific upazila', () => {
  assert.equal(
    matchesAdministrativeArea(
      { division: 'Dhaka', district: 'Dhaka', upazila: 'Savar' },
      { division: 'Dhaka', district: 'Dhaka' },
    ),
    true,
  );
});

test('providers in a conflicting district are excluded', () => {
  assert.equal(
    matchesAdministrativeArea(
      { division: 'Dhaka', district: 'Dhaka' },
      { division: 'Dhaka', district: 'Gazipur' },
    ),
    false,
  );
});

test('Bangla district labels normalize to their canonical division and district', () => {
  assert.deepEqual(normalizeAdministrativeArea({ district: 'চট্টগ্রাম' }), {
    division: 'Chattogram',
    district: 'Chattogram',
  });
});

test('an unknown provider area does not match an address', () => {
  assert.equal(matchesAdministrativeArea({ division: 'Dhaka', district: 'Dhaka' }, undefined), false);
});

test('area labels use Bangla district and division names when requested', () => {
  assert.equal(
    formatAdministrativeArea({ district: 'Chattogram', division: 'Chattogram' }, true),
    'চট্টগ্রাম',
  );
});
