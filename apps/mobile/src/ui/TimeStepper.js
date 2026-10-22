import { View } from 'react-native';
import { ChevronsLeft, ChevronsRight, Minus, Plus } from './icons';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { formatClock } from '../lib/format';

/**
 * Time of day in minutes with +/-15 and +/-60 buttons (no text entry, so no invalid input).
 * @param {{ label: string, value: number, min: number, max: number, onChange: (v: number) => void }} props
 */
export function TimeStepper({ label, value, min, max, onChange }) {
  const { colors } = useTheme();
  /** @param {number} delta */
  const shift = (delta) => onChange(Math.max(min, Math.min(max, value + delta)));
  const ic = { size: 20, color: colors.ink };
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText size={14} weight="bodyMedium">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconButton label={`${label} -60`} onPress={() => shift(-60)} disabled={value <= min}>
          <ChevronsLeft {...ic} />
        </IconButton>
        <IconButton label={`${label} -15`} onPress={() => shift(-15)} disabled={value <= min}>
          <Minus {...ic} />
        </IconButton>
        <AppText
          weight="heading"
          size={22}
          accessibilityLabel={`${label} ${formatClock(value)}`}
          style={{ minWidth: 76, textAlign: 'center' }}
        >
          {formatClock(value)}
        </AppText>
        <IconButton label={`${label} +15`} onPress={() => shift(15)} disabled={value >= max}>
          <Plus {...ic} />
        </IconButton>
        <IconButton label={`${label} +60`} onPress={() => shift(60)} disabled={value >= max}>
          <ChevronsRight {...ic} />
        </IconButton>
      </View>
    </View>
  );
}
