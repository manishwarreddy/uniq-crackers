'use client';

import React, { useState } from 'react';
import { X, MapPin, Navigation } from 'lucide-react';
import { DeliveryLocationState } from '@/types';
import { STORE_DEFAULTS } from '@/lib/constants';
import { calculateDistanceKm, getDeliveryPricingForDistance } from '@/lib/geo';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: DeliveryLocationState;
  onSelectLocation: (loc: DeliveryLocationState) => void;
}

const PRESET_LOCALITIES = [
  {
    name: 'Velmala Village & Gram Panchayat (0 km)',
    address: 'Near Ramalayam, Velmala, Hyderabad 502300',
    lat: 17.502900,
    lng: 78.257300,
    pincode: '502300',
  },
  {
    name: 'Tellapur Township & My Home Bhooja (3.8 km)',
    address: 'Tellapur Main Road, Hyderabad 502032',
    lat: 17.468000,
    lng: 78.291000,
    pincode: '502032',
  },
  {
    name: 'Kollur ORR Township - Exit 2 (4.2 km)',
    address: 'Kollur ORR Junction, Hyderabad 502300',
    lat: 17.485200,
    lng: 78.241000,
    pincode: '502300',
  },
  {
    name: 'Mokila Green Meadows & Villas (5.6 km)',
    address: 'Mokila Road, Shankarpally Mandal 501203',
    lat: 17.472000,
    lng: 78.205000,
    pincode: '501203',
  },
  {
    name: 'Osman Nagar & Gopanpally Road (6.2 km)',
    address: 'Osman Nagar Lake Road, Hyderabad 500019',
    lat: 17.452000,
    lng: 78.285000,
    pincode: '500019',
  },
  {
    name: 'Edulanagulapally Residential Zone (4.9 km)',
    address: 'Near Outer Ring Road Exit, 502300',
    lat: 17.491000,
    lng: 78.232000,
    pincode: '502300',
  },
];

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [selectedLoc, setSelectedLoc] = useState<DeliveryLocationState>(currentLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_LOCALITIES[0]) => {
    setGpsError(null);
    const dist = calculateDistanceKm(
      STORE_DEFAULTS.CENTER_LOCATION.LATITUDE,
      STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE,
      preset.lat,
      preset.lng
    );
    const pricing = getDeliveryPricingForDistance(dist);

    setSelectedLoc({
      address: preset.address,
      latitude: preset.lat,
      longitude: preset.lng,
      pincode: preset.pincode,
      distanceKm: dist,
      isDeliverable: pricing.isDeliverable,
      deliveryFee: pricing.fee,
      zoneLabel: pricing.label,
    });
  };

  const handleUseGps = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Please select a preset locality below.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const dist = calculateDistanceKm(
          STORE_DEFAULTS.CENTER_LOCATION.LATITUDE,
          STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE,
          latitude,
          longitude
        );
        const pricing = getDeliveryPricingForDistance(dist);

        setSelectedLoc({
          address: `GPS Pin: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          latitude,
          longitude,
          pincode: '502300',
          distanceKm: dist,
          isDeliverable: pricing.isDeliverable,
          deliveryFee: pricing.fee,
          zoneLabel: pricing.label,
        });
      },
      (err) => {
        setIsLocating(false);
        setGpsError(`Could not acquire GPS: ${err.message}. Please select your locality from the list below.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSave = () => {
    onSelectLocation(selectedLoc);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/85 backdrop-blur-md" />

      <div className="relative w-full max-w-xl bg-festive-surface text-slate-100 rounded-3xl border border-amber-500/30 shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 id="location-modal-title" className="font-heading font-black text-lg text-white">
              Choose 7 KM Delivery Location
            </h3>
            <p className="text-xs text-slate-400">
              Dispatched direct from Velmala Hub (17.5029° N, 78.2573° E)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Button */}
        <button
          type="button"
          onClick={handleUseGps}
          disabled={isLocating}
          className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Navigation className={`w-4 h-4 text-amber-400 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Acquiring GPS Satellite Pin...' : 'Use My Current Live GPS Location'}</span>
        </button>

        {gpsError && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium">
            {gpsError}
          </div>
        )}

        {/* Current Selected Location Card */}
        <div className={`p-4 rounded-2xl border text-xs ${
          selectedLoc.isDeliverable
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="font-bold text-white">{selectedLoc.address}</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Distance: <strong>{selectedLoc.distanceKm.toFixed(2)} km</strong> from Velmala Hub Center
                </div>
              </div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              selectedLoc.isDeliverable ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
            }`}>
              {selectedLoc.isDeliverable ? '✓ Deliverable' : "We don't deliver to your location"}
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-current/20 flex items-center justify-between text-[11px] font-semibold">
            <span>{selectedLoc.zoneLabel}</span>
            <span className="text-amber-300">{selectedLoc.isDeliverable ? `Delivery Fee: ₹${selectedLoc.deliveryFee}` : 'No Delivery'}</span>
          </div>
        </div>

        {/* Preset Localities */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
            Quick Select Hyderabad Locality:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {PRESET_LOCALITIES.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className="p-3 rounded-2xl text-left border border-slate-800 hover:border-amber-500/50 bg-slate-900/60 hover:bg-slate-900 transition-all text-xs"
              >
                <div className="font-bold text-white truncate">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {p.address}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Save Button */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-festive transition-all"
          >
            Confirm Delivery Pin
          </button>
        </div>
      </div>
    </div>
  );
};
