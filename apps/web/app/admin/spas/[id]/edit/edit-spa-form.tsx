'use client';

import { useActionState, useState } from 'react';
import { GENDER_AVAILABILITY_OPTIONS, PRICE_RANGE_OPTIONS } from '@masahepinas/config';
import type { AdminEditableListing } from '@/lib/admin';
import { MapPicker, type MapPickerValue } from '@/components/MapPicker';
import { updateSpaListing, type AdminEditResult } from './actions';

const initialState: AdminEditResult = { error: null };

export function EditSpaForm({ listing }: { listing: AdminEditableListing }) {
  const bound = updateSpaListing.bind(null, listing.id);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  // Raw text state for the number inputs (so a user can clear them to
  // mean "no coordinates"), plus a derived MapPickerValue for the map —
  // both directions (typing a number, or clicking the map) update the
  // same source of truth.
  const [latText, setLatText] = useState(listing.location?.latitude?.toString() ?? '');
  const [lngText, setLngText] = useState(listing.location?.longitude?.toString() ?? '');
  const location: MapPickerValue | null =
    latText.trim() !== '' &&
    lngText.trim() !== '' &&
    !Number.isNaN(Number(latText)) &&
    !Number.isNaN(Number(lngText))
      ? { latitude: Number(latText), longitude: Number(lngText) }
      : null;

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="businessName" className="text-sm text-foreground-secondary">
          Business name
        </label>
        <input
          id="businessName"
          name="businessName"
          required
          defaultValue={listing.businessName}
          className="input-field"
        />
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
          defaultValue={listing.description ?? ''}
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
            defaultValue={listing.contactNumber ?? ''}
            placeholder="09XXXXXXXXX"
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="bookingContactNumber"
            className="text-sm text-foreground-secondary"
          >
            Booking contact number
          </label>
          <input
            id="bookingContactNumber"
            name="bookingContactNumber"
            defaultValue={listing.bookingContactNumber ?? ''}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="websiteUrl" className="text-sm text-foreground-secondary">
            Website URL
          </label>
          <input
            id="websiteUrl"
            name="websiteUrl"
            defaultValue={listing.websiteUrl ?? ''}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="socialMediaUrl" className="text-sm text-foreground-secondary">
            Social media URL
          </label>
          <input
            id="socialMediaUrl"
            name="socialMediaUrl"
            defaultValue={listing.socialMediaUrl ?? ''}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="priceRange" className="text-sm text-foreground-secondary">
            Price range
          </label>
          <select
            id="priceRange"
            name="priceRange"
            className="input-field"
            defaultValue={listing.priceRange ?? ''}
          >
            <option value="">Not set</option>
            {PRICE_RANGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace('_', ' ')}
              </option>
            ))}
          </select>
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
            defaultValue={listing.genderAvailability}
          >
            {GENDER_AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="addressLine" className="text-sm text-foreground-secondary">
            Street address
          </label>
          <input
            id="addressLine"
            name="addressLine"
            required
            defaultValue={listing.location?.addressLine ?? ''}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="barangay" className="text-sm text-foreground-secondary">
            Barangay
          </label>
          <input
            id="barangay"
            name="barangay"
            defaultValue={listing.location?.barangay ?? ''}
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
            defaultValue={listing.location?.cityMunicipality ?? ''}
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
            defaultValue={listing.location?.province ?? ''}
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
            defaultValue={listing.location?.region ?? ''}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="postalCode" className="text-sm text-foreground-secondary">
            Postal code
          </label>
          <input
            id="postalCode"
            name="postalCode"
            defaultValue={listing.location?.postalCode ?? ''}
            className="input-field"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-foreground-secondary">
          Map pin (optional — a listing without one just won&apos;t show a map or appear
          in &quot;near me&quot; search).
        </p>
        <MapPicker
          value={location}
          onChange={(next) => {
            setLatText(String(next.latitude));
            setLngText(String(next.longitude));
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="latitude" className="text-sm text-foreground-secondary">
              Latitude
            </label>
            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              value={latText}
              onChange={(e) => setLatText(e.target.value)}
              placeholder="Leave blank for no pin"
              className="input-field"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="longitude" className="text-sm text-foreground-secondary">
              Longitude
            </label>
            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              value={lngText}
              onChange={(e) => setLngText(e.target.value)}
              placeholder="Leave blank for no pin"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-brand-accent">Saved.</p> : null}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
