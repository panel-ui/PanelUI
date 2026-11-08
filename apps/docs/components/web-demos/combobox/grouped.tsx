import { Combobox } from 'panelui-web/combobox';

export default function ComboboxGrouped() {
  return (
    <div className="w-full max-w-xs">
      <Combobox placeholder="Search frameworks" openOnFocus>
        <Combobox.Group label="Native">
          <Combobox.Item value="expo" label="Expo" />
          <Combobox.Item value="react-native" label="React Native" />
        </Combobox.Group>
        <Combobox.Group label="Web">
          <Combobox.Item value="next" label="Next.js" />
          <Combobox.Item value="remix" label="Remix" />
          <Combobox.Item value="astro" label="Astro" />
          <Combobox.Item value="sveltekit" label="SvelteKit" />
        </Combobox.Group>
      </Combobox>
    </div>
  );
}
