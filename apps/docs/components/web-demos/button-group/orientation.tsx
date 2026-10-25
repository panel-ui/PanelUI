import { LocateFixedIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { ButtonGroup } from 'panelui-web/button-group';

export default function ButtonGroupOrientation() {
  return (
    <div className="flex items-center gap-6">
      <ButtonGroup orientation="vertical" aria-label="Zoom">
        <Button variant="outline" size="icon" aria-label="Zoom in">
          <PlusIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Zoom out">
          <MinusIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Centre on my location">
          <LocateFixedIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup orientation="vertical" aria-label="Sort by">
        <Button variant="outline">Newest first</Button>
        <Button variant="outline">Oldest first</Button>
        <Button variant="outline">Most replies</Button>
      </ButtonGroup>
    </div>
  );
}
