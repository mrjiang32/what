import { useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "@/utils/request";
import { useAuth } from "@/provider";
import DefaultLayout from "@/layouts/default";
// 只用基础组件，API 最稳定
import { Card, Input, Button } from "@heroui/react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isLogin, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // 登录态校验中
  if (isLogin === null) {
    return (
      <DefaultLayout>
        <div className="flex justify-center items-center h-screen">加载中…</div>
      </DefaultLayout>
    );
  }

  // 已登录直接跳转
  if (isLogin === true) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrMsg("");
    setLoading(true);

    try {
      const res = await request.post(
        "/api/auth/login",
        { username, password },
        { withCredentials: true }
      );
      const data = res.data;

      if (data.ok) {
        login(data.token, data.username);
        navigate("/", { replace: true });
      } else {
        setErrMsg(data.error || "登录失败");
      }
    } catch (err: any) {
      setErrMsg(err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center py-8 md:py-12 min-h-screen">
        {/* Card 纯容器，内部自己做内边距，避开子组件不存在的问题 */}
        <Card className="w-full max-w-md p-6">
          <h2 className="text-2xl font-bold text-center mb-6">登录</h2>

          {errMsg && (
            <div className="text-danger text-center mb-4">{errMsg}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* 自定义 label + Input 基础组件 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">用户名</label>
              <Input
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">密码</label>
              <Input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isPending={loading}
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        </Card>
      </section>
    </DefaultLayout>
  );
}