import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderThemed } from '../../test/render';
import { AuthForm } from './AuthForm';

const mockAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
};
jest.mock('../../data/AuthProvider', () => ({ useAuth: () => mockAuth }));

const email = () => screen.getByLabelText('Email');
const password = () => screen.getByLabelText('Mật khẩu');
const submit = () => screen.getByRole('button', { name: 'Đăng nhập' });

beforeEach(() => {
  mockAuth.signInWithPassword.mockReset().mockResolvedValue(null);
  mockAuth.signUp.mockReset().mockResolvedValue(null);
});

describe('AuthForm', () => {
  it('asks for a valid email and password before calling the server', async () => {
    await renderThemed(<AuthForm />);
    await fireEvent.press(submit());
    expect(screen.getByText(/Nhập địa chỉ email hợp lệ/)).toBeTruthy();
    expect(screen.getByText(/Mật khẩu cần ít nhất 6 ký tự/)).toBeTruthy();
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in with a trimmed email', async () => {
    await renderThemed(<AuthForm />);
    await fireEvent.changeText(email(), '  ten@congty.vn ');
    await fireEvent.changeText(password(), 'matkhau1');
    await fireEvent.press(submit());
    await waitFor(() =>
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith('ten@congty.vn', 'matkhau1'),
    );
  });

  it('turns a server error into a readable message', async () => {
    mockAuth.signInWithPassword.mockResolvedValue('Invalid login credentials');
    await renderThemed(<AuthForm />);
    await fireEvent.changeText(email(), 'ten@congty.vn');
    await fireEvent.changeText(password(), 'saimatkhau');
    await fireEvent.press(submit());
    await waitFor(() => expect(screen.getByText(/Email hoặc mật khẩu chưa đúng/)).toBeTruthy());
  });

  it('creates an account and tells the person to check their email', async () => {
    await renderThemed(<AuthForm />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Tạo tài khoản' }));
    await fireEvent.changeText(email(), 'moi@congty.vn');
    await fireEvent.changeText(password(), 'matkhau1');
    await fireEvent.press(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(mockAuth.signUp).toHaveBeenCalledWith('moi@congty.vn', 'matkhau1'));
    await waitFor(() => expect(screen.getByText(/Đã gửi email xác nhận/)).toBeTruthy());
  });

  it('offers no social sign-in, only email', async () => {
    await renderThemed(<AuthForm />);
    expect(screen.queryByText(/Google/)).toBeNull();
  });

  it('can show and hide the password', async () => {
    await renderThemed(<AuthForm />);
    expect(password().props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(password().props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toBeTruthy();
  });
});
