"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Search, Shield, User, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  type: "member" | "role" | "organization";
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearchInput() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the input query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Perform search across APIs on debounced query change
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    async function searchAll() {
      setSearching(true);
      try {
        const searchVal = encodeURIComponent(debouncedQuery);
        const [membersRes, rolesRes, orgsRes] = await Promise.all([
          fetch(`/api/members?limit=5&search=${searchVal}`).then((r) =>
            r.ok ? r.json() : { items: [] }
          ),
          fetch(`/api/roles?limit=5&search=${searchVal}`).then((r) =>
            r.ok ? r.json() : { items: [] }
          ),
          fetch(`/api/organizations`).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);

        const formattedResults: SearchResult[] = [];

        // 1. Process members
        const membersList = membersRes.items ?? [];
        membersList.forEach((m: any) => {
          formattedResults.push({
            id: m.id,
            type: "member",
            title: m.user?.name ?? "No Name",
            subtitle: m.user?.email ?? "",
            href: "/members",
          });
        });

        // 2. Process roles
        const rolesList = rolesRes.items ?? [];
        rolesList.forEach((r: any) => {
          formattedResults.push({
            id: r.id,
            type: "role",
            title: r.name,
            subtitle: r.description ?? "Custom security role.",
            href: "/roles",
          });
        });

        // 3. Process organizations (filter client-side since API returns all user memberships)
        const orgsList = Array.isArray(orgsRes) ? orgsRes : (orgsRes.items ?? orgsRes.data ?? []);
        orgsList.forEach((o: any) => {
          if (
            o.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
            o.slug.toLowerCase().includes(debouncedQuery.toLowerCase())
          ) {
            formattedResults.push({
              id: o.id,
              type: "organization",
              title: o.name,
              subtitle: `Slug: /${o.slug}`,
              href: "/organizations",
            });
          }
        });

        setResults(formattedResults);
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setSearching(false);
      }
    }

    searchAll();
  }, [debouncedQuery]);

  const icons = {
    member: User,
    role: Shield,
    organization: Building2,
  };

  return (
    <div className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative flex h-11 items-center gap-3 rounded-full border border-border bg-card px-4 text-sm shadow-[0_12px_24px_rgba(77,54,37,0.04)] focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-4 w-4 text-secondary-foreground" />
        <input
          type="text"
          placeholder="Search chapters, members, roles..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full bg-transparent text-foreground placeholder:text-secondary-foreground/60 focus:outline-none"
        />
        {searching && <Loader2 className="h-4 w-4 animate-spin text-secondary-foreground" />}
        {query && !searching && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="rounded-full p-1 hover:bg-secondary"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Floating Search Results Dropdown */}
      {open && query && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-[calc(100%+0.5rem)] left-0 z-50 w-full overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-[0_18px_50px_rgba(77,54,37,0.12)] max-h-96 overflow-y-auto">
            {results.length === 0 && !searching ? (
              <div className="px-4 py-6 text-center text-sm text-secondary-foreground">
                No matching results found.
              </div>
            ) : null}

            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((item) => {
                  const Icon = icons[item.type];
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => {
                        setOpen(false);
                        window.location.href = item.href;
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-[#fcf8f1]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-secondary-foreground mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground bg-secondary px-2.5 py-1 rounded-full shrink-0">
                        {item.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
