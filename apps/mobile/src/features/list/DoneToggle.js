import { Eye, EyeOff } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { ChipButton } from '../../ui/ChipButton';

/**
 * Button that hides or shows the tasks already done, with how many there are.
 * @param {{ count: number, hidden: boolean, onToggle: () => void }} props
 */
export function DoneToggle({ count, hidden, onToggle }) {
  const { t } = useTranslation();
  const Icon = hidden ? Eye : EyeOff;
  return (
    <ChipButton
      role="switch"
      checked={hidden}
      label={hidden ? t('list.showDone', { n: count }) : t('list.hideDone', { n: count })}
      icon={(p) => <Icon {...p} />}
      onPress={onToggle}
    />
  );
}
