import { View } from 'react-native';
import { useKeyboardInset } from '../lib/useKeyboardInset';

/** Put at the end of a scrolling form so its last field can scroll above the keyboard. */
export function KeyboardSpacer() {
  const inset = useKeyboardInset();
  return <View style={{ height: inset }} />;
}
