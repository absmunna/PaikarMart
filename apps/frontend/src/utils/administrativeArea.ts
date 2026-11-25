import { BANGLADESH_DISTRICTS, BANGLADESH_DIVISIONS } from '../data/bangladeshLocations';
import type { AdministrativeArea, CommerceItem } from '@/types';

const normalize = (value: string | undefined) =>
  value?.trim().toLocaleLowerCase().replace(/[.,'’()-]/g, '').replace(/\s+/g, ' ') ?? '';

const areaFields: Array<keyof AdministrativeArea> = [
  'division',
  'district',
  'upazila',
  'thana',
  'postalCode',
];

export function normalizeAdministrativeArea(area?: AdministrativeArea): AdministrativeArea | undefined {
  if (!area) return undefined;

  const normalized: AdministrativeArea = {};
  for (const field of areaFields) {
    const value = area[field]?.trim();
    if (value) normalized[field] = value;
  }

  const district = normalized.district && BANGLADESH_DISTRICTS.find(
    (entry) =>
      normalize(entry.nameEn) === normalize(normalized.district) ||
      normalize(entry.nameBn) === normalize(normalized.district),
  );
  if (district) {
    normalized.district = district.nameEn;
    const division = BANGLADESH_DIVISIONS.find((entry) => entry.id === district.divisionId);
    if (!normalized.division && division) normalized.division = division.nameEn;
  }

  const division = normalized.division && BANGLADESH_DIVISIONS.find(
    (entry) =>
      normalize(entry.nameEn) === normalize(normalized.division) ||
      normalize(entry.nameBn.replace(' বিভাগ', '')) === normalize(normalized.division),
  );
  if (division) normalized.division = division.nameEn;

  return Object.keys(normalized).length ? normalized : undefined;
}

export function matchesAdministrativeArea(
  userArea?: AdministrativeArea,
  providerArea?: AdministrativeArea,
): boolean {
  const user = normalizeAdministrativeArea(userArea);
  const provider = normalizeAdministrativeArea(providerArea);
  if (!user || !provider) return false;

  const comparedFields: Array<keyof AdministrativeArea> = [
    'division',
    'district',
    'upazila',
    'thana',
    'postalCode',
  ];
  let hasSharedArea = false;

  for (const field of comparedFields) {
    const userValue = normalize(user[field]);
    const providerValue = normalize(provider[field]);
    if (!userValue || !providerValue) continue;

    hasSharedArea = true;
    if (userValue !== providerValue) return false;
  }

  return hasSharedArea;
}

export function formatAdministrativeArea(area?: AdministrativeArea, isBn = false): string {
  const normalized = normalizeAdministrativeArea(area);
  if (!normalized) return '';

  const district = BANGLADESH_DISTRICTS.find(
    (entry) => normalize(entry.nameEn) === normalize(normalized.district),
  );
  const division = BANGLADESH_DIVISIONS.find(
    (entry) => normalize(entry.nameEn) === normalize(normalized.division),
  );
  return [
    normalized.upazila || normalized.thana,
    isBn ? district?.nameBn || normalized.district : normalized.district,
    isBn ? division?.nameBn.replace(/ বিভাগ$/, '') || normalized.division : normalized.division,
  ]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(', ');
}

export function inferAdministrativeAreaFromLabel(label: string): AdministrativeArea | undefined {
  const search = normalize(label);
  const district = BANGLADESH_DISTRICTS.find(
    (entry) => search.includes(normalize(entry.nameEn)) || search.includes(normalize(entry.nameBn)),
  );
  if (district) return normalizeAdministrativeArea({ district: district.nameEn });

  const division = BANGLADESH_DIVISIONS.find(
    (entry) => search.includes(normalize(entry.nameEn)) || search.includes(normalize(entry.nameBn)),
  );
  return division ? { division: division.nameEn } : undefined;
}

export function getListingAdministrativeArea(item: CommerceItem): AdministrativeArea | undefined {
  return (
    normalizeAdministrativeArea(item.serviceArea) ??
    inferAdministrativeAreaFromLabel(item.storeAddress || item.restaurantAddress || item.storeName)
  );
}
