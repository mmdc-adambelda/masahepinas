'use client';

import { useActionState, useState } from 'react';
import {
  DAY_NAMES,
  type ServiceCategory,
  type SpaBusinessWithDetails,
} from '@masahepinas/types';
import { GENDER_AVAILABILITY_OPTIONS, PRICE_RANGE_OPTIONS } from '@masahepinas/config';
import { MapPicker, type MapPickerValue } from '@/components/MapPicker';
import { saveSpaDetails, type SaveResult } from './actions';

interface HourState {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

const initialState: SaveResult = { error: null };

function defaultHours(existing: SpaBusinessWithDetails['hours']): HourState[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const found = existing.find((h) => h.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      isClosed: found?.isClosed ?? false,
      openTime: found?.openTime?.slice(0, 5) ?? '09:00',
      closeTime: found?.closeTime?.slice(0, 5) ?? '20:00',
    };
  });
}

export function SubmitSpaForm({
  business,
  categories,
}: {
  business: SpaBusinessWithDetails;
  categories: ServiceCategory[];
}) {
  const saveWithId = saveSpaDetails.bind(null, business.id);
  const [state, formAction, isPending] = useActionState(saveWithId, initialState);

  const [location, setLocation] = useState<MapPickerValue | null>(
    business.location?.latitude != null && business.location?.longitude != null
      ? { latitude: business.location.latitude, longitude: business.location.longitude }
      : null,
  );
  const [addressFields, setAddressFields] = useState({
    addressLine: business.location?.addressLine ?? '',
    barangay: business.location?.barangay ?? '',
    cityMunicipality: business.location?.cityMunicipality ?? '',
    province: business.location?.province ?? '',
    region: business.location?.region ?? '',
    postalCode: business.location?.postalCode ?? '',
  });
  const [hours, setHours] = useState<HourState[]>(defaultHours(business.hours));
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>(
    Object.fromEntries(business.services.map((s) => [s.serviceCategoryId, true])),
  );
  const [featuredServices, setFeaturedServices] = useState<Record<string, boolean>>(
    Object.fromEntries(
      business.services
        .filter((s) => s.isFeatured)
        .map((s) => [s.serviceCategoryId, true]),
    ),
  );

  function toggleService(id: string) {
    setSelectedServices((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleFeatured(id: string) {
    setFeaturedServices((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function updateHour(dayOfWeek: number, patch: Partial<HourState>) {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h)),
    );
  }

  const servicesPayload = Object.entries(selectedServices)
    .filter(([, checked]) => checked)
    .map(([serviceCategoryId]) => ({
      serviceCategoryId,
      isFeatured: Boolean(featuredServices[serviceCategoryId]),
    }));

  return (
    <form action={formAction} className="space-y-10">
      {/* Business details */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Business details</h2>

        <div className="space-y-1.5">
          <label htmlFor="businessName" className="text-sm text-foreground-secondary">
            Business name
          </label>
          <input
            id="businessName"
            name="businessName"
            defaultValue={business.businessName}
            required
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
            defaultValue={business.description ?? ''}
            required
            minLength={20}
            rows={4}
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
              defaultValue={business.contactNumber ?? ''}
              required
              placeholder="09XXXXXXXXX"
              className="input-field"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="bookingContactNumber"
              className="text-sm text-foreground-secondary"
            >
              Booking number (optional)
            </label>
            <input
              id="bookingContactNumber"
              name="bookingContactNumber"
              defaultValue={business.bookingContactNumber ?? ''}
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="websiteUrl" className="text-sm text-foreground-secondary">
              Website (optional)
            </label>
            <input
              id="websiteUrl"
              name="websiteUrl"
              defaultValue={business.websiteUrl ?? ''}
              className="input-field"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="socialMediaUrl" className="text-sm text-foreground-secondary">
              Facebook/social link (optional)
            </label>
            <input
              id="socialMediaUrl"
              name="socialMediaUrl"
              defaultValue={business.socialMediaUrl ?? ''}
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="priceRange" className="text-sm text-foreground-secondary">
              Price range
            </label>
            <select
              id="priceRange"
              name="priceRange"
              defaultValue={business.priceRange ?? ''}
              className="input-field"
            >
              <option value="">Not specified</option>
              {PRICE_RANGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
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
              defaultValue={business.genderAvailability}
              className="input-field"
            >
              {GENDER_AVAILABILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Location</h2>
        <MapPicker
          value={location}
          onChange={setLocation}
          onAddressSelect={(result) =>
            setAddressFields({
              addressLine: result.addressLine,
              barangay: result.barangay ?? '',
              cityMunicipality: result.cityMunicipality,
              province: result.province,
              region: result.region,
              postalCode: result.postalCode ?? '',
            })
          }
        />
        <input type="hidden" name="latitude" value={location?.latitude ?? ''} />
        <input type="hidden" name="longitude" value={location?.longitude ?? ''} />

        <div className="space-y-1.5">
          <label htmlFor="addressLine" className="text-sm text-foreground-secondary">
            Street address
          </label>
          <input
            id="addressLine"
            name="addressLine"
            required
            value={addressFields.addressLine}
            onChange={(e) =>
              setAddressFields((p) => ({ ...p, addressLine: e.target.value }))
            }
            className="input-field"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="barangay" className="text-sm text-foreground-secondary">
              Barangay (optional)
            </label>
            <input
              id="barangay"
              name="barangay"
              value={addressFields.barangay}
              onChange={(e) =>
                setAddressFields((p) => ({ ...p, barangay: e.target.value }))
              }
              className="input-field"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="cityMunicipality"
              className="text-sm text-foreground-secondary"
            >
              City / Municipality
            </label>
            <input
              id="cityMunicipality"
              name="cityMunicipality"
              required
              value={addressFields.cityMunicipality}
              onChange={(e) =>
                setAddressFields((p) => ({ ...p, cityMunicipality: e.target.value }))
              }
              className="input-field"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="province" className="text-sm text-foreground-secondary">
              Province
            </label>
            <input
              id="province"
              name="province"
              required
              value={addressFields.province}
              onChange={(e) =>
                setAddressFields((p) => ({ ...p, province: e.target.value }))
              }
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
              value={addressFields.region}
              onChange={(e) =>
                setAddressFields((p) => ({ ...p, region: e.target.value }))
              }
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
              value={addressFields.postalCode}
              onChange={(e) =>
                setAddressFields((p) => ({ ...p, postalCode: e.target.value }))
              }
              className="input-field"
            />
          </div>
        </div>
      </section>

      {/* Hours */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Operating hours</h2>
        <input type="hidden" name="hours" value={JSON.stringify(hours)} />
        <div className="space-y-2">
          {hours.map((hour) => (
            <div key={hour.dayOfWeek} className="flex items-center gap-3">
              <span className="w-24 text-sm text-foreground-secondary">
                {DAY_NAMES[hour.dayOfWeek]}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                <input
                  type="checkbox"
                  checked={hour.isClosed}
                  onChange={(e) =>
                    updateHour(hour.dayOfWeek, { isClosed: e.target.checked })
                  }
                />
                Closed
              </label>
              {!hour.isClosed ? (
                <>
                  <input
                    type="time"
                    value={hour.openTime}
                    onChange={(e) =>
                      updateHour(hour.dayOfWeek, { openTime: e.target.value })
                    }
                    className="input-field w-32"
                  />
                  <span className="text-foreground-secondary">to</span>
                  <input
                    type="time"
                    value={hour.closeTime}
                    onChange={(e) =>
                      updateHour(hour.dayOfWeek, { closeTime: e.target.value })
                    }
                    className="input-field w-32"
                  />
                </>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Services</h2>
        <p className="text-sm text-foreground-secondary">
          Select what you offer, and mark your specialties as featured.
        </p>
        <input type="hidden" name="services" value={JSON.stringify(servicesPayload)} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((category) => (
            <div key={category.id} className="card space-y-1 p-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(selectedServices[category.id])}
                  onChange={() => toggleService(category.id)}
                />
                {category.name}
              </label>
              {selectedServices[category.id] ? (
                <label className="ml-6 flex items-center gap-1.5 text-xs text-foreground-secondary">
                  <input
                    type="checkbox"
                    checked={Boolean(featuredServices[category.id])}
                    onChange={() => toggleFeatured(category.id)}
                  />
                  Featured
                </label>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-brand-accent">Saved.</p> : null}

      <button type="submit" className="btn-primary" disabled={isPending || !location}>
        {isPending ? 'Saving…' : 'Save listing'}
      </button>
      {!location ? (
        <p className="text-xs text-warning">
          Set your location on the map before saving.
        </p>
      ) : null}
    </form>
  );
}
