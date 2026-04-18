"use client";

import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { designSystem } from "@/components/ui/design-system";
import { cn } from "@/lib/cn";

interface GoogleMapsEventListener {
  remove: () => void;
}

interface GooglePlaceLocation {
  lat: () => number;
  lng: () => number;
}

interface GooglePlaceResult {
  formatted_address?: string;
  geometry?: {
    location?: GooglePlaceLocation;
  };
  name?: string;
  utc_offset_minutes?: number;
}

interface GoogleAutocomplete {
  addListener: (
    eventName: "place_changed",
    handler: () => void,
  ) => GoogleMapsEventListener;
  getPlace: () => GooglePlaceResult;
}

interface GoogleMapsNamespace {
  maps?: {
    event?: {
      clearInstanceListeners: (instance: unknown) => void;
    };
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: {
          fields: string[];
          types?: string[];
        },
      ) => GoogleAutocomplete;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
  }
}

interface GooglePlaceSelection {
  latitude?: number;
  longitude?: number;
  place: string;
  utcOffsetMinutes?: number;
}

interface GooglePlaceInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (selection: GooglePlaceSelection) => void;
  value: string;
}

let googlePlacesScriptPromise: Promise<void> | null = null;

const googlePlacesApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const loadGooglePlaces = (apiKey: string) => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Places is only available in the browser."));
  }

  if (window.google?.maps?.places?.Autocomplete) {
    return Promise.resolve();
  }

  if (googlePlacesScriptPromise) {
    return googlePlacesScriptPromise;
  }

  googlePlacesScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-places-autocomplete="true"]',
    );

    const handleLoad = () => {
      if (window.google?.maps?.places?.Autocomplete) {
        resolve();
        return;
      }

      reject(new Error("Google Places library did not load."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Google Places.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.googlePlacesAutocomplete = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places`;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Unable to load Google Places.")),
      { once: true },
    );

    document.head.appendChild(script);
  });

  return googlePlacesScriptPromise;
};

export function GooglePlaceInput({
  className = "",
  disabled,
  error,
  label,
  onChange,
  onPlaceSelect,
  placeholder = "City, region, country",
  value,
  ...props
}: GooglePlaceInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    if (!googlePlacesApiKey || disabled) {
      setIsUnavailable(!googlePlacesApiKey);
      return;
    }

    let autocomplete: GoogleAutocomplete | null = null;
    let listener: GoogleMapsEventListener | null = null;
    let cancelled = false;

    void loadGooglePlaces(googlePlacesApiKey)
      .then(() => {
        const Autocomplete = window.google?.maps?.places?.Autocomplete;

        if (cancelled || !Autocomplete || !inputRef.current) {
          return;
        }

        autocomplete = new Autocomplete(inputRef.current, {
          fields: [
            "formatted_address",
            "geometry.location",
            "name",
            "utc_offset_minutes",
          ],
          types: ["geocode"],
        });

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          const selectedPlace = place?.formatted_address || place?.name || "";

          if (!selectedPlace) {
            return;
          }

          onPlaceSelect?.({
            latitude: place?.geometry?.location?.lat(),
            longitude: place?.geometry?.location?.lng(),
            place: selectedPlace,
            utcOffsetMinutes: place?.utc_offset_minutes,
          });
        });
      })
      .catch(() => {
        if (!cancelled) {
          setIsUnavailable(true);
        }
      });

    return () => {
      cancelled = true;
      listener?.remove();
      if (autocomplete) {
        window.google?.maps?.event?.clearInstanceListeners(autocomplete);
      }
    };
  }, [disabled, onPlaceSelect]);

  return (
    <label className="block">
      <span className={cn("mb-2 block", designSystem.label)}>{label}</span>
      <input
        ref={inputRef}
        autoComplete="off"
        className={cn(
          "w-full rounded-[1.35rem] border bg-[#fafafa]/90 px-4 py-3.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition duration-200 placeholder:text-foreground/35 focus:-translate-y-px focus:border-accent focus:bg-[#fafafa] focus:shadow-[0_14px_34px_rgba(12,13,10,0.08)]",
          error ? "border-[#a22e34]" : "border-[rgba(144,18,20,0.12)]",
          className,
        )}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
      {error ? <span className="mt-2 block text-sm text-[#901214]">{error}</span> : null}
      {isUnavailable ? (
        <span className="mt-2 block text-xs leading-5 text-foreground/45">
          Google location search needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </span>
      ) : null}
    </label>
  );
}
