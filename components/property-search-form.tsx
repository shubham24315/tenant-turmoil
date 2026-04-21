import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PROPERTY_SEARCH_MAX_QUERY_LENGTH,
  PROPERTY_SEARCH_MIN_QUERY_LENGTH,
} from "@/lib/data/properties";

type PropertySearchFormProps = {
  defaultQuery?: string;
  className?: string;
  idPrefix?: string;
};

export function PropertySearchForm({
  defaultQuery = "",
  className,
  idPrefix = "property-search",
}: PropertySearchFormProps) {
  const inputId = `${idPrefix}-q`;

  return (
    <form
      action="/properties/search"
      method="get"
      className={className ?? "flex w-full flex-col gap-2 sm:flex-row sm:items-center"}
      role="search"
    >
      <div className="relative flex-1">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={inputId}
          name="q"
          type="search"
          placeholder="Search by address or area…"
          defaultValue={defaultQuery}
          minLength={PROPERTY_SEARCH_MIN_QUERY_LENGTH}
          maxLength={PROPERTY_SEARCH_MAX_QUERY_LENGTH}
          className="pl-9"
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Search properties"
        />
      </div>
      <Button type="submit" className="shrink-0">
        Search
      </Button>
    </form>
  );
}
