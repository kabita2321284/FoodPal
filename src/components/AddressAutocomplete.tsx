import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, LocateFixed, MapPin, Search } from "lucide-react";

export type AddressValue = {
  label?: string;
  text: string;
  lat?: number | null;
  lng?: number | null;
  placeId?: string;
};

type AddressAutocompleteProps = {
  value: AddressValue;
  onChange: (address: AddressValue) => void;
  placeholder?: string;
  labelPlaceholder?: string;
  showLabelInput?: boolean;
  showCurrentLocationButton?: boolean;
  country?: string;
  className?: string;
};

type GPSLocation = {
  lat: number;
  lng: number;
};

const MIN_SEARCH_LENGTH = 3;
const GOOGLE_SCRIPT_ID = "google-maps-script";

export const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    const googleObject = (window as any).google;

    if (googleObject?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Could not load Google Maps.")), {
        once: true,
      });
      return;
    }

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!key) {
      reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY in .env file."));
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Maps."));

    document.head.appendChild(script);
  });
};

const getCurrentGPS = (): Promise<GPSLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission was denied. Please allow location access."));
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error("GPS location is unavailable. Please check your location settings."));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new Error("GPS request timed out. Please try again."));
          return;
        }

        reject(new Error("Could not get your current GPS location."));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
};

export const reverseGeocodeLocation = async (lat: number, lng: number) => {
  await loadGoogleMapsScript();

  const geocoder = new google.maps.Geocoder();

  return await new Promise<{ text: string; placeId?: string }>((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const firstResult = results?.[0];

      if (status === "OK" && firstResult?.formatted_address) {
        resolve({
          text: firstResult.formatted_address,
          placeId: firstResult.place_id,
        });
        return;
      }

      resolve({ text: `${lat}, ${lng}` });
    });
  });
};

