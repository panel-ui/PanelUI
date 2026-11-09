import { Combobox } from 'panelui-web/combobox';

export default function ComboboxThumb() {
  return (
    <div className="w-56">
      <Combobox defaultValue="expo" placeholder="Framework">
        <Combobox.Item value="expo" label="Expo" />
        <Combobox.Item value="next" label="Next.js" />
        <Combobox.Item value="remix" label="Remix" />
      </Combobox>
    </div>
  );
}
