import { Message } from 'panelui-web/message';
import { Spinner } from 'panelui-web/spinner';

export default function SpinnerDots() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Message from="user">
        <Message.Content>
          <Message.Bubble>
            <Message.BubbleContent>Can you move standup to 10:30?</Message.BubbleContent>
          </Message.Bubble>
        </Message.Content>
      </Message>
      <Spinner variant="dots" size="lg" className="text-muted-foreground" label="Writing a reply" />
    </div>
  );
}