export const geocodeAddressText = async (address: string, country = "gb") => {
  await loadGoogleMapsScript();

  const geocoder = new google.maps.Geocoder();

  return await new Promise<AddressValue>((resolve, reject) => {
    geocoder.geocode(
      {
        address,
        componentRestrictions: country ? { country } : undefined,
      },
      (results, status) => {
        const firstResult = results?.[0];
        const location = firstResult?.geometry?.location;

        if (status === "OK" && firstResult && location) {
          resolve({
            text: firstResult.formatted_address || address,
            lat: location.lat(),
            lng: location.lng(),
            placeId: firstResult.place_id,
          });
          return;
        }

        reject(new Error("Address not found. Please select a real address from the dropdown."));
      }
    );
  });
};

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Start typing address, postcode, or street...",
  labelPlaceholder = "Label e.g. Home, Work, Restaurant",
  showLabelInput = true,
  showCurrentLocationButton = true,
  country = "gb",
  className = "",
}) => {
  const [query, setQuery] = useState(value?.text || "");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState("");

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const dummyMapRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const hasSavedGPS =
    typeof value?.lat === "number" &&
    Number.isFinite(value.lat) &&
    typeof value?.lng === "number" &&
    Number.isFinite(value.lng);

  const createSessionToken = () => {
    if (google.maps.places.AutocompleteSessionToken) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  };

  const prepareGoogleServices = async () => {
    await loadGoogleMapsScript();

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    }

    if (!placesServiceRef.current && dummyMapRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(dummyMapRef.current);
    }

    if (!sessionTokenRef.current) {
      createSessionToken();
    }
  };

  useEffect(() => {
    setQuery(value?.text || "");
  }, [value?.text]);

  useEffect(() => {
    prepareGoogleServices().catch((err) => {
      setError(err?.message || "Google Maps failed to load.");
    });

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchAddress = async (text: string) => {
    setQuery(text);
    setError("");

    onChange({
      ...value,
      text,
      lat: null,
      lng: null,
      placeId: "",
    });

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length < MIN_SEARCH_LENGTH) {
      setPredictions([]);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        await prepareGoogleServices();

        autocompleteServiceRef.current?.getPlacePredictions(
          {
            input: text,
            componentRestrictions: country ? { country } : undefined,
            types: ["geocode"],
            sessionToken: sessionTokenRef.current || undefined,
          },
          (results, status) => {
            setSearchLoading(false);

            if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
              setPredictions(results);
              return;
            }

            setPredictions([]);
          }
        );
      } catch (err: any) {
        setSearchLoading(false);
        setPredictions([]);
        setError(err?.message || "Google address search is not ready.");
      }
    }, 300);
  };

  const selectPrediction = async (prediction: google.maps.places.AutocompletePrediction) => {
    try {
      setSearchLoading(true);
      setError("");
      await prepareGoogleServices();

      if (!placesServiceRef.current) {
        throw new Error("Google Places service is not ready.");
      }

      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["formatted_address", "geometry", "place_id", "name"],
          sessionToken: sessionTokenRef.current || undefined,
        },
        (place, status) => {
          setSearchLoading(false);

          if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
            setError("Could not get GPS for this address. Please choose another address.");
            return;
          }

          const selectedAddress: AddressValue = {
            ...value,
            text: place.formatted_address || prediction.description,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id || prediction.place_id,
          };

          setQuery(selectedAddress.text);
          setPredictions([]);
          setIsFocused(false);
          onChange(selectedAddress);
          createSessionToken();
        }
      );
    } catch (err: any) {
      setSearchLoading(false);
      setError(err?.message || "Could not select address.");
    }
  };

  const useCurrentLocation = async () => {
    try {
      setGpsLoading(true);
      setError("");

      const coords = await getCurrentGPS();
      const detectedAddress = await reverseGeocodeLocation(coords.lat, coords.lng);

      const finalAddress: AddressValue = {
        ...value,
        text: detectedAddress.text,
        lat: coords.lat,
        lng: coords.lng,
        placeId: detectedAddress.placeId || "",
      };

      setQuery(finalAddress.text);
      setPredictions([]);
      setIsFocused(false);
      onChange(finalAddress);
    } catch (err: any) {
      setError(err?.message || "Could not use current location.");
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div ref={dummyMapRef} className="hidden" />

      {showLabelInput && (
        <input
          value={value?.label || ""}
          onChange={(event) =>
            onChange({
              ...value,
              label: event.target.value,
            })
          }
          placeholder={labelPlaceholder}
          className="w-full mb-4 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-orange-500 font-bold"
        />
      )}

      <div className="relative">
        <div className="relative">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            value={query}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 200);
            }}
            onChange={(event) => searchAddress(event.target.value)}
            placeholder={placeholder}
            className={`w-full pl-14 pr-12 py-5 bg-gray-50 border rounded-2xl outline-none font-bold text-gray-900 placeholder:text-gray-400 ${
              hasSavedGPS ? "border-green-300 focus:border-green-500" : "border-gray-200 focus:border-orange-500"
            }`}
          />

          {searchLoading ? (
            <Loader2 size={20} className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-orange-500" />
          ) : hasSavedGPS ? (
            <Check size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-green-500" />
          ) : null}
        </div>

        {isFocused && predictions.length > 0 && !hasSavedGPS && (
          <div className="absolute z-50 mt-3 w-full bg-white border border-gray-100 rounded-[28px] shadow-2xl shadow-gray-200 overflow-hidden">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPrediction(prediction)}
                className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                  <MapPin size={18} />
                </div>

                <div>
                  <p className="font-black text-gray-900">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </p>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    {prediction.structured_formatting?.secondary_text || prediction.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {query.trim().length >= MIN_SEARCH_LENGTH && !hasSavedGPS && !searchLoading && !error && (
        <p className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-2xl p-4 mt-4">
          Select one address from the dropdown. This saves exact GPS coordinates for the map and rider route.
        </p>
      )}

      {showCurrentLocationButton && (
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={gpsLoading}
          className="w-full mt-4 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-orange-600 transition-colors"
        >
          {gpsLoading ? <Loader2 className="animate-spin" size={18} /> : <LocateFixed size={18} />}
          {gpsLoading ? "Finding location..." : "Use my current GPS location"}
        </button>
      )}

      {hasSavedGPS && (
        <div className="p-5 bg-green-50 border border-green-100 rounded-3xl mt-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-green-700 uppercase tracking-widest">Exact map location saved</p>
              <p className="text-sm font-bold text-gray-700 mt-2">
                {Number(value.lat).toFixed(5)}, {Number(value.lng).toFixed(5)}
              </p>
              <p className="text-sm text-gray-600 mt-1">{value.text}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 mt-4">
          <AlertCircle className="text-red-500 mt-0.5" size={18} />
          <p className="text-sm font-bold text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
