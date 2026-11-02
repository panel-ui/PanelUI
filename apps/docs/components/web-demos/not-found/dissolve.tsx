'use client';

import { NotFound } from 'panelui-web/not-found';
import { Button } from 'panelui-web/button';

export default function NotFoundDissolve() {
  return (
    <NotFound>
      <NotFound.Code effect="dissolve" />
      <NotFound.Title as="h2">This page was taken down</NotFound.Title>
      <NotFound.Description>It was removed or archived. Search for what replaced it.</NotFound.Description>
      <NotFound.Actions>
        <Button variant="outline" render={<a href="#" />}>
          Search
        </Button>
      </NotFound.Actions>
    </NotFound>
  );
}
