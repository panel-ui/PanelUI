import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  UnderlineIcon,
} from 'lucide-react';
import { Button } from 'panelui-web/button';
import { ButtonGroup } from 'panelui-web/button-group';

export default function ButtonGroupToolbar() {
  return (
    <ButtonGroup aria-label="Formatting">
      <ButtonGroup aria-label="Text style">
        <Button variant="outline" size="icon" aria-label="Bold">
          <BoldIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Italic">
          <ItalicIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Underline">
          <UnderlineIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Alignment">
        <Button variant="outline" size="icon" aria-label="Align left">
          <AlignLeftIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Align centre">
          <AlignCenterIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Align right">
          <AlignRightIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Insert">
        <Button variant="outline" size="icon" aria-label="Insert link">
          <LinkIcon />
        </Button>
      </ButtonGroup>
    </ButtonGroup>
  );
}
