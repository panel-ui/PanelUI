import { Input } from 'panelui-web/input';
import { Spinner } from 'panelui-web/spinner';
import { SearchIcon } from 'lucide-react';

export default function SpinnerOrbit() {
  return (
    <div className="w-72">
      <Input.Group>
        <Input.Addon>
          <SearchIcon />
        </Input.Addon>
        <Input defaultValue="invoice march" aria-label="Search" />
        <Input.Addon align="end">
          <Spinner variant="orbit" className="text-info" label="Searching" />
        </Input.Addon>
      </Input.Group>
    </div>
  );
}
