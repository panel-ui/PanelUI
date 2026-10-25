import { SearchIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { ButtonGroup } from 'panelui-web/button-group';
import { Input } from 'panelui-web/input';

export default function ButtonGroupInput() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <ButtonGroup aria-label="Search the changelog" className="w-full">
        <Input type="search" placeholder="Search the changelog" aria-label="Search" />
        <Button variant="outline" size="icon" aria-label="Search">
          <SearchIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Invite a teammate" className="w-full">
        <Input type="email" placeholder="name@company.com" aria-label="Email address" />
        <Button>Send invite</Button>
      </ButtonGroup>
    </div>
  );
}
