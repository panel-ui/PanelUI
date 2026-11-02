import { useRef } from 'react';
import { Input } from 'panelui-native/components/input';
import { Button } from 'panelui-native/components/button';
import type { TextInputRef, ViewRef } from 'panelui-native/primitives/refs';

function Form() {
  const input = useRef<TextInputRef>(null);
  const button = useRef<ViewRef>(null);

  // The instance methods survive the alias.
  input.current?.focus();
  input.current?.clear();
  const focused: boolean | undefined = input.current?.isFocused();
  button.current?.measure(() => {});

  void focused;
  return (
    <>
      <Input ref={input} />
      <Button ref={button}>Save</Button>
    </>
  );
}

void Form;
