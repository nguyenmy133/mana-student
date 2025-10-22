// src/pages/Profile.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Save, User, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

/** Helper gọi API chuẩn ResponseDTO */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const API_BASE_URL = (import.meta as any)?.env?.VITE_API_URL?.replace(/\/+$/,"") ?? "http://localhost:8080";
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const token = localStorage.getItem('accessToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/api${endpoint}`, { ...options, headers, mode: 'cors' });
    const body = await res.json().catch(() => ({}));

    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error(body?.message || "Phiên đăng nhập đã hết hạn.");
    }
    if (!res.ok) {
      throw new Error(body?.message || body?.error || `Lỗi ${res.status}`);
    }
    return body.data as T;
  } catch (err: any) {
    if (err?.name === 'TypeError' || `${err}`.includes('Failed to fetch')) {
      throw new Error("Không kết nối được server (CORS/Network). Kiểm tra CORS và URL API.");
    }
    throw err;
  }
}

type ProfileData = {
  userName: string;
  email: string;
  university: string | null;
  major: string | null;
  yearOfStudy: number | null;
};

export const Profile = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await apiRequest<ProfileData>('/users/profile');
        setProfileData(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleInputChange = (field: keyof ProfileData, value: string | number | null) => {
    setProfileData(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!profileData) return;

    // Check email đơn giản
    const emailOk = !!profileData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email);
    if (!emailOk) {
      toast.error("Email không hợp lệ.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await apiRequest<ProfileData>('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userName: profileData.userName,
          email: profileData.email,           
          university: profileData.university,
          major: profileData.major,
          yearOfStudy: profileData.yearOfStudy
        })
      });
      setProfileData(updated);
      toast.success("Hồ sơ đã được cập nhật!");
    } catch (err: any) {
      toast.error(err.message || "Cập nhật hồ sơ thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error("Mật khẩu mới và xác nhận không khớp.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await apiRequest<unknown>('/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          reNewPassword: passwordForm.confirmNewPassword,
        })
      });
      toast.success("Mật khẩu đã được thay đổi!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (err: any) {
      toast.error(err.message || "Đổi mật khẩu thất bại.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (error || !profileData) {
    return <Alert variant="destructive"><AlertDescription>{error || "Không thể tải dữ liệu hồ sơ."}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Hồ sơ cá nhân</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Avatar */}
        <Card>
          <CardHeader><CardTitle className="text-center">Ảnh đại diện</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src="" alt={profileData.userName} />
              <AvatarFallback className="text-2xl"><User className="h-16 w-16" /></AvatarFallback>
            </Avatar>
            <Button variant="outline"><Camera className="h-4 w-4 mr-2" />Đổi ảnh</Button>
          </CardContent>
        </Card>

        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Thông tin cá nhân</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="userName">Họ và tên</Label>
                  <Input id="userName" value={profileData.userName} onChange={(e) => handleInputChange("userName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university">Trường</Label>
                  <Input id="university" value={profileData.university || ''} onChange={(e) => handleInputChange("university", e.target.value)} placeholder="Chưa có thông tin"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  
                  <Input id="email" type="email" value={profileData.email}
                         onChange={(e) => handleInputChange("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">Chuyên ngành</Label>
                  <Input id="major" value={profileData.major || ''} onChange={(e) => handleInputChange("major", e.target.value)} placeholder="Chưa có thông tin"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearOfStudy">Năm học</Label>
                  <Select value={String(profileData.yearOfStudy || '')} onValueChange={(v) => handleInputChange("yearOfStudy", v ? Number(v) : null)}>
                    <SelectTrigger><SelectValue placeholder="Chọn năm học" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Năm 1</SelectItem>
                      <SelectItem value="2">Năm 2</SelectItem>
                      <SelectItem value="3">Năm 3</SelectItem>
                      <SelectItem value="4">Năm 4</SelectItem>
                      <SelectItem value="5">Năm 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline">Hủy</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  <span>Lưu thay đổi</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Đổi mật khẩu */}
      <Card>
        <CardHeader><CardTitle>Đổi mật khẩu</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
              <Input id="currentPassword" type="password" value={passwordForm.currentPassword}
                     onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} placeholder="••••••••"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input id="newPassword" type="password" value={passwordForm.newPassword}
                     onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="••••••••"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</Label>
              <Input id="confirmNewPassword" type="password" value={passwordForm.confirmNewPassword}
                     onChange={(e) => setPasswordForm(p => ({ ...p, confirmNewPassword: e.target.value }))} placeholder="••••••••"/>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật mật khẩu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
