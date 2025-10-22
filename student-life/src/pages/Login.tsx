// src/pages/Login.tsx
import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { apiRequest } from '@/api/http'; // wrapper: tự gắn Bearer + auto refresh 401

// ===========================================
// ICONINPUT COMPONENT
// ===========================================
const IconInput = (props: {
  id: string;
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  icon: ReactNode;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}) => (
  <div>
    {props.label && <Label htmlFor={props.id}>{props.label}</Label>}
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80">
        {props.icon}
      </div>
      <Input
        id={props.id}
        type={props.type ?? 'text'}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="pl-10"
        {...props.inputProps}
      />
    </div>
  </div>
);

// ===========================================
// TYPE DEFINITIONS
// /users/login -> ResponseDTO{ data: { userDTO, token } }  (cũ)
// hoặc { accessToken, refreshToken, userDTO } (mới, nếu đã nâng cấp BE)
// /users/refresh -> { accessToken, refreshToken }
// ===========================================
type UserDTO = {
  id: string;
  userName: string;
  email?: string;
};

type LoginRes =
  | { token: string; userDTO?: UserDTO } // BE cũ: chỉ trả refreshToken ở field "token"
  | { refreshToken: string; accessToken?: string; userDTO?: UserDTO }; // BE mới

type RefreshRes = {
  accessToken: string;
  refreshToken: string;
};

