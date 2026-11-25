'use client';

import { useState } from 'react';
import { Share } from 'panelui-web/share';

const ROLES = [
  { value: 'viewer', label: 'Viewer', description: 'Can read and comment' },
  { value: 'editor', label: 'Editor', description: 'Can change anything' },
  { value: 'admin', label: 'Admin', description: 'Can also share and delete' },
];

export default function ShareRoles() {
  const [people, setPeople] = useState([
    { name: 'Ines Duarte', email: 'ines@northwind.studio', role: 'admin' },
    { name: 'Sam Whitlock', email: 'sam@northwind.studio', role: 'editor' },
    { name: 'Priya Raman', email: 'priya@northwind.studio', role: 'viewer' },
    { name: 'Tomás Reyes', email: 'tomas@northwind.studio', role: 'viewer' },
  ]);

  return (
    <Share link="https://northwind.studio/f/brand-assets">
      <Share.Trigger />
      <Share.Content title="Share “Brand assets”" side="top">
        <Share.People label="4 people with access">
          {people.map((person) => (
            <Share.Person
              key={person.email}
              name={person.name}
              description={person.email}
              role={person.role}
              roles={ROLES}
              onRoleChange={(role) =>
                setPeople((current) => current.map((item) => (item.email === person.email ? { ...item, role } : item)))
              }
            />
          ))}
        </Share.People>
        <Share.Footer>
          <Share.CopyLink />
        </Share.Footer>
      </Share.Content>
    </Share>
  );
}
