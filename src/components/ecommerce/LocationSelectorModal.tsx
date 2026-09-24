'use client';

import React, { useState } from 'react';
import { X, MapPin, Navigation, CheckCircle2, AlertTriangle, Search, Info } from 'lucide-react';
import { DeliveryLocationState } from '@/types';
import { Button } from '@/components/ui/Button';
import { STORE_DEFAULTS, DELIVERY_PRICING_SLABS } from '@/lib/constants';
import { calculateDistanceKm, getDeliveryPricingForDistance } from '@/lib/geo';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: DeliveryLocationState;
  onSelectLocation: (loc: DeliveryLocationState) => void;
}

const PRESET_LOCALITIES = [
  {
    name: 'Velmala Village & Gram Panchayat',
    address: 'Near Ramalayam, Velmala, Hyderabad 502300',
    lat: 17.502900,
    lng: 78.257300,
    pincode: '502300',
  },
  {
    name: 'Kollur ORR Township (Exit 2)',
    address: 'Kollur ORR Junction, Hyderabad 502300',
    lat: 17.485200,
    lng: 78.241000,
    pincode: '502300',
  },
  {
    name: 'Tellapur Township (My Home Tridasa)',
    address: 'Tellapur Main Road, Hyderabad 502032',
    lat: 17.468000,
    lng: 78.291000,
    pincode: '502032',
  },
  {
    name: 'Mokila Green Meadows & Villas',
    address: 'Mokila Road, Shankarpally Mandal 501203',
    lat: 17.472000,
    lng: 78.205000,
    pincode: '501203',
  },
  {
    name: 'Shankarpally Station Road',
    address: 'Shankarpally Highway, Telangana 501203',
    lat: 17.455000,
    lng: 78.199000,
    pincode: '501203',
  },
  {
    name: 'Gachibowli Stadium (Outside 7km Zone)',
    address: 'Old Mumbai Highway, Gachibowli, Hyderabad 500032',
    lat: 17.447500,
    lng: 78.349800,
    pincode: '500032',
  },
];

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [selectedLoc, setSelectedLoc] = useState<DeliveryLocationState>(currentLocation);
  const [addressInput, setAddressInput] = useState('');
  const [pincodeInput, setPincodeInput] = useState('502300');
  const [isLocating, setIsLocating] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_LOCALITIES[0]) => {
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
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const dist = calculateDistanceKm(
          STORE_DEFAULTS.CENTER_LOCATION.LATITUDE,
          STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE,
          lat,
          lng
        );
        const pricing = getDeliveryPricingForDistance(dist);

        setSelectedLoc({
          address: `Current GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          latitude: lat,
          longitude: lng,
          pincode: 'Local Zone',
          distanceKm: dist,
          isDeliverable: pricing.isDeliverable,
          deliveryFee: pricing.fee,
          zoneLabel: pricing.label,
        });
      },
      (err) => {
        setIsLocating(false);
        alert(`Could not acquire GPS: ${err.message}. Please select a preset locality.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSave = () => {
    onSelectLocation(selectedLoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-amber-500/20 shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white">
              Choose Delivery Location
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dispatched from Velmala Hub (Strict 7 KM Delivery Zone)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Button */}
        <button
          type="button"
          onClick={handleUseGps}
          disabled={isLocating}
          className="w-full py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Detecting Precise Coordinates...' : 'Use My Current Live GPS Location'}</span>
        </button>

        {/* Current Selected Location Card */}
        <div className={`p-4 rounded-2xl border text-xs ${
          selectedLoc.isDeliverable
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
            : 'bg-red-50 dark:bg-red-950/30 border-red-500/40 text-red-900 dark:text-red-200'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">{selectedLoc.address}</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Distance: <strong>{selectedLoc.distanceKm.toFixed(2)} km</strong> from Velmala Center
                </div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              selectedLoc.isDeliverable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {selectedLoc.isDeliverable ? 'Deliverable' : 'Outside 7 KM'}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-current/20 flex items-center justify-between text-[11px] font-semibold">
            <span>{selectedLoc.zoneLabel}</span>
            <span>{selectedLoc.isDeliverable ? `Delivery Fee: ₹${selectedLoc.deliveryFee}` : 'No Delivery Available'}</span>
          </div>
        </div>

        {/* Popular Delivery Localities in Velmala Cluster */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Or Pick Your Neighborhood:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {PRESET_LOCALITIES.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className="p-3 rounded-2xl text-left border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 bg-slate-50 dark:bg-slate-950/50 transition-all hover:scale-[1.01]"
              >
                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {p.address}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Slabs Legend */}
        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
          <div className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-amber-500" />
            <span>Velmala Distance-Based Delivery Slabs:</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500">
            <div>0 - 2 km: <strong>₹40</strong></div>
            <div>2 - 4 km: <strong>₹70</strong></div>
            <div>4 - 7 km: <strong>₹120</strong></div>
          </div>
        </div>

        {/* Confirm Button */}
        <Button
          variant="festive"
          size="md"
          onClick={handleSave}
          className="w-full font-bold shadow-spark"
        >
          Confirm Delivery Address
        </Button>
      </div>
    </div>
  );
};
