import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { GraduationCap, Calendar, CheckSquare, DollarSign, MessageCircle, User } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  const features = [
    {
      title: 'Dashboard',
      description: 'Tổng quan về tình hình học tập và cuộc sống',
      icon: GraduationCap,
      path: '/dashboard'
    },
    {
      title: 'Lịch học',
      description: 'Quản lý lịch học và sự kiện',
      icon: Calendar,
      path: '/schedule'
    },
    {
      title: 'Task',
      description: 'Theo dõi và quản lý công việc',
      icon: CheckSquare,
      path: '/tasks'
    },
    {
      title: 'Chi tiêu',
      description: 'Quản lý tài chính cá nhân',
      icon: DollarSign,
      path: '/expenses'
    },
    {
      title: 'Chat AI',
      description: 'Trợ lý AI hỗ trợ học tập',
      icon: MessageCircle,
      path: '/chat-ai' // <-- Sửa lại đường dẫn cho đúng với file router của bạn
    },
    {
      title: 'Hồ sơ',
      description: 'Thông tin cá nhân và cài đặt',
      icon: User,
      path: '/profile'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <GraduationCap className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Chào mừng đến với StudentLife
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Ứng dụng quản lý đời sống sinh viên toàn diện
          </p>
          {user && (
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Xin chào, {user.name}!
              </h2>
              <p className="text-gray-600 mb-4">
                Bạn đã đăng nhập thành công. Hãy khám phá các tính năng của ứng dụng.
              </p>
              <Link to="/dashboard">
                <Button className="w-full">
                  Vào Dashboard
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* --- PHẦN SỬA LỖI NẰM Ở ĐÂY --- */}
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              // BỌC CARD BẰNG THẺ LINK VÀ TRUYỀN `feature.path` VÀO `to`
              <Link key={feature.title} to={feature.path} className="no-underline text-current">
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* CTA Section */}
        {!user && (
          <div className="text-center">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Bắt đầu ngay hôm nay</CardTitle>
                <CardDescription>
                  Đăng ký tài khoản để sử dụng đầy đủ các tính năng
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/register" className="block">
                  <Button className="w-full">
                    Đăng ký tài khoản
                  </Button>
                </Link>
                <Link to="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Đăng nhập
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;