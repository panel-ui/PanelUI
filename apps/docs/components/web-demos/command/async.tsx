'use client';

import { PackageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Command } from 'panelui-web/command';

const PACKAGES = [
  { name: 'panelui-web', about: 'Animated React components on shadcn tokens', downloads: '18k' },
  { name: 'panelui-native', about: 'React Native components for Expo', downloads: '41k' },
  { name: 'panelui-cli', about: 'Copies components into a project', downloads: '9k' },
  { name: 'create-panelui-app', about: 'Starts an Expo app with PanelUI set up', downloads: '6k' },
  { name: 'tailwind-variants', about: 'Variant APIs for Tailwind classes', downloads: '2.1M' },
  { name: '@base-ui/react', about: 'Unstyled, accessible React primitives', downloads: '1.4M' },
];

/** Stands in for a search request that takes a moment. */
function useSearch(query: string) {
  const [state, setState] = useState({ loading: false, results: PACKAGES });
  useEffect(() => {
    setState((current) => ({ ...current, loading: true }));
    const timer = setTimeout(() => {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      setState({ loading: false, results: PACKAGES.filter((pkg) => words.every((word) => `${pkg.name} ${pkg.about}`.includes(word))) });
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);
  return state;
}

export default function CommandAsync() {
  const [query, setQuery] = useState('');
  const { loading, results } = useSearch(query);

  return (
    <Command variant="compact" filter={false} search={query} onSearchChange={setQuery} className="max-w-lg">
      <Command.Input placeholder="Search the registry…" />
      <Command.List className="h-64">
        {loading ? (
          <Command.Loading>Searching the registry…</Command.Loading>
        ) : (
          <>
            {results.map((pkg) => (
              <Command.Item key={pkg.name} icon={<PackageIcon />} subtitle={pkg.about} kind={`${pkg.downloads}/wk`}>
                {pkg.name}
              </Command.Item>
            ))}
            <Command.Empty>No packages match “{query}”</Command.Empty>
          </>
        )}
      </Command.List>
    </Command>
  );
}
