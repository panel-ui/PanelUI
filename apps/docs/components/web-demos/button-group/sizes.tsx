import { Button } from 'panelui-web/button';
import { ButtonGroup } from 'panelui-web/button-group';

const SIZES = ['sm', 'md', 'lg'] as const;

export default function ButtonGroupSizes() {
  return (
    <div className="flex flex-col items-center gap-4">
      {SIZES.map((size) => (
        <ButtonGroup key={size} aria-label={`Range, ${size}`}>
          <Button variant="outline" size={size}>
            7 days
          </Button>
          <Button variant="outline" size={size}>
            30 days
          </Button>
          <Button variant="outline" size={size}>
            12 months
          </Button>
        </ButtonGroup>
      ))}
    </div>
  );
}
