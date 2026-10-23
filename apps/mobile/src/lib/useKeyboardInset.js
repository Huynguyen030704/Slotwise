import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height (px) the on-screen keyboard covers at the bottom of the layout viewport, 0 when closed.
 * Phones' browsers keep the layout viewport the same size and only shrink the visual one, so
 * bottom sheets and the last form fields would hide behind the keyboard. Android apps already
 * resize the window themselves, so only the web and iOS report an inset.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const vv = typeof window !== 'undefined' ? window.visualViewport : null;
      if (!vv) return undefined;
      const update = () =>
        setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
      update();
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      return () => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      };
    }
    if (Platform.OS === 'ios') {
      const show = Keyboard.addListener('keyboardWillShow', (e) =>
        setInset(e.endCoordinates.height),
      );
      const hide = Keyboard.addListener('keyboardWillHide', () => setInset(0));
      return () => {
        show.remove();
        hide.remove();
      };
    }
    return undefined;
  }, []);

  // A few px is browser chrome moving, not a keyboard.
  return inset > 80 ? inset : 0;
}
