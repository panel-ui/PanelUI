'use client';

import { Field } from 'panelui-web/field';
import { Combobox } from 'panelui-web/combobox';
import { useEffect, useState } from 'react';

const CITIES = [
  { value: 'lisbon', label: 'Lisbon' },
  { value: 'berlin', label: 'Berlin' },
  { value: 'helsinki', label: 'Helsinki' },
  { value: 'bogota', label: 'Bogotá' },
  { value: 'toronto', label: 'Toronto' },
  { value: 'vancouver', label: 'Vancouver' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'seoul', label: 'Seoul' },
];

/** Stands in for a search request that takes a moment. */
function useCitySearch(query: string) {
  const [state, setState] = useState({ loading: false, results: CITIES });
  useEffect(() => {
    setState((current) => ({ ...current, loading: true }));
    const timer = setTimeout(() => {
      const needle = query.trim().toLowerCase();
      setState({
        loading: false,
        results: needle ? CITIES.filter((city) => city.label.toLowerCase().includes(needle)) : CITIES,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);
  return state;
}

export default function ComboboxAsync() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<string | undefined>();
  const { loading, results } = useCitySearch(query);

  return (
    <Field className="w-full max-w-xs">
      <Field.Label>City</Field.Label>
      <Combobox
        value={city}
        onValueChange={setCity}
        inputValue={query}
        onInputValueChange={setQuery}
        filter={false}
        loading={loading}
        loadingMessage="Looking up cities"
        emptyMessage="No city by that name"
        placeholder="Search cities"
        clearable
      >
        {results.map((result) => (
          <Combobox.Item key={result.value} value={result.value} label={result.label} />
        ))}
      </Combobox>
      <Field.Description>The server does the matching; the field only shows what came back.</Field.Description>
    </Field>
  );
}
