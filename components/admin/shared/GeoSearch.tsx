// components/admin/shared/GeoSearch.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, MapPin, Navigation, Loader2, CheckCircle, 
  AlertCircle, Globe, X, Crosshair 
} from "lucide-react";
import { 
  geocodePlace, getCurrentPosition, reverseGeocode, 
  getLocationInfo, formatCoordinates,
  type GeoResult, type GeoError 
} from "@/lib/geocoding";

interface GeoSearchProps {
  placeholder?: string;
  onSelect: (result: GeoResult) => void;
  value?: {
    lat?: number;
    lng?: number;
    display_name?: string;
  };
  className?: string;
  showCurrentLocation?: boolean;
  showManualInput?: boolean;
}

export default function GeoSearch({
  placeholder = "Ex: Dakar, Lagos, Kingston, New York...",
  onSelect,
  value,
  className = "",
  showCurrentLocation = true,
  showManualInput = true
}: GeoSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Manuel coordinates
  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [isManualGeocoding, setIsManualGeocoding] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  // ✅ CORRECTION : initialValue fournie
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fermer dropdown si clic dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setManualMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche avec debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      
      const searchResults = await geocodePlace(query);
      
      if ('code' in searchResults) {
        setError(searchResults.message);
        setResults([]);
      } else {
        setResults(searchResults);
        setShowResults(true);
      }
      
      setIsSearching(false);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  // Géolocalisation navigateur
  const handleCurrentLocation = async () => {
    setIsGeolocating(true);
    setError(null);
    
    const result = await getLocationInfo(true);
    
    if ('code' in result) {
      setError(result.message);
    } else {
      onSelect(result);
      setQuery(result.display_name.split(',').slice(0, 2).join(', '));
    }
    
    setIsGeolocating(false);
    setShowResults(false);
  };

  // Géocodage depuis coordonnées manuelles
  const handleManualGeocode = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      setError("Coordonnées invalides");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Coordonnées hors limites");
      return;
    }

    setIsManualGeocoding(true);
    setError(null);
    
    const result = await reverseGeocode(lat, lng);
    
    if ('code' in result) {
      setError(result.message);
    } else {
      onSelect(result);
      setQuery(result.display_name.split(',').slice(0, 2).join(', '));
      setManualMode(false);
      setManualLat("");
      setManualLng("");
    }
    
    setIsManualGeocoding(false);
  };

  // Sélection d'un résultat de recherche
  const handleSelectResult = (result: GeoResult) => {
    onSelect(result);
    setQuery(result.display_name.split(',').slice(0, 2).join(', '));
    setShowResults(false);
    setError(null);
  };

  // Icône selon type de lieu
  const getPlaceIcon = (type: GeoResult['place_type']) => {
    switch (type) {
      case 'country': return <Globe size={14} className="text-blue-400" />;
      case 'city': return <MapPin size={14} className="text-green-400" />;
      case 'region': return <MapPin size={14} className="text-purple-400" />;
      default: return <MapPin size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      {/* Input principal */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 focus-within:border-blue-500 transition-colors">
          <Search size={16} className="text-gray-500 flex-shrink-0" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setShowResults(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
          />
          
          {isSearching && (
            <Loader2 size={16} className="text-blue-400 animate-spin flex-shrink-0" />
          )}
          
          {value?.lat && value?.lng && (
            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
              <CheckCircle size={9} />
              {formatCoordinates(value.lat, value.lng)}
            </span>
          )}
          
          {query && !isSearching && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setShowResults(false);
                setError(null);
              }}
              className="text-gray-500 hover:text-white flex-shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropdown résultats */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          <div className="p-2 border-b border-white/10">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">
              {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
            </p>
          </div>
          
          {results.map((result, index) => (
            <button
              key={`${result.lat}-${result.lng}-${index}`}
              onClick={() => handleSelectResult(result)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getPlaceIcon(result.place_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate group-hover:text-blue-400 transition-colors">
                  {result.display_name.split(',')[0]}
                </p>
                <p className="text-gray-500 text-xs truncate mt-0.5">
                  {result.display_name.split(',').slice(1).join(',')}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-gray-600 font-mono bg-black/30 px-1.5 py-0.5 rounded">
                    {result.country_code}
                  </span>
                  <span className="text-[10px] text-gray-700">
                    {formatCoordinates(result.lat, result.lng)}
                  </span>
                </div>
              </div>
              
              <MapPin size={12} className="text-gray-700 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Actions rapides */}
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Géolocalisation auto */}
        {showCurrentLocation && (
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isGeolocating}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-medium hover:bg-blue-600/20 disabled:opacity-40 transition-colors"
          >
            {isGeolocating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Navigation size={12} />
            )}
            {isGeolocating ? "Localisation..." : "Ma position actuelle"}
          </button>
        )}

        {/* Coordonnées manuelles */}
        {showManualInput && (
          <button
            type="button"
            onClick={() => setManualMode(!manualMode)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors"
          >
            <Crosshair size={12} />
            Saisir coordonnées GPS
          </button>
        )}
      </div>

      {/* Mode manuel coordonnées */}
      {manualMode && (
        <div className="mt-3 p-4 bg-black/30 border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">Coordonnées GPS manuelles</span>
            <button
              onClick={() => {
                setManualMode(false);
                setManualLat("");
                setManualLng("");
              }}
              className="text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-mono">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="14.6928"
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-mono">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="-17.4467"
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleManualGeocode}
            disabled={isManualGeocoding || !manualLat || !manualLng}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            {isManualGeocoding ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Géocodage...
              </>
            ) : (
              <>
                <Crosshair size={14} />
                Valider ces coordonnées
              </>
            )}
          </button>
          
          <p className="text-[10px] text-gray-600 flex items-start gap-1.5">
            <AlertCircle size={9} className="flex-shrink-0 mt-0.5" />
            Les coordonnées seront converties en adresse automatiquement.
          </p>
        </div>
      )}
    </div>
  );
}