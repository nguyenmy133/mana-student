// src/pages/Register.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/api/http';
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  User,
  Mail,
  BookOpen,
  University,
  Lock
} from 'lucide-react';

type FieldErrors = Record<string, string>;

type RegisterFormData = {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
  university: string;
  major: string;
  year: string;
};

// Tailwind classes để mô phỏng shadcn/ui <Input>
const inputBaseClasses =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

// ===== Stable IconInput (đặt ngoài Register để không bị remount mỗi render) =====
type IconInputProps = {
  id: string;
  name: keyof RegisterFormData; // chỉ để gắn attribute/autoComplete
  type?: string;
  placeholder?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  autoComplete?: string;
  children?: React.ReactNode; // icon
  error?: string;
};

function IconInput(props: IconInputProps) {
  const errorClasses = props.error ? 'border-red-500 focus-visible:ring-red-500' : '';
  return (
    <div>
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none">
          <span className="opacity-80">{props.children}</span>
        </div>
        <input
          id={props.id}
          name={props.name}
          type={props.type ?? 'text'}
          placeholder={props.placeholder}
          value={props.value}
          onChange={props.onChange}
          className={`${inputBaseClasses} pl-10 w-full ${errorClasses}`}
          disabled={props.disabled}
          autoComplete={props.autoComplete}
          // các thuộc tính giúp tránh can thiệp ngoài ý muốn
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
      {props.error && <p className="mt-1 text-sm text-red-600">{props.error}</p>}
    </div>
  );
}

// ===== Component chính =====
export default function Register() {
  // Favicon (Vite: để /public/graduation-cap.svg)
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/graduation-cap.svg';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const [formData, setFormData] = useState<RegisterFormData>({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    major: '',
    year: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  // Handler factory: KHÔNG dựa vào e.currentTarget.name
  const handleChange =
    <K extends keyof RegisterFormData>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => ({ ...prev, [key]: '' }));
      setError('');
    };

  const handleSelect =
    <K extends keyof RegisterFormData>(key: K) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => ({ ...prev, [key]: '' }));
      setError('');
    };

  const validateForm = () => {
    const errors: FieldErrors = {};
    if (!formData.userName.trim()) errors.userName = 'Vui lòng nhập Username';
    if (!formData.email.trim()) errors.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email không hợp lệ';
    if (formData.password.length < 6) errors.password = 'Mật khẩu phải >= 6 ký tự';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    if (!formData.university.trim()) errors.university = 'Vui lòng nhập trường đại học';
    if (!formData.major.trim()) errors.major = 'Vui lòng nhập chuyên ngành';
    if (!/^[1-5]$/.test(formData.year)) errors.year = 'Chọn năm học hợp lệ (1–5)';

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError('Vui lòng sửa các trường có màu đỏ');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // BE yêu cầu password == rePassword
      const payload = {
        userName: formData.userName,
        email: formData.email,
        password: formData.password,
        rePassword: formData.confirmPassword,
        // university/major/year BE hiện không dùng trong registerUser()
      };

      // Dùng wrapper apiRequest: tự baseURL + JSON + lỗi
      const user = await apiRequest<any>('/users/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccess(true);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err?.message || 'Đăng ký thất bại — vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
        <Card className="w-full max-w-md shadow-2xl rounded-2xl">
          <CardContent className="pt-8 pb-10">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-semibold text-green-700">Đăng ký thành công!</h2>
              <p className="text-sm text-muted-foreground">Bạn sẽ được chuyển đến trang đăng nhập trong giây lát.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
      <Card className="w-full max-w-3xl shadow-xl rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left - branding */}
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
              Tạo tài khoản để truy cập đầy đủ tính năng. Điền thông tin sinh viên để cá nhân hóa trải nghiệm.
            </p>
            <div className="mt-3 px-4 py-2 bg-white/10 rounded-md text-sm">An toàn • Nhanh • Dễ dùng</div>
          </div>

          {/* Right - form */}
          <CardContent className="p-8">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-2xl font-semibold">Đăng ký</CardTitle>
              <CardDescription>Nhập thông tin cơ bản để tạo tài khoản</CardDescription>
            </CardHeader>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="userName" className="sr-only">Username</Label>
                  <IconInput
                    id="userName"
                    name="userName"
                    placeholder="Username"
                    value={formData.userName}
                    onChange={handleChange('userName')}
                    disabled={isLoading}
                    autoComplete="username"
                    error={fieldErrors.userName}
                  >
                    <User className="h-4 w-4" />
                  </IconInput>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="email" className="sr-only">Email</Label>
                  <IconInput
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    disabled={isLoading}
                    autoComplete="email"
                    error={fieldErrors.email}
                  >
                    <Mail className="h-4 w-4" />
                  </IconInput>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="university" className="sr-only">Trường</Label>
                  <IconInput
                    id="university"
                    name="university"
                    placeholder="Trường đại học hiện tại"
                    value={formData.university}
                    onChange={handleChange('university')}
                    disabled={isLoading}
                    autoComplete="organization"
                    error={fieldErrors.university}
                  >
                    <University className="h-4 w-4" />
                  </IconInput>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="major" className="sr-only">Chuyên ngành</Label>
                  <IconInput
                    id="major"
                    name="major"
                    placeholder="Ngành học hiện tại"
                    value={formData.major}
                    onChange={handleChange('major')}
                    disabled={isLoading}
                    error={fieldErrors.major}
                  >
                    <BookOpen className="h-4 w-4" />
                  </IconInput>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="year">Sinh viên năm mấy</Label>
                  <div className={`relative ${fieldErrors.year ? 'ring-1 ring-red-300 rounded-md' : ''}`}>
                    <select
                      id="year"
                      name="year"
                      value={formData.year}
                      onChange={handleSelect('year')}
                      className="w-full h-10 rounded-md px-3 border border-input"
                      disabled={isLoading}
                    >
                      <option value="">Chọn năm</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  {fieldErrors.year && <p className="mt-1 text-sm text-red-600">{fieldErrors.year}</p>}
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="password" className="sr-only">Mật khẩu</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Lock className="h-4 w-4 opacity-80" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mật khẩu (≥6 ký tự)"
                      value={formData.password}
                      onChange={handleChange('password')}
                      className={`${inputBaseClasses} pl-10 pr-10 ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      disabled={isLoading}
                      autoComplete="new-password"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword((p) => !p)}
                      disabled={isLoading}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="sr-only">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="h-4 w-4 opacity-80" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    className={`${inputBaseClasses} pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={isLoading}
                    autoComplete="new-password"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {fieldErrors.confirmPassword && <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng ký...
                  </>
                ) : (
                  'Đăng ký'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Đã có tài khoản? </span>
              <Link to="/login" className="text-primary hover:underline">Đăng nhập</Link>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
