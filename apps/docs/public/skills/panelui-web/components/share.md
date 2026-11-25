# Share

Invite people by email, choose what they can do, and copy the link.

```tsx
import { Share } from "@/components/panelui/share"
```

From npm the path is `panelui-web/share`. Install with `npx shadcn@latest add @panelui/share`.

## When to use it

Use it to give other people access to one document, board or file. The panel puts the job in the order it is done: who to add, who already has access, and the two ways to send it, an invitation or the link.

Addresses typed into the field become chips, so several can be invited at once with one role. Sending and copying answer in the button that was pressed, which keeps its width while its label changes.

It opens as a popover beside its trigger, or with `presentation="dialog"` in the middle of the screen. For a dialog with a different job, use [Dialog](/docs/web/components/dialog).

## Usage

```tsx
<Share link={url} onInvite={({ emails, role }) => invite(emails, role)}>
  <Share.Trigger people={members} />
  <Share.Content title="Share “Spring lookbook”">
    <Share.Invite roles={ROLES} />
    <Share.People>
      {members.map((member) => (
        <Share.Person key={member.email} name={member.name} role={member.role} />
      ))}
    </Share.People>
    <Share.Footer>
      <Share.CopyLink />
      <Share.Send />
    </Share.Footer>
  </Share.Content>
</Share>
```

## Parts

```tsx
<Share>
  <Share.Trigger />
  <Share.Content>
    <Share.Invite>
      <Share.RoleSelect />
    </Share.Invite>
    <Share.Access />
    <Share.People>
      <Share.Person />
    </Share.People>
    <Share.Footer>
      <Share.CopyLink />
      <Share.Send />
    </Share.Footer>
  </Share.Content>
</Share>
```

- `Share.Trigger` — The pill that opens it. `people` draws up to three faces at its start, so the button also says who has access already.
- `Share.Content` — The panel and the band around it. `title` is the heading and what the panel is announced as. The close button is drawn for you.
- `Share.Invite` — The field for addresses. Each one becomes a chip after Enter, a comma or a space, and Backspace in an empty field takes the last one back. `roles` sets the select at its end.
- `Share.RoleSelect` — The compact role select used in the field and beside each person. Use it on its own for a role select of your own.
- `Share.Access` — A row saying who can open it from the link alone, with a select of levels.
- `Share.People` — Who already has access, under a heading. `label` changes the heading.
- `Share.Person` — One person: initials or picture, name, an optional second line, and their role. With `roles` and `onRoleChange`, the role is a select.
- `Share.Footer` — The buttons, as equal pills in the band under the panel, wherever it is written.
- `Share.CopyLink` — Copies `link` and says "Copied" for a moment.
- `Share.Send` — Calls `onInvite`. It shows Sending while the returned promise is pending, then Sent, then clears the field.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ShareProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `presentation` | `'popover' \| 'dialog'` | `'popover'` | `popover` opens beside the trigger; `dialog` in the middle of the screen. Default `popover`. |
| `open` | `boolean` | — | Whether it is open, when the caller holds that. |
| `defaultOpen` | `boolean` | — | Whether it starts open, when the caller does not hold it. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when it opens or closes. |
| `link` | `string` | — | The address `Share.CopyLink` copies. |
| `onCopy` | `(link: string) => void` | — | Called after the link has been copied. |
| `onInvite` | `(invitation: ShareInvitation) => void \| Promise<unknown>` | — | Called by `Share.Send` with the addresses and the role. Return a promise to keep the button spinning until it settles; a rejected promise puts the button back without clearing the field. |
| `defaultRole` | `string` | `'viewer'` | The role the invite field starts on. Default the first in `Share.Invite`'s `roles`, or `viewer`. |
| `sentDuration` | `number` | `1600` | How long "Sent" shows before the button is ready again, in ms. Default `1600`. |

#### `ShareTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `people` | `ShareFace[]` | — | Who already has access, drawn as overlapping faces at the button's start. Three show. |

#### `ShareContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | **required** | The heading: `Share “Launch notes”`. It is what the panel is announced as. |
| `icon` | `ReactNode` | — | The glyph beside the title. Default the share glyph; `null` for none. |
| `side` | `BasePopover.Positioner.Props['side']` | `'bottom'` | For a popover: which side of the trigger it opens on. Default `bottom`. |
| `align` | `BasePopover.Positioner.Props['align']` | `'end'` | For a popover: how it lines up with the trigger. Default `end`. |
| `sideOffset` | `number` | `8` | For a popover: the gap to the trigger, in px. Default `8`. |

#### `ShareRoleSelectProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `roles` | `ShareRole[]` | **required** | The roles to choose from. |
| `value` | `string` | **required** | The chosen role's `value`. |
| `onValueChange` | `(value: string) => void` | **required** | Called with the new role's `value`. |
| `disabled` | `boolean` | — | — |
| `className` | `string` | — | — |

#### `ShareInviteProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `roles` | `ShareRole[]` | — | The roles the field offers. Default Viewer and Editor. Pass `[]` for no role select. |
| `placeholder` | `string` | `'Add people by email'` | The field's placeholder. Default "Add people by email". |

#### `SharePeopleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | — | The heading over the list. Default "People with access"; `null` for none. |

#### `SharePersonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `name` | `string` | **required** | Their name. |
| `description` | `ReactNode` | — | A second line, such as their email. |
| `src` | `string` | — | A picture. Without it, the initials show. |
| `role` | `string` | — | Their role's `value`, or text for a role that cannot be changed: "Owner". |
| `roles` | `ShareRole[]` | — | The roles they can be given. With `onRoleChange`, the role becomes a select. |
| `onRoleChange` | `(role: string) => void` | — | Called with the new role's `value`. |

#### `ShareAccessProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | **required** | The line: "Anyone with the link". |
| `description` | `ReactNode` | — | A line under it: "Can open it without signing in". |
| `icon` | `ReactNode` | — | The glyph at the start. Default a globe. |
| `options` | `ShareRole[]` | **required** | The levels to choose from, such as No access, Can view, Can edit. |
| `value` | `string` | **required** | The chosen level's `value`. |
| `onValueChange` | `(value: string) => void` | **required** | Called with the new level's `value`. |

#### `ShareCopyLinkProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `copiedLabel` | `ReactNode` | `'Copied'` | The label once copied. Default "Copied". |

## In a Server Component

`Share` is a client component. A Server Component cannot read `Share.Trigger` off the import, so import each part by name: `ShareTrigger`, `ShareContent`, `ShareInvite`, `ShareRoleSelect`, `SharePeople`, `SharePerson`, `ShareAccess`, `ShareFooter`, `ShareCopyLink`, `ShareSend`.

## Notes

#### Sending

`onInvite` is called with `{ emails, role }`. Everyone chipped in the field is included, and so is a complete address still being typed. Return a promise to keep the button spinning until it settles. When it resolves, the button shows Sent and the field is cleared. When it rejects, the button goes back to Send and the addresses stay, so they can be sent again.

Adding the new people to `Share.People` is up to you. The first example does it in `onInvite`.

#### The keyboard

Enter in the field turns the typed address into a chip. Enter in an empty field sends. Escape closes the panel and returns focus to the trigger.

#### Screen readers

The panel is announced by its title. Both buttons announce what happened, "Invitation sent" and "Link copied", through a live region. Each person's role select is named for them, as "Role for Ines Duarte".

## Example

```tsx
'use client';

import { useState } from 'react';
import { Share, type ShareInvitation } from '@/components/panelui/share';

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
```
