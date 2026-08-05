'use client';

import { useActionState, useState } from 'react';
import { GENDER_AVAILABILITY_OPTIONS } from '@masahepinas/config';
import { MapPicker, type MapPickerValue } from '@/components/MapPicker';
import { createSpaByAdmin, type AdminCreateResult } from './actions';

const initialState: AdminCreateResult = { error: null };

export function AdminCreateSpaForm() {
  const [state, formAction, isPending] = useActionState(createSpaByAdmin, initialState);
  const [location, setLocation] = useState<MapPickerValue | null>(null);
  const [address, setAddress] = useState({
    addressLine: '',
    cityMunicipality: '',
    province: '',
    region: '',
  });

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="businessName" className="text-sm text-foreground-secondary">
          Business name
        </label>
        <input id="businessName" name="businessName" required className="input-field" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm text-foreground-secondary">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={20}
          rows={3}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="contactNumber" className="text-sm text-foreground-secondary">
            Contact number
          </label>
          <input
            id="contactNumber"
            name="contactNumber"
            required
            placeholder="09XXXXXXXXX"
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="genderAvailability"
            className="text-sm text-foreground-secondary"
          >
            Therapist availability
          </label>
          <select
            id="genderAvailability"
            name="genderAvailability"
            className="input-field"
            defaultValue="no_preference"
          >
            {GENDER_AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="status" className="text-sm text-foreground-secondary">
          Status
        </label>
        <select
          id="status"
          name="status"
          className="input-field"
          defaultValue="unverified"
        >
          <option value="unverified">Unverified</option>
          <option value="verified">Verified</option>
          <option value="pending_review">Pending review</option>
        </select>
      </div>

      <MapPicker
        value={location}
        onChange={setLocation}
        onAddressSelect={(result) =>
          setAddress({
            addressLine: result.addressLine,
            cityMunicipality: result.cityMunicipality,
            province: result.province,
            region: result.region,
          })
        }
      />
      <input type="hidden" name="latitude" value={location?.latitude ?? ''} />
      <input type="hidden" name="longitude" value={location?.longitude ?? ''} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="addressLine" className="text-sm text-foreground-secondary">
            Street address
          </label>
          <input
            id="addressLine"
            name="addressLine"
            required
            value={address.addressLine}
            onChange={(e) => setAddress((p) => ({ ...p, addressLine: e.target.value }))}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cityMunicipality" className="text-sm text-foreground-secondary">
            City / Municipality
          </label>
          <input
            id="cityMunicipality"
            name="cityMunicipality"
            required
            value={address.cityMunicipality}
            onChange={(e) =>
              setAddress((p) => ({ ...p, cityMunicipality: e.target.value }))
            }
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="province" className="text-sm text-foreground-secondary">
            Province
          </label>
          <input
            id="province"
            name="province"
            required
            value={address.province}
            onChange={(e) => setAddress((p) => ({ ...p, province: e.target.value }))}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="region" className="text-sm text-foreground-secondary">
            Region
          </label>
          <input
            id="region"
            name="region"
            required
            value={address.region}
            onChange={(e) => setAddress((p) => ({ ...p, region: e.target.value }))}
            className="input-field"
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={isPending || !location}>
        {isPending ? 'Creating…' : 'Create listing'}
      </button>
    </form>
  );
}
