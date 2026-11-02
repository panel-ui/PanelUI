'use client';

import { NotFound } from 'panelui-web/not-found';
import { Button } from 'panelui-web/button';

export default function NotFoundPage() {
  return (
    <NotFound>
      <NotFound.Code />
      <NotFound.Title as="h2">Nothing lives at this address</NotFound.Title>
      <NotFound.Description>
        The link may be mistyped, or the page has moved somewhere else.
      </NotFound.Description>
      <NotFound.Actions>
        <Button render={<a href="#" />}>Take me home</Button>
        <Button variant="ghost" render={<a href="#" />}>
          Report the link
        </Button>
      </NotFound.Actions>
    </NotFound>
  );
}
