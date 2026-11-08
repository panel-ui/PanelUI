import { Combobox } from 'panelui-web/combobox';

export default function ComboboxInline() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Combobox presentation="inline" placeholder="Search frameworks">
        <Combobox.Item value="expo" label="Expo" />
        <Combobox.Item value="react-native" label="React Native" />
        <Combobox.Item value="next" label="Next.js" />
        <Combobox.Item value="remix" label="Remix" />
      </Combobox>
      <p className="text-xs text-muted-foreground">The list takes its place in the page instead of covering it.</p>
    </div>
  );
}