// ===========================================
// MAIN LOGIN COMPONENT
// ===========================================
const Login = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password (mock)
  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [info, setInfo] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      const body = {
        userName: userName.trim(),
        password: password.trim(),
      };
      if (!body.userName || !body.password) throw new Error('Vui lòng nhập username và mật khẩu');

      // 1) LOGIN => lấy refresh token (+ có thể có access token nếu BE đã nâng cấp)
      const loginData = await apiRequest<LoginRes>('/users/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // 2) LẤY & LƯU TOKEN
      const refreshToken =
        ('token' in loginData && loginData.token) ||
        ('refreshToken' in loginData && loginData.refreshToken);
      if (!refreshToken) throw new Error('Server không trả về refresh token');

      let accessToken =
        'accessToken' in loginData && loginData.accessToken ? loginData.accessToken : '';

      if (!accessToken) {
        // đổi từ RT -> AT
        const refreshData = await apiRequest<RefreshRes>('/users/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
        accessToken = refreshData.accessToken;
        localStorage.setItem('refreshToken', refreshData.refreshToken);
      } else {
        // đồng bộ RT nếu BE mới có trả lại, nếu không thì dùng RT lấy từ login
        if ('refreshToken' in loginData && loginData.refreshToken) {
          localStorage.setItem('refreshToken', loginData.refreshToken);
        } else {
          localStorage.setItem('refreshToken', refreshToken);
        }
      }

      // Lưu AT
      localStorage.setItem('accessToken', accessToken);

      // Lưu user nếu có
      if ('userDTO' in loginData && loginData.userDTO) {
        localStorage.setItem('user', JSON.stringify(loginData.userDTO));
      }

      // 3) ĐIỀU HƯỚNG SAU KHI TOKEN ĐÃ CÓ
      const from =
        (history.state && (history.state as any)?.usr?.from?.pathname) || '/';
      setInfo('Đăng nhập thành công! Đang chuyển hướng...');
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('❌ Lỗi đăng nhập:', err);
      setError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      if (forgotStep === 1) {
        if (!forgotEmail) return setError('Vui lòng nhập email');
        const code = '123456'; // mock
        setSentCode(code);
        setInfo('Mã xác minh đã được gửi tới email của bạn.');
        setForgotStep(2);
      } else if (forgotStep === 2) {
        if (!inputCode) return setError('Vui lòng nhập mã xác minh');
        if (inputCode !== sentCode) return setError('Mã xác minh không đúng');
        setForgotStep(3);
        setInfo('Mã xác minh hợp lệ. Vui lòng nhập mật khẩu mới.');
      } else if (forgotStep === 3) {
        if (!newPassword || !confirmNewPassword) return setError('Vui lòng nhập đầy đủ mật khẩu mới');
        if (newPassword.length < 6) return setError('Mật khẩu mới phải có ít nhất 6 ký tự');
        if (newPassword !== confirmNewPassword) return setError('Xác nhận mật khẩu không khớp');

        setInfo('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
        setIsForgot(false);
        setForgotStep(1);
        setForgotEmail('');
        setSentCode('');
        setInputCode('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
      <Card className="w-full max-w-3xl shadow-xl rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left */}
          <div className="hidden md:flex flex-col items-start justify-center p-10 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white space-y-6">
            <div className="flex items-center gap-3">
              <img
                src="/graduation-cap.svg"
                alt="graduation cap"
                className="h-10 w-10"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <h1 className="text-3xl font-extrabold">StudentLife</h1>
            </div>
            <p className="text-sm opacity-90 max-w-xs">
              Chào mừng trở lại — Đăng nhập để tiếp tục trải nghiệm dành cho sinh viên.
            </p>
          </div>

          {/* Right - Form */}
          <CardContent className="p-8">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-2xl font-semibold">
                {isForgot ? 'Quên mật khẩu' : 'Đăng nhập'}
              </CardTitle>
              <CardDescription>
                {isForgot
                  ? 'Làm theo các bước để khôi phục mật khẩu'
                  : 'Nhập thông tin để truy cập vào tài khoản của bạn'}
              </CardDescription>
            </CardHeader>

            {info && (
              <Alert className="mb-4">
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isForgot ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <IconInput
                  id="userName"
                  label="Tên đăng nhập"
                  type="text"
                  placeholder="Nhập Username"
                  value={userName}
                  onChange={setUserName}
                  icon={<User className="h-4 w-4" />}
                  inputProps={{ required: true, disabled: isLoading, autoComplete: 'username' }}
                />

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <button
                      type="button"
                      className="text-xs text-emerald-700 hover:underline"
                      onClick={() => {
                        setIsForgot(true);
                        setError('');
                        setInfo('');
                      }}
                      disabled={isLoading}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={isLoading}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    'Đăng nhập'
                  )}
                </Button>

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">Chưa có tài khoản? </span>
                  <Link to="/register" className="text-emerald-700 hover:underline font-medium">
                    Đăng ký ngay
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotStep === 1 && (
                  <IconInput
                    id="forgotEmail"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={setForgotEmail}
                    icon={<Mail className="h-4 w-4" />}
                    inputProps={{ required: true, disabled: isLoading, autoComplete: 'email' }}
                  />
                )}

                {forgotStep === 2 && (
                  <IconInput
                    id="verificationCode"
                    label="Mã xác minh"
                    type="text"
                    placeholder="Nhập mã 6 chữ số"
                    value={inputCode}
                    onChange={setInputCode}
                    icon={<User className="h-4 w-4" />}
                    inputProps={{ disabled: isLoading, maxLength: 6 }}
                  />
                )}

                {forgotStep === 3 && (
                  <>
                    <div>
                      <Label htmlFor="newPassword">Mật khẩu mới</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</Label>
                      <Input
                        id="confirmNewPassword"
                        type="password"
                        placeholder="Nhập lại mật khẩu mới"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                    onClick={() => {
                      setIsForgot(false);
                      setForgotStep(1);
                      setError('');
                      setInfo('');
                      setForgotEmail('');
                      setSentCode('');
                      setInputCode('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }}
                    disabled={isLoading}
                  >
                    ← Quay lại đăng nhập
                  </button>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : forgotStep === 1 ? (
                      'Gửi mã'
                    ) : forgotStep === 2 ? (
                      'Xác nhận mã'
                    ) : (
                      'Đặt lại mật khẩu'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
                <strong>Debug:</strong> URL: {window.location.pathname} | AccessToken:{' '}
                {localStorage.getItem('accessToken') ? '✅' : '❌'}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
};

export default Login;
