"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  buildPhotonAutocompleteCacheKey,
  normalizePhotonAutocompleteQuery,
  PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH,
} from "@/lib/places/photon";
import { parsePlaceSuggestionsFromApi, type PlaceSuggestion } from "@/lib/places/types";
import { AddressMapPicker } from "@/components/address-map-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AutocompleteResponse = {
  suggestions?: unknown;
  error?: string;
};

type Props = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  selectedPlace: PlaceSuggestion | null;
  onSelectedPlaceChange: (place: PlaceSuggestion | null) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
};

const DEBOUNCE_MS = 350;

const CLIENT_AUTOCOMPLETE_CACHE_MAX = 48;
const clientAutocompleteCache = new Map<string, PlaceSuggestion[]>();

function suggestionKey(s: PlaceSuggestion, index: number): string {
  switch (s.kind) {
    case "photon":
      return `p-${s.osmType}-${s.osmId}-${index}`;
    case "community":
      return `c-${s.communityPlaceId}-${index}`;
    case "map_pin":
      return `m-${s.mapPinId}-${index}`;
  }
}

function autocompleteCacheGet(key: string): PlaceSuggestion[] | undefined {
  const hit = clientAutocompleteCache.get(key);
  if (hit === undefined) return undefined;
  clientAutocompleteCache.delete(key);
  clientAutocompleteCache.set(key, hit);
  return hit;
}

function autocompleteCacheSet(key: string, value: PlaceSuggestion[]) {
  if (clientAutocompleteCache.has(key)) {
    clientAutocompleteCache.delete(key);
  }
  clientAutocompleteCache.set(key, value);
  while (clientAutocompleteCache.size > CLIENT_AUTOCOMPLETE_CACHE_MAX) {
    const oldest = clientAutocompleteCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    clientAutocompleteCache.delete(oldest);
  }
}

export function AddressTypeahead({
  id,
  label,
  value,
  onValueChange,
  selectedPlace,
  onSelectedPlaceChange,
  disabled,
  required,
  placeholder,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedValue(value), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const q = debouncedValue.trim();
    if (q.length < PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      return;
    }

    const normalized = normalizePhotonAutocompleteQuery(q);
    if (normalized.length < PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      return;
    }

    const cacheKey = buildPhotonAutocompleteCacheKey(normalized);
    const cached = autocompleteCacheGet(cacheKey);
    if (cached !== undefined) {
      setSuggestions(cached);
      setFetchError(null);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const url = `/api/places/autocomplete?q=${encodeURIComponent(q)}`;

    void (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(url);
        const data = (await res.json()) as AutocompleteResponse;
        if (!res.ok) {
          throw new Error(data.error ?? "Search failed.");
        }
        const list = parsePlaceSuggestionsFromApi({ suggestions: data.suggestions }) ?? [];
        if (!cancelled) {
          autocompleteCacheSet(cacheKey, list);
          setSuggestions(list);
          setActiveIndex(-1);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setFetchError("Could not load suggestions. Try again.");
          setActiveIndex(-1);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedValue]);

  const listVisible =
    focused &&
    !disabled &&
    debouncedValue.trim().length >= PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH &&
    (loading || suggestions.length > 0 || !!fetchError);

  const pick = useCallback(
    (place: PlaceSuggestion) => {
      onValueChange(place.label);
      onSelectedPlaceChange(place);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onSelectedPlaceChange, onValueChange],
  );

  function onInputChange(next: string) {
    onValueChange(next);
    if (next.trim().length < PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setFetchError(null);
      setLoading(false);
    }
    if (selectedPlace && next.trim() !== selectedPlace.label.trim()) {
      onSelectedPlaceChange(null);
    }
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!listVisible || suggestions.length === 0) {
      if (e.key === "Escape") {
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSuggestions([]);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name="address"
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={listVisible}
          aria-controls={listId}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
        />
        {listVisible ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
          >
            {loading ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
            ) : null}
            {fetchError ? (
              <li className="px-3 py-2 text-sm text-destructive" role="status">
                {fetchError}
              </li>
            ) : null}
            {!loading && !fetchError && suggestions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
            ) : null}
            {suggestions.map((s, index) => (
              <li
                key={suggestionKey(s, index)}
                role="option"
                aria-selected={activeIndex === index}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 px-3 py-2 text-sm outline-none",
                  activeIndex === index ? "bg-accent text-accent-foreground" : "",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                <span className="flex items-center gap-2">
                  {s.kind === "community" ? (
                    <span className="rounded bg-muted px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Community
                    </span>
                  ) : null}
                  <span>{s.label}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        disabled={disabled}
        onClick={() => setMapOpen(true)}
      >
        Pin on map
      </Button>
      <AddressMapPicker
        open={mapOpen}
        onOpenChange={setMapOpen}
        onConfirm={(place) => {
          onValueChange(place.label);
          onSelectedPlaceChange(place);
        }}
      />
      <p className="text-xs text-muted-foreground leading-relaxed">
        Address search by{" "}
        <a
          href="https://photon.komoot.io"
          className="underline underline-offset-2 hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          Photon
        </a>
        . Data ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          className="underline underline-offset-2 hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>{" "}
        contributors.
      </p>
    </div>
  );
}
