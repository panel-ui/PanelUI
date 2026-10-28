'use client';

import { HexagonIcon, MousePointer2Icon, SquareIcon, StarIcon, TriangleIcon, TypeIcon, CircleIcon } from 'lucide-react';
import { useState } from 'react';
import { Menu } from 'panelui-web/menu';
import { Toolbar } from 'panelui-web/toolbar';

const SHAPES = {
  rectangle: { label: 'Rectangle', shortcut: 'R', icon: SquareIcon },
  ellipse: { label: 'Ellipse', shortcut: 'E', icon: CircleIcon },
  triangle: { label: 'Triangle', shortcut: '', icon: TriangleIcon },
  polygon: { label: 'Polygon', shortcut: '', icon: HexagonIcon },
  star: { label: 'Star', shortcut: '', icon: StarIcon },
};

type Shape = keyof typeof SHAPES;

export default function ToolbarMenu() {
  const [tool, setTool] = useState('shape');
  const [shape, setShape] = useState<Shape>('star');
  const Current = SHAPES[shape].icon;
  return (
    <Toolbar>
      <Toolbar.Group value={tool} onValueChange={setTool} aria-label="Tools">
        <Toolbar.Tool value="select" label="Select" shortcut="V">
          <MousePointer2Icon />
        </Toolbar.Tool>
        {/* The tool draws the last shape chosen; the caret beside it picks another. */}
        <Toolbar.Tool value="shape" label={SHAPES[shape].label}>
          <Current />
        </Toolbar.Tool>
        <Menu>
          <Toolbar.Button label="More shapes" render={<Menu.Trigger />}>
            <Toolbar.Caret />
          </Toolbar.Button>
          <Menu.Content align="center">
            <Menu.RadioGroup
              value={shape}
              onValueChange={(next) => {
                setShape(next as Shape);
                setTool('shape');
              }}
            >
              {Object.entries(SHAPES).map(([value, { label, shortcut, icon: Icon }]) => (
                <Menu.RadioItem key={value} value={value}>
                  <Icon />
                  {label}
                  {shortcut ? <Menu.Shortcut>{shortcut}</Menu.Shortcut> : null}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu>
        <Toolbar.Tool value="text" label="Text" shortcut="T">
          <TypeIcon />
        </Toolbar.Tool>
      </Toolbar.Group>
    </Toolbar>
  );
}
