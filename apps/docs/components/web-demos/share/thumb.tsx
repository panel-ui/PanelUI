import { Share } from 'panelui-web/share';

const PEOPLE = [{ name: 'Ines Duarte' }, { name: 'Sam Whitlock' }, { name: 'Priya Raman' }];

export default function ShareThumb() {
  return (
    <Share link="https://example.com/d/spring-lookbook">
      <Share.Trigger people={PEOPLE} tabIndex={-1} />
    </Share>
  );
}
