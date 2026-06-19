import { useRef } from 'react';
import { useButton, useFocusRing, useHover } from 'react-aria';
import type { AriaButtonProps } from 'react-aria';

/**
 * Reusable React Aria button hook.
 * Combines useButton (keyboard/touch/pointer), useFocusRing (keyboard-only focus),
 * and useHover (precise hover detection) into a single ready-to-spread props object.
 *
 * @example
 * const { ref, buttonProps, isPressed, isHovered, isFocusVisible } = useAriaButton({ onPress: handlePress });
 * return <button ref={ref} {...buttonProps}>Click me</button>;
 */
export function useAriaButton(props: AriaButtonProps<'button'> = {}) {
  const ref = useRef<HTMLButtonElement>(null);

  const { buttonProps, isPressed } = useButton(props, ref);
  const { focusProps, isFocusVisible } = useFocusRing();
  const { hoverProps, isHovered } = useHover({ isDisabled: props.isDisabled });

  return {
    ref,
    buttonProps: {
      ...buttonProps,
      ...focusProps,
      ...hoverProps,
    },
    isPressed,
    isHovered,
    isFocusVisible,
  };
}
