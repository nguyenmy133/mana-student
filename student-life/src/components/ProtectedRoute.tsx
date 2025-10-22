// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";

type Props = { children: JSX.Element };

export default function ProtectedRoute({ children }: Props) {
  const loc = useLocation();

  // Quy ước: đăng nhập thành công sẽ lưu accessToken vào localStorage
  const hasAT = !!localStorage.getItem("accessToken");

  if (!hasAT) {
    // Lưu đường dẫn đang vào để Login dùng navigate quay lại:
    // Login.tsx đang đọc history.state.usr.from.pathname
    return <Navigate to="/login" replace state={{ usr: { from: loc } }} />;
  }

  return children;
}
