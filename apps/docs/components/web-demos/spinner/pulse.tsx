import { Avatar } from 'panelui-web/avatar';
import { Spinner } from 'panelui-web/spinner';

export default function SpinnerPulse() {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Avatar name="Rami Haddad" />
      <div className="flex flex-col">
        <span className="font-medium text-foreground">Rami Haddad</span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Spinner variant="pulse" size="sm" className="text-warning" label="Waiting for Rami" />
          Waiting for them to join
        </span>
      </div>
    </div>
  );
}
