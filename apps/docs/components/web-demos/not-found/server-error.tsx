'use client';

import { NotFound } from 'panelui-web/not-found';
import { Button } from 'panelui-web/button';

export default function NotFoundServerError() {
  return (
    <NotFound>
      <NotFound.Code code="500" color="destructive" label="Error 500, server error" />
      <NotFound.Title as="h2">Something broke on our side</NotFound.Title>
      <NotFound.Description>The server could not finish the request. Try again in a minute.</NotFound.Description>
      <NotFound.Actions>
        <Button variant="outline">Try again</Button>
      </NotFound.Actions>
    </NotFound>
  );
}
