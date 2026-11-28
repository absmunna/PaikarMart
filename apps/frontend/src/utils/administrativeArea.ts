export interface AdministrativeArea {
  division?: string;
  district?: string;
  upazila?: string;
  union?: string;
}

const BANGLA_MAP: Record<string, { division: string; district: string }> = {
  'ঢাকা': { division: 'Dhaka', district: 'Dhaka' },
  'চট্টগ্রাম': { division: 'Chattogram', district: 'Chattogram' },
  'সিলেট': { division: 'Sylhet', district: 'Sylhet' },
  'রাজশাহী': { division: 'Rajshahi', district: 'Rajshahi' },
  'খুলনা': { division: 'Khulna', district: 'Khulna' },
  'বরিশাল': { division: 'Barishal', district: 'Barishal' },
  'রংপুর': { division: 'Rangpur', district: 'Rangpur' },
  'ময়মনসিংহ': { division: 'Mymensingh', district: 'Mymensingh' },
};

export function normalizeAdministrativeArea(area?: AdministrativeArea | null): AdministrativeArea {
  if (!area) return {};
  let division = area.division;
  let district = area.district;
  let upazila = area.upazila;
  let union = area.union;

  if (district && BANGLA_MAP[district]) {
    division = BANGLA_MAP[district].division;
    district = BANGLA_MAP[district].district;
  }
  if (division && BANGLA_MAP[division]) {
    division = BANGLA_MAP[division].division;
  }

  const result: AdministrativeArea = {};
  if (division) result.division = division;
  if (district) result.district = district;
  if (upazila) result.upazila = upazila;
  if (union) result.union = union;
  return result;
}

export function matchesAdministrativeArea(
  userArea?: AdministrativeArea | null,
  listingArea?: AdministrativeArea | null
): boolean {
  if (!userArea || !listingArea) return false;
  const u = normalizeAdministrativeArea(userArea);
  const l = normalizeAdministrativeArea(listingArea);

  if (!l.division && !l.district) return false;

  if (l.division && u.division && l.division.toLowerCase() !== u.division.toLowerCase()) {
    return false;
  }
  if (l.district && u.district && l.district.toLowerCase() !== u.district.toLowerCase()) {
    return false;
  }
  if (l.upazila && u.upazila && l.upazila.toLowerCase() !== u.upazila.toLowerCase()) {
    return false;
  }

  return true;
}

export function getListingAdministrativeArea(item: any): AdministrativeArea {
  if (item?.serviceArea) return item.serviceArea;
  if (item?.store?.serviceArea) return item.store.serviceArea;
  return { division: 'Dhaka', district: 'Dhaka' };
}

export function formatAdministrativeArea(area?: AdministrativeArea | null, useBangla = false): string {
  if (!area) return '';
  const u = normalizeAdministrativeArea(area);
  const district = u.district || u.division || '';
  if (useBangla) {
    const revMap: Record<string, string> = {
      'Dhaka': 'ঢাকা',
      'Chattogram': 'চট্টগ্রাম',
      'Sylhet': 'সিলেট',
      'Rajshahi': 'রাজশাহী',
      'Khulna': 'খুলনা',
      'Barishal': 'বরিশাল',
      'Rangpur': 'রংপুর',
      'Mymensingh': 'ময়মনসিংহ',
    };
    return revMap[district] || district;
  }
  return district;
}

export function inferAdministrativeAreaFromLabel(label: string): AdministrativeArea {
  if (!label) return { division: 'Dhaka', district: 'Dhaka' };
  const lower = label.toLowerCase();
  for (const [bn, en] of Object.entries(BANGLA_MAP)) {
    if (label.includes(bn) || lower.includes(en.district.toLowerCase())) {
      return en;
    }
  }
  return { division: 'Dhaka', district: 'Dhaka' };
}
