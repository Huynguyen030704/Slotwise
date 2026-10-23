import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Coffee, Users } from '../../ui/icons';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { AppText } from '../../ui/AppText';
import { Input } from '../../ui/Input';
import { TimeStepper } from '../../ui/TimeStepper';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../../theme/tokens';

const STEP = 15;

/**
 * Add or edit a recurring block. `block` is null to add; the sheet is closed when `open` is false.
 * @param {{
 *   open: boolean,
 *   block: import('@slotwise/core/settings.js').FixedBlockDef | null,
 *   workStartMin: number,
 *   workEndMin: number,
 *   onSave: (b: { kind: 'meeting' | 'lunch', label: string, startMin: number, endMin: number }) => void,
 *   onClose: () => void,
 * }} props
 */
export function BlockSheet({ open, block, workStartMin, workEndMin, onSave, onClose }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [kind, setKind] = useState(/** @type {'meeting' | 'lunch'} */ ('meeting'));
  const [label, setLabel] = useState('');
  const [start, setStart] = useState(600);
  const [end, setEnd] = useState(660);

  useEffect(() => {
    if (!open) return;
    setKind(block?.kind ?? 'meeting');
    setLabel(block?.label ?? '');
    setStart(block?.startMin ?? Math.max(workStartMin, 600));
    setEnd(block?.endMin ?? Math.max(workStartMin, 600) + 60);
  }, [open, block, workStartMin]);

  /** Keep the end after the start when either moves. @param {number} v */
  const moveStart = (v) => {
    setStart(v);
    if (end <= v) setEnd(v + STEP);
  };
  /** @param {number} v */
  const moveEnd = (v) => {
    setEnd(v);
    if (start >= v) setStart(v - STEP);
  };

  return (
    <Sheet
      visible={open}
      title={block ? t('prefs.blockEdit') : t('prefs.blockAdd')}
      onClose={onClose}
    >
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {['lunch', 'meeting'].map((k) => {
          const active = kind === k;
          const Icon = k === 'lunch' ? Coffee : Users;
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setKind(/** @type {'meeting' | 'lunch'} */ (k))}
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
              <Icon size={18} color={colors.ink} />
              <AppText weight={active ? 'bodyBold' : 'body'}>{t(`prefs.kind.${k}`)}</AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: spacing.xs }}>
        <AppText size={14} weight="bodyMedium">
          {t('prefs.blockName')}
        </AppText>
        <Input
          value={label}
          onChangeText={setLabel}
          maxLength={40}
          accessibilityLabel={t('prefs.blockName')}
          placeholder={t(`calendar.${kind}`)}
        />
      </View>
      <TimeStepper
        label={t('prefs.blockStart')}
        value={start}
        min={0}
        max={1440 - STEP}
        onChange={moveStart}
      />
      <TimeStepper
        label={t('prefs.blockEnd')}
        value={end}
        min={STEP}
        max={1440}
        onChange={moveEnd}
      />
      {start < workStartMin || end > workEndMin ? (
        <AppText size={13} tone="muted">
          {t('prefs.blockOutside')}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
        <Button title={t('common.cancel')} variant="secondary" onPress={onClose} />
        <Button
          title={t('common.save')}
          onPress={() => {
            onSave({ kind, label: label.trim(), startMin: start, endMin: end });
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}
