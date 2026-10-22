import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Minus, Plus, Wind, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../../theme/tokens';
import { formatDuration } from '../../lib/format';

const STEP = 15;
const MIN = 15;
const MAX = 180;

/**
 * Edit duration (15..180 min, step 15), energy and "do last" for a leaf task.
 * @param {{
 *   node: import('@slotwise/core/types.js').TreeNode | null,
 *   onSave: (patch: { durationMin: number, energy: 'heavy' | 'light', doLast: boolean }) => void,
 *   onClose: () => void,
 * }} props
 */
export function EditSheet({ node, onSave, onClose }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [duration, setDuration] = useState(60);
  const [energy, setEnergy] = useState(/** @type {'heavy' | 'light'} */ ('heavy'));
  const [doLast, setDoLast] = useState(false);

  useEffect(() => {
    if (!node) return;
    setDuration(node.durationMin);
    setEnergy(node.energy);
    setDoLast(node.doLast);
  }, [node]);

  return (
    <Sheet visible={!!node} title={t('edit.title')} onClose={onClose}>
      <AppText tone="muted" size={13}>
        {node?.title}
      </AppText>
      <AppText weight="bodyBold">{t('edit.duration')}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <IconButton
          label="-15"
          onPress={() => setDuration((d) => Math.max(MIN, d - STEP))}
          disabled={duration <= MIN}
        >
          <Minus size={20} color={colors.ink} />
        </IconButton>
        <AppText weight="bodyBold" size={18} style={{ minWidth: 110, textAlign: 'center' }}>
          {formatDuration(duration, t)}
        </AppText>
        <IconButton
          label="+15"
          onPress={() => setDuration((d) => Math.min(MAX, d + STEP))}
          disabled={duration >= MAX}
        >
          <Plus size={20} color={colors.ink} />
        </IconButton>
      </View>
      <AppText weight="bodyBold">{t('edit.energy')}</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {['heavy', 'light'].map((e) => {
          const active = energy === e;
          const Icon = e === 'heavy' ? Zap : Wind;
          return (
            <Pressable
              key={e}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setEnergy(/** @type {'heavy' | 'light'} */ (e))}
              style={{
                flex: 1,
                minHeight: MIN_TOUCH,
                flexDirection: 'row',
                gap: spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.accent : colors.line,
                backgroundColor: colors.bg,
              }}
            >
              <Icon size={18} color={e === 'heavy' ? colors.heavy : colors.light} />
              <AppText weight={active ? 'bodyBold' : 'body'}>{t(`energy.${e}`)}</AppText>
            </Pressable>
          );
        })}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: MIN_TOUCH,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText weight="bodyBold">{t('edit.doLast')}</AppText>
          <AppText size={13} tone="muted">
            {t('edit.doLastHint')}
          </AppText>
        </View>
        <Switch
          value={doLast}
          onValueChange={setDoLast}
          accessibilityLabel={t('edit.doLast')}
          trackColor={{ true: colors.accent, false: colors.line }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
        <Button title={t('common.cancel')} variant="secondary" onPress={onClose} />
        <Button
          title={t('common.save')}
          onPress={() => {
            onSave({ durationMin: duration, energy, doLast });
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}
