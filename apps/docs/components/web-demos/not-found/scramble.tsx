'use client';

import { NotFound } from 'panelui-web/not-found';
import { Button } from 'panelui-web/button';

export default function NotFoundScramble() {
  return (
    <NotFound>
      <NotFound.Code effect="scramble" />
      <NotFound.Title as="h2">We looked everywhere</NotFound.Title>
      <NotFound.Description>
        No page matches that address. Check the spelling, or start again from the front page.
      </NotFound.Description>
      <NotFound.Actions>
        <Button render={<a href="#" />}>Front page</Button>
      </NotFound.Actions>
    </NotFound>
  );
}
