"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PhotonPlaceSuggestion } from "@/lib/places/photon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AutocompleteResponse = {
  suggestions?: PhotonPlaceSuggestion[];
  error?: string;
};

type Props = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  selectedPlace: PhotonPlaceSuggestion | null;
  onSelectedPlaceChange: (place: PhotonPlaceSuggestion | null) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
};

const DEBOUNCE_MS = 350;

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
  const [suggestions, setSuggestions] = useState<PhotonPlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedValue(value), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const q = debouncedValue.trim();
    if (q.length < 2) {
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
        const list = data.suggestions ?? [];
        if (!cancelled) {
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
    debouncedValue.trim().length >= 2 &&
    (loading || suggestions.length > 0 || !!fetchError);

  const pick = useCallback(
    (place: PhotonPlaceSuggestion) => {
      onValueChange(place.label);
      onSelectedPlaceChange(place);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onSelectedPlaceChange, onValueChange],
  );

  function onInputChange(next: string) {
    onValueChange(next);
    if (next.trim().length < 2) {
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
                key={`${s.osmType}-${s.osmId}-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm outline-none",
                  activeIndex === index ? "bg-accent text-accent-foreground" : "",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                {s.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
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
