'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Move,
  Edit2,
} from 'lucide-react';
import { DeliveryLocationState } from '@/types';
import { STORE_DEFAULTS } from '@/lib/constants';
import { calculateDistanceKm, getDeliveryPricingForDistance, OUT_OF_SERVICE_MESSAGE } from '@/lib/geo';
import {
  getLiveDeliveryLocation,
  reverseGeocodeLive,
  searchDeliveryLocations,
  KNOWN_LOCALITIES,
  LocationSearchResult,
} from '@/lib/location-service';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: DeliveryLocationState;
  onSelectLocation: (loc: DeliveryLocationState) => void;
  autoDetectOnOpen?: boolean;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  autoDetectOnOpen = false,
}) => {
  const [selectedLoc, setSelectedLoc] = useState<DeliveryLocationState>(currentLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Address editing state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [customAddress, setCustomAddress] = useState(currentLocation.address);
  const [customPincode, setCustomPincode] = useState(currentLocation.pincode || '502300');

  // Map dragging state
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDraggingPin, setIsDraggingPin] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Sync with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLoc(currentLocation);
      setCustomAddress(currentLocation.address);
      setCustomPincode(currentLocation.pincode || '502300');
      setGpsError(null);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setIsEditingAddress(false);

      if (autoDetectOnOpen && !currentLocation.confirmed) {
        handleUseGps();
      }
    }
  }, [isOpen, currentLocation, autoDetectOnOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced place search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchDeliveryLocations(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const updateCoordinates = useCallback(
    async (lat: number, lng: number, addressHint?: string) => {
      const storeLat = STORE_DEFAULTS.CENTER_LOCATION.LATITUDE;
      const storeLng = STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE;
      const dist = calculateDistanceKm(storeLat, storeLng, lat, lng);
      const pricing = getDeliveryPricingForDistance(dist);

      let finalAddress = addressHint || selectedLoc.address;
      let finalPincode = selectedLoc.pincode;

      if (!addressHint) {
        setIsReverseGeocoding(true);
        try {
          const geo = await reverseGeocodeLive(lat, lng);
          finalAddress = geo.address;
          finalPincode = geo.pincode;
        } catch {
          // Keep current address if reverse geocoding fails
        } finally {
          setIsReverseGeocoding(false);
        }
      }

      setCustomAddress(finalAddress);
      setCustomPincode(finalPincode);

      setSelectedLoc({
        address: finalAddress,
        latitude: lat,
        longitude: lng,
        pincode: finalPincode,
        distanceKm: dist,
        isDeliverable: pricing.isDeliverable,
        deliveryFee: pricing.fee,
        zoneLabel: pricing.label,
        confirmed: false,
      });
    },
    [selectedLoc]
  );

  const handleUseGps = async () => {
    setGpsError(null);
    setIsLocating(true);

    try {
      const live = await getLiveDeliveryLocation();
      setIsLocating(false);
      setGpsAccuracy(live.accuracy);
      setCustomAddress(live.address);
      setCustomPincode(live.pincode);

      setSelectedLoc({
        address: live.address,
        latitude: live.latitude,
        longitude: live.longitude,
        pincode: live.pincode,
        distanceKm: live.distanceKm,
        isDeliverable: live.isDeliverable,
        deliveryFee: live.deliveryFee,
        zoneLabel: live.zoneLabel,
        confirmed: false,
      });
    } catch (err: any) {
      setIsLocating(false);
      setGpsError(
        err.message || 'Could not acquire GPS position. Please search for or select your locality below.'
      );
    }
  };

  const handleSelectSearchResult = (result: LocationSearchResult) => {
    setShowSearchResults(false);
    setSearchQuery(result.name);
    setGpsError(null);
    setGpsAccuracy(null);
    setCustomAddress(result.address);
    setCustomPincode(result.pincode);

    setSelectedLoc({
      address: result.address,
      latitude: result.latitude,
      longitude: result.longitude,
      pincode: result.pincode,
      distanceKm: result.distanceKm,
      isDeliverable: result.isDeliverable,
      deliveryFee: result.deliveryFee,
      zoneLabel: result.zoneLabel,
      confirmed: false,
    });
  };

  const handleSelectPreset = (preset: (typeof KNOWN_LOCALITIES)[0]) => {
    setShowSearchResults(false);
    setSearchQuery('');
    setGpsError(null);
    setGpsAccuracy(null);

    const storeLat = STORE_DEFAULTS.CENTER_LOCATION.LATITUDE;
    const storeLng = STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE;
    const dist = calculateDistanceKm(storeLat, storeLng, preset.lat, preset.lng);
    const pricing = getDeliveryPricingForDistance(dist);

    setCustomAddress(preset.address);
    setCustomPincode(preset.pincode);

    setSelectedLoc({
      address: preset.address,
      latitude: preset.lat,
      longitude: preset.lng,
      pincode: preset.pincode,
      distanceKm: dist,
      isDeliverable: pricing.isDeliverable,
      deliveryFee: pricing.fee,
      zoneLabel: pricing.label,
      confirmed: false,
    });
  };

  // Map click or drag handler
  const handleMapInteraction = (clientX: number, clientY: number) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Viewbox span is approx ±0.008 lng, ±0.005 lat
    const dLng = ((x / rect.width) - 0.5) * 0.016;
    const dLat = -(((y / rect.height) - 0.5) * 0.010);

    const newLat = Number((selectedLoc.latitude + dLat).toFixed(6));
    const newLng = Number((selectedLoc.longitude + dLng).toFixed(6));

    updateCoordinates(newLat, newLng);
  };

  const handleSaveCustomAddress = () => {
    setIsEditingAddress(false);
    setSelectedLoc((prev) => ({
      ...prev,
      address: customAddress.trim() || prev.address,
      pincode: customPincode.trim() || prev.pincode,
    }));
  };

  const handleConfirmLocation = () => {
    if (!selectedLoc.isDeliverable) {
      setGpsError(OUT_OF_SERVICE_MESSAGE);
      return;
    }

    const finalLocation: DeliveryLocationState = {
      ...selectedLoc,
      address: customAddress.trim() || selectedLoc.address,
      pincode: customPincode.trim() || selectedLoc.pincode,
      confirmed: true,
    };

    onSelectLocation(finalLocation);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/85 backdrop-blur-md" />

      <div className="relative w-full max-w-xl bg-festive-surface text-slate-100 rounded-3xl border border-amber-500/30 shadow-2xl p-5 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 id="location-modal-title" className="font-heading font-black text-lg text-white">
              Confirm Delivery Location
            </h3>
            <p className="text-xs text-slate-400">
              Dispatched direct from Velmala Hub (17.5029° N, 78.2573° E) • 7 km Radius
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Live Detection Button */}
        <button
          type="button"
          onClick={handleUseGps}
          disabled={isLocating}
          className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 text-amber-400" />
          )}
          <span>
            {isLocating
              ? 'Detecting your live location via GPS...'
              : 'Detect My Current Live Location'}
          </span>
        </button>

        {/* GPS Error Message */}
        {gpsError && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Search Locality / Address Input */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search apartment, society, road, or locality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true);
              }}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-amber-500 text-white text-xs placeholder:text-slate-500 outline-none transition-colors"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 inset-x-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-800/60">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full p-2.5 text-left hover:bg-slate-800/80 transition-colors flex items-start gap-2.5"
                >
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-white truncate">{result.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{result.address}</div>
                    <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
                      {result.distanceKm.toFixed(1)} km away •{' '}
                      {result.isDeliverable ? `₹${result.deliveryFee} Delivery` : OUT_OF_SERVICE_MESSAGE}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Map with Draggable Pin */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Move className="w-3.5 h-3.5 text-amber-400" />
              Interactive Delivery Map Pin
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {selectedLoc.latitude.toFixed(4)}° N, {selectedLoc.longitude.toFixed(4)}° E
            </span>
          </div>

          <div
            ref={mapRef}
            onClick={(e) => handleMapInteraction(e.clientX, e.clientY)}
            onMouseDown={() => setIsDraggingPin(true)}
            onMouseUp={() => setIsDraggingPin(false)}
            onMouseMove={(e) => {
              if (isDraggingPin) {
                handleMapInteraction(e.clientX, e.clientY);
              }
            }}
            className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 select-none cursor-crosshair group shadow-inner"
          >
            {/* OpenStreetMap Tile Embed */}
            <iframe
              title="Delivery Area Map"
              width="100%"
              height="100%"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(
                selectedLoc.longitude - 0.008
              ).toFixed(5)}%2C${(selectedLoc.latitude - 0.005).toFixed(5)}%2C${(
                selectedLoc.longitude + 0.008
              ).toFixed(5)}%2C${(selectedLoc.latitude + 0.005).toFixed(
                5
              )}&layer=mapnik&marker=${selectedLoc.latitude.toFixed(5)}%2C${selectedLoc.longitude.toFixed(5)}`}
              className="w-full h-full border-0 pointer-events-none opacity-80 group-hover:opacity-90 transition-opacity"
            />

            {/* Centered Draggable Pin Target */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center -translate-y-4 animate-bounce">
                <div className="p-2 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-spark border-2 border-white ring-4 ring-amber-500/30">
                  <MapPin className="w-5 h-5 fill-slate-950 text-white" />
                </div>
                <div className="w-2.5 h-1 rounded-full bg-slate-950/80 blur-[1px] mt-0.5" />
              </div>
            </div>

            {/* Instructions Floating Badge */}
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700/60 backdrop-blur-sm text-[10px] font-bold text-amber-300 pointer-events-none flex items-center gap-1.5 shadow-md">
              <Move className="w-3 h-3 text-amber-400" />
              <span>Click or drag pin to adjust location</span>
              {isReverseGeocoding && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
            </div>

            {/* Service Radius Indicator */}
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700/60 backdrop-blur-sm text-[10px] font-bold text-slate-300 pointer-events-none shadow-md">
              Velmala Hub Dispatch (Max 7 km)
            </div>
          </div>
        </div>

        {/* Current Selected Location Card */}
        <div
          className={`p-4 rounded-2xl border text-xs transition-all ${
            selectedLoc.isDeliverable
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white leading-snug">
                  {customAddress || selectedLoc.address}
                </div>
                <div className="text-[11px] opacity-80 mt-1 flex flex-wrap items-center gap-2">
                  <span>
                    Distance: <strong>{selectedLoc.distanceKm.toFixed(2)} km</strong> from Velmala Hub
                  </span>
                  {gpsAccuracy !== null && (
                    <span className="text-[10px] text-amber-300 font-medium">
                      • Accuracy: ±{gpsAccuracy}m
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${
                selectedLoc.isDeliverable
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {selectedLoc.isDeliverable ? '✓ Deliverable' : OUT_OF_SERVICE_MESSAGE}
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-current/20 flex items-center justify-between text-[11px] font-semibold">
            <span>{selectedLoc.zoneLabel}</span>
            <span className="text-amber-300">
              {selectedLoc.isDeliverable
                ? `Delivery Fee: ₹${selectedLoc.deliveryFee}`
                : OUT_OF_SERVICE_MESSAGE}
            </span>
          </div>
        </div>

        {/* Manual Address Editor */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Delivery Address Details (Flat/House No., Street)</span>
            </label>
            {!isEditingAddress ? (
              <button
                type="button"
                onClick={() => setIsEditingAddress(true)}
                className="text-amber-400 hover:underline font-bold text-[10px]"
              >
                Edit Details
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveCustomAddress}
                className="text-emerald-400 hover:underline font-bold text-[10px]"
              >
                Done Editing
              </button>
            )}
          </div>

          {isEditingAddress ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="Enter Flat No, Apartment Name, Street, Landmark..."
                rows={2}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-amber-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPincode}
                  onChange={(e) => setCustomPincode(e.target.value)}
                  placeholder="Pincode (e.g. 502300)"
                  className="w-36 p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomAddress}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                >
                  Save Address
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 truncate">
              {customAddress || selectedLoc.address} (PIN: {customPincode})
            </p>
          )}
        </div>

        {/* Quick Select Presets */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            Quick Select Hyderabad Locality (Within 7 km):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {KNOWN_LOCALITIES.slice(0, 6).map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="p-2 rounded-xl text-left border border-slate-800 hover:border-amber-500/50 bg-slate-900/60 hover:bg-slate-900 transition-all text-xs"
              >
                <div className="font-bold text-white text-[11px] truncate">{preset.name}</div>
                <div className="text-[9px] text-slate-400 truncate">{preset.pincode}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
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
            onClick={handleConfirmLocation}
            disabled={!selectedLoc.isDeliverable}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-festive transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {selectedLoc.isDeliverable
                ? 'Confirm Delivery Location'
                : OUT_OF_SERVICE_MESSAGE}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};