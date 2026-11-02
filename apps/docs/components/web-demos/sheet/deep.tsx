'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';
import { Frame } from 'panelui-web/frame';
import { Sheet } from 'panelui-web/sheet';

interface Item {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

const ITEMS: Item[] = [
  { id: 'oats', name: 'Rolled oats, 1 kg', quantity: 2, price: 3.4 },
  { id: 'figs', name: 'Dried figs', quantity: 1, price: 4.25 },
  { id: 'milk', name: 'Oat milk, 1 L', quantity: 4, price: 1.95 },
  { id: 'coffee', name: 'Coffee beans, 500 g', quantity: 1, price: 11.9 },
];

const money = (value: number) => `£${value.toFixed(2)}`;

export default function SheetDeep() {
  const [items, setItems] = useState(ITEMS);
  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <Sheet onOpenChange={(open) => open && setItems(ITEMS)}>
      <Sheet.Trigger render={<Button variant="outline" />}>Review order</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header title="Order 2841" description={`Delivery Saturday, 09:00–11:00 · ${money(total)}`} />
        <Sheet.Body>
          <Frame variant="plain">
            <Frame.Panel>
              {items.map((item) => (
                <Sheet.Trigger key={item.id} to="item" payload={item} render={<Frame.Row chevron />}>
                  <Frame.Content>
                    <Frame.Title as="p">{item.name}</Frame.Title>
                    <Frame.Description>
                      {item.quantity} × {money(item.price)}
                    </Frame.Description>
                  </Frame.Content>
                  <Frame.Actions className="text-sm tabular-nums">{money(item.quantity * item.price)}</Frame.Actions>
                </Sheet.Trigger>
              ))}
            </Frame.Panel>
          </Frame>
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button size="lg" />}>Place order</Sheet.Close>
        </Sheet.Footer>

        {/* The second sheet: one for every item. */}
        <Sheet.Next name="item">
          {(item: Item) => (
            <>
              <Sheet.Header title={item.name} description={`${money(item.price)} each`} />
              <Sheet.Body className="flex flex-col gap-4">
                <Field>
                  <Field.Label>Quantity</Field.Label>
                  <Input type="number" min={1} defaultValue={item.quantity} />
                </Field>
                <Field>
                  <Field.Label>Note for the picker</Field.Label>
                  <Input placeholder="A substitute is fine" />
                </Field>
              </Sheet.Body>
              <Sheet.Footer>
                <Sheet.Close render={<Button size="lg" />}>Save</Sheet.Close>
                <Sheet.Trigger to="remove" payload={item} render={<Button size="lg" variant="destructive" />}>
                  Remove from order
                </Sheet.Trigger>
              </Sheet.Footer>

              {/* The third, opened from the second. */}
              <Sheet.Next name="remove">
                {(target: Item) => (
                  <>
                    <Sheet.Header
                      title={`Remove ${target.name.toLowerCase()}?`}
                      description="You can add it again until the order is packed on Friday evening."
                    />
                    <Sheet.Footer>
                      <Sheet.Close
                        render={
                          <Button
                            size="lg"
                            variant="destructive"
                            onClick={() => setItems((all) => all.filter((each) => each.id !== target.id))}
                          />
                        }
                      >
                        Remove
                      </Sheet.Close>
                      <Sheet.Close render={<Button size="lg" variant="ghost" />}>Keep it</Sheet.Close>
                    </Sheet.Footer>
                  </>
                )}
              </Sheet.Next>
            </>
          )}
        </Sheet.Next>
      </Sheet.Content>
    </Sheet>
  );
}
