import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

/**
 * @param {import('react-native').TextProps & { tone?: 'ink' | 'muted' | 'accent' | 'accentInk' | 'danger' | 'ok', weight?: 'body' | 'bodyMedium' | 'bodyBold' | 'heading', size?: number }} props
 */
export function AppText({ tone = 'ink', weight = 'body', size = 15, style, ...rest }) {
  const { colors } = useTheme();
  return (
    <Text
      {...rest}
      style={[{ color: colors[tone], fontFamily: fonts[weight], fontSize: size }, style]}
    />
  );
}
