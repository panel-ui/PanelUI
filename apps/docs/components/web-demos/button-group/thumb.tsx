import { ChevronDownIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { ButtonGroup } from 'panelui-web/button-group';

export default function ButtonGroupThumb() {
  return (
    <div className="flex flex-col items-center gap-3">
      <ButtonGroup aria-label="Range">
        <Button variant="outline">Day</Button>
        <Button variant="outline">Week</Button>
        <Button variant="outline">Month</Button>
      </ButtonGroup>
      <div className="flex gap-3">
        <ButtonGroup aria-label="Merge">
          <Button>Merge</Button>
          <ButtonGroup.Separator />
          <Button size="icon" aria-label="More">
            <ChevronDownIcon />
          </Button>
        </ButtonGroup>
        <ButtonGroup aria-label="Zoom">
          <Button variant="outline" size="icon" aria-label="Zoom out">
            <MinusIcon />
          </Button>
          <Button variant="outline" size="icon" aria-label="Zoom in">
            <PlusIcon />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
