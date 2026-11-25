'use client';

import { useState } from 'react';
import { Share, type ShareInvitation } from 'panelui-web/share';

const ROLES = [
  { value: 'viewer', label: 'Viewer', description: 'Can read and comment' },
  { value: 'editor', label: 'Editor', description: 'Can change anything' },
];

const START = [
  {
    name: 'Khalid Abdi',
    email: 'khalid@northwind.studio',
    role: 'Owner',
    src: 'https://avatars.githubusercontent.com/u/127331761?v=4',
  },
  { name: 'Ines Duarte', email: 'ines@northwind.studio', role: 'editor' },
  { name: 'Sam Whitlock', email: 'sam@northwind.studio', role: 'viewer' },
];

/** "lena.ortiz@…" reads as "Lena Ortiz" until they set a name of their own. */
function nameFrom(email: string) {
  return email
    .split('@')[0]!
    .split(/[._-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ShareOverview() {
  const [people, setPeople] = useState(START);

  const invite = ({ emails, role }: ShareInvitation) =>
    new Promise<void>((resolve) =>
      setTimeout(() => {
        setPeople((current) => [...current, ...emails.map((email) => ({ name: nameFrom(email), email, role }))]);
        resolve();
      }, 900),
    );

  return (
    <Share link="https://northwind.studio/d/spring-lookbook" onInvite={invite}>
      <Share.Trigger people={people} />
      <Share.Content title="Share “Spring lookbook”">
        <Share.Invite roles={ROLES} />
        <Share.People>
          {people.map((person) => (
            <Share.Person key={person.email} name={person.name} src={person.src} role={person.role} roles={ROLES} />
          ))}
        </Share.People>
        <Share.Footer>
          <Share.CopyLink />
          <Share.Send />
        </Share.Footer>
      </Share.Content>
    </Share>
  );
}
