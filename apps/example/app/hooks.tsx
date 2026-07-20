import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Frame,
  Input,
  ScrollFade,
  Shimmer,
  Text,
  useBreakpoint,
  useCopyToClipboard,
  useDebouncedValue,
  useDisclosure,
  useKeyboard,
  usePrevious,
} from 'panelui-native';
import { ScreenHeader } from '../src/components/screen-header';

const TAGS = [
  'Overlays', 'Forms', 'Feedback', 'Layout', 'Navigation',
  'Typography', 'Data', 'Media', 'Motion', 'Theming',
];

/** One documented hook, with its live value beside it. */
function HookCard({
  name,
  summary,
  children,
}: {
  name: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full">
      <Card.Header>
        <Card.Title>{name}</Card.Title>
        <Card.Description>{summary}</Card.Description>
      </Card.Header>
      <Card.Content className="gap-3">{children}</Card.Content>
    </Card>
  );
}

export default function HooksScreen() {
  const { copy, copied } = useCopyToClipboard();
  const sheet = useDisclosure();
  const { current, width, isLandscape } = useBreakpoint();
  const { height: keyboardHeight, isVisible } = useKeyboard();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 400);
  const previous = usePrevious(debounced);

  return (
    <View className="flex-1">
      <ScreenHeader title="Hooks" showBack />

      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-16"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HookCard
          name="useCopyToClipboard"
          summary="Copies text and flips a flag for a moment afterwards."
        >
          <Button onPress={() => copy('https://panelui.dev')} fullWidth>
            {copied ? 'Copied' : 'Copy panelui.dev'}
          </Button>
        </HookCard>

        <HookCard
          name="useDisclosure"
          summary="Overlay state you can drive from anywhere."
        >
          <Button variant="outline" fullWidth onPress={sheet.open}>
            Open sheet
          </Button>
          <Text size="sm" muted>
            isOpen: {String(sheet.isOpen)}
          </Text>

          <BottomSheet {...sheet.props}>
            <BottomSheet.Content>
              <Text size="lg" weight="semibold" className="mb-1">
                Opened by the hook
              </Text>
              <Text size="sm" muted className="mb-4">
                The trigger lives outside the sheet — nothing was wired
                together by hand.
              </Text>
              <Button fullWidth onPress={sheet.close}>
                Close
              </Button>
            </BottomSheet.Content>
          </BottomSheet>
        </HookCard>

        <HookCard
          name="useBreakpoint"
          summary="Responsive state, for when behaviour changes rather than styling."
        >
          <Frame>
            <Frame.Panel>
              <Frame.Row>
                <Text size="sm" className="flex-1">
                  current
                </Text>
                <Badge variant="secondary">{current}</Badge>
              </Frame.Row>
              <Frame.Row divided>
                <Text size="sm" className="flex-1">
                  width
                </Text>
                <Text size="sm" muted>
                  {Math.round(width)}px
                </Text>
              </Frame.Row>
              <Frame.Row divided>
                <Text size="sm" className="flex-1">
                  isLandscape
                </Text>
                <Text size="sm" muted>
                  {String(isLandscape)}
                </Text>
              </Frame.Row>
            </Frame.Panel>
          </Frame>
        </HookCard>

        <HookCard
          name="useKeyboard"
          summary="Height and visibility. Focus the field below to watch it."
        >
          <Input placeholder="Focus me" />
          <Frame>
            <Frame.Panel>
              <Frame.Row>
                <Text size="sm" className="flex-1">
                  isVisible
                </Text>
                <Badge variant={isVisible ? 'success' : 'secondary'}>
                  {String(isVisible)}
                </Badge>
              </Frame.Row>
              <Frame.Row divided>
                <Text size="sm" className="flex-1">
                  height
                </Text>
                <Text size="sm" muted>
                  {Math.round(keyboardHeight)}px
                </Text>
              </Frame.Row>
            </Frame.Panel>
          </Frame>
        </HookCard>

        <HookCard
          name="useDebouncedValue + usePrevious"
          summary="The field stays live; the debounced copy settles 400ms later."
        >
          <Input value={query} onChangeText={setQuery} placeholder="Type here" />
          <Frame>
            <Frame.Panel>
              <Frame.Row>
                <Text size="sm" className="flex-1">
                  live
                </Text>
                <Text size="sm" muted>
                  {query || '—'}
                </Text>
              </Frame.Row>
              <Frame.Row divided>
                <Text size="sm" className="flex-1">
                  debounced
                </Text>
                <Text size="sm" muted>
                  {debounced || '—'}
                </Text>
              </Frame.Row>
              <Frame.Row divided>
                <Text size="sm" className="flex-1">
                  previous
                </Text>
                <Text size="sm" muted>
                  {previous || '—'}
                </Text>
              </Frame.Row>
            </Frame.Panel>
          </Frame>
        </HookCard>

        <HookCard
          name="ScrollFade"
          summary="Edges fade only once there is content past them — scroll to see."
        >
          {/* The list sits on a Card, so the fade has to blend into the card
              rather than the page. */}
          <ScrollFade size={40} color="var(--color-card)" className="-mx-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 px-2"
            >
              {TAGS.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </ScrollView>
          </ScrollFade>
        </HookCard>

        <HookCard
          name="ScrollFade — vertical"
          summary="No horizontal prop on the child, so the fades move to the top and bottom."
        >
          <ScrollFade size={36} color="var(--color-card)" className="h-40">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-3">
                {TAGS.map((tag) => (
                  <Text key={tag} size="sm">
                    {tag}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </ScrollFade>
        </HookCard>

        <HookCard
          name="Shimmer"
          summary="A highlight sweeping across content, for loading states."
        >
          <Shimmer>
            <Text muted>Generating response…</Text>
          </Shimmer>
          <Shimmer duration={1200} intensity={0.6}>
            <Text size="lg" weight="medium">
              Thinking…
            </Text>
          </Shimmer>
        </HookCard>
      </ScrollView>
    </View>
  );
}
