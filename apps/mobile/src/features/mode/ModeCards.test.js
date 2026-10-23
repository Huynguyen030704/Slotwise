import { fireEvent, screen } from '@testing-library/react-native';
import { renderThemed } from '../../test/render';
import { ModeCards } from './ModeCards';

describe('ModeCards', () => {
  it('shows both options and marks the current one as selected', async () => {
    await renderThemed(<ModeCards value="tasks" onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0].props.accessibilityState.selected).toBe(false);
    expect(radios[1].props.accessibilityState.selected).toBe(true);
  });

  it('reports the chosen mode', async () => {
    const onChange = jest.fn();
    await renderThemed(<ModeCards value="schedule" onChange={onChange} />);
    await fireEvent.press(screen.getAllByRole('radio')[1]);
    expect(onChange).toHaveBeenCalledWith('tasks');
  });
});
