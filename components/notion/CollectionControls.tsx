"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { ContentType } from "@/lib/notion-cms";
import type { ListingOptions } from "@/lib/content-listing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CollectionControls({
  type,
  options,
  categories,
}: {
  type: ContentType;
  options: ListingOptions;
  categories: Array<[string, number]>;
}) {
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const key of ["q", "category", "sort", "view", "letter"]) {
      const value = form.get(key);
      if (typeof value === "string" && value.trim())
        query.set(key, value.trim());
    }
    router.push(`/${type}${query.size ? `?${query}` : ""}`, { scroll: false });
  }
  return (
    <form
      className="cms-controls"
      action={`/${type}`}
      method="get"
      onSubmit={submit}
      role="search"
    >
      <label className="cms-search">
        <span className="sr-only">Search {type}</span>
        <Input
          type="search"
          name="q"
          defaultValue={options.q}
          placeholder={`Search ${type}…`}
          maxLength={300}
        />
      </label>
      <label className="cms-select-wrap">
        <span className="sr-only">Filter by category</span>
        <select name="category" defaultValue={options.category}>
          <option value="">All categories</option>
          {options.category &&
          !categories.some(([name]) => name === options.category) ? (
            <option value={options.category}>{options.category}</option>
          ) : null}
          {categories.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>
      </label>
      <label className="cms-select-wrap">
        <span className="sr-only">Sort collection</span>
        <select name="sort" defaultValue={options.sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
          <option value="shortest">Shortest read</option>
        </select>
      </label>
      <input type="hidden" name="view" value={options.view} />
      {options.letter ? (
        <input type="hidden" name="letter" value={options.letter} />
      ) : null}
      <Button type="submit" variant="outline" size="sm">
        Apply
      </Button>
    </form>
  );
}
