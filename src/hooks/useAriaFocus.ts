import { useFocusRing, useFocusWithin } from 'react-aria';

/**
 * Reusable React Aria focus hook for containers (panels, toolbars, lists).
 * Combines useFocusRing (individual element) and useFocusWithin (entire container).
 *
 * @example
 * const { containerProps, isFocusWithin, isFocusVisible } = useAriaFocus();
 * return <div {...containerProps} data-focus-within={isFocusWithin}>...</div>;
 */
export function useAriaFocus(options: { isDisabled?: boolean } = {}) {
  const { focusProps: focusRingProps, isFocusVisible } = useFocusRing();

  const { focusWithinProps, isFocusWithin } = useFocusWithin({
    isDisabled: options.isDisabled,
    onFocusWithinChange: () => {},
  });

  return {
    containerProps: {
      ...focusWithinProps,
    },
    focusRingProps,
    isFocusWithin,
    isFocusVisible,
  };
}
