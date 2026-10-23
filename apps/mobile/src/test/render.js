import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../theme/ThemeProvider';

/** Render with the pieces every screen needs (gesture root, theme). Async since Testing Library 14. */
export async function renderThemed(ui) {
  return await render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>{ui}</ThemeProvider>
    </GestureHandlerRootView>,
  );
}
