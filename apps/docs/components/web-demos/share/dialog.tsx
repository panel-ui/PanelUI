'use client';

import { useState } from 'react';
import { Share } from 'panelui-web/share';

const ROLES = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'commenter', label: 'Commenter' },
  { value: 'editor', label: 'Editor' },
];

const LINK_ACCESS = [
  { value: 'none', label: 'No access' },
  { value: 'view', label: 'Can view' },
  { value: 'edit', label: 'Can edit' },
];

export default function ShareDialog() {
  const [access, setAccess] = useState('view');
  return (
    <Share presentation="dialog" link="https://northwind.studio/b/q1-roadmap">
      <Share.Trigger />
      <Share.Content title="Share “Q1 roadmap”">
        <Share.Invite roles={ROLES} />
        <Share.Access
          title="Anyone with the link"
          description={access === 'none' ? 'Only people added can open it' : 'No sign-in needed'}
          options={LINK_ACCESS}
          value={access}
          onValueChange={setAccess}
        />
        <Share.Footer>
          <Share.CopyLink />
          <Share.Send />
        </Share.Footer>
      </Share.Content>
    </Share>
  );
}
