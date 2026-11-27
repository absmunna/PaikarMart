import React from 'react';
import { BANGLADESH_DISTRICTS, BANGLADESH_DIVISIONS } from '@/data/bangladeshLocations';
import { FormInput, FormSelect } from '@/components/shared/FormControls';
import type { AdministrativeArea } from '@/types';

interface AdministrativeAreaFieldsProps {
  value: AdministrativeArea;
  onChange: (value: AdministrativeArea) => void;
  isBn?: boolean;
}

const fieldClassName =
  'w-full bg-[var(--pm-surface)] px-3 py-2.5 text-sm text-[var(--pm-text)]';

export const AdministrativeAreaFields: React.FC<AdministrativeAreaFieldsProps> = ({
  value,
  onChange,
  isBn = false,
}) => {
  const division = BANGLADESH_DIVISIONS.find((item) => item.nameEn === value.division);
  const districts = BANGLADESH_DISTRICTS.filter((item) => !division || item.divisionId === division.id);
  const update = (patch: Partial<AdministrativeArea>) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="space-y-1.5 text-sm font-medium text-[var(--pm-text)]">
        <span>{isBn ? 'বিভাগ' : 'Division'}</span>
        <FormSelect
          className={fieldClassName}
          value={division?.id ?? ''}
          onChange={(event) => {
            const selected = BANGLADESH_DIVISIONS.find((item) => item.id === event.target.value);
            onChange({
              ...value,
              division: selected?.nameEn,
              district: undefined,
              upazila: undefined,
              thana: undefined,
            });
          }}
        >
          <option value="">{isBn ? 'বিভাগ বাছাই করুন' : 'Select division'}</option>
          {BANGLADESH_DIVISIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {isBn ? item.nameBn : item.nameEn}
            </option>
          ))}
        </FormSelect>
      </label>

      <label className="space-y-1.5 text-sm font-medium text-[var(--pm-text)]">
        <span>{isBn ? 'জেলা' : 'District'}</span>
        <FormSelect
          className={fieldClassName}
          value={BANGLADESH_DISTRICTS.find((item) => item.nameEn === value.district)?.id ?? ''}
          onChange={(event) => {
            const selected = BANGLADESH_DISTRICTS.find((item) => item.id === event.target.value);
            const selectedDivision = BANGLADESH_DIVISIONS.find((item) => item.id === selected?.divisionId);
            onChange({
              ...value,
              division: selectedDivision?.nameEn ?? value.division,
              district: selected?.nameEn,
            });
          }}
        >
          <option value="">{isBn ? 'জেলা বাছাই করুন' : 'Select district'}</option>
          {districts.map((item) => (
            <option key={item.id} value={item.id}>
              {isBn ? item.nameBn : item.nameEn}
            </option>
          ))}
        </FormSelect>
      </label>

      <label className="space-y-1.5 text-sm font-medium text-[var(--pm-text)]">
        <span>{isBn ? 'উপজেলা' : 'Upazila'}</span>
        <FormInput
          className={fieldClassName}
          value={value.upazila ?? ''}
          onChange={(event) => update({ upazila: event.target.value || undefined, thana: undefined })}
          placeholder={isBn ? 'উপজেলার নাম' : 'Upazila name'}
          autoComplete="address-level3"
        />
      </label>

      <label className="space-y-1.5 text-sm font-medium text-[var(--pm-text)]">
        <span>{isBn ? 'থানা' : 'Thana'}</span>
        <FormInput
          className={fieldClassName}
          value={value.thana ?? ''}
          onChange={(event) => update({ thana: event.target.value || undefined })}
          placeholder={isBn ? 'থানার নাম' : 'Thana name'}
          autoComplete="address-level3"
        />
      </label>

      <label className="space-y-1.5 text-sm font-medium text-[var(--pm-text)] sm:col-span-2">
        <span>{isBn ? 'পোস্ট কোড' : 'Postal code'}</span>
        <FormInput
          className={fieldClassName}
          value={value.postalCode ?? ''}
          onChange={(event) => update({ postalCode: event.target.value || undefined })}
          placeholder={isBn ? 'পোস্ট কোড' : 'Postal code'}
          autoComplete="postal-code"
          inputMode="numeric"
        />
      </label>
    </div>
  );
};
