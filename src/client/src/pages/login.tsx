import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/provider";
import DefaultLayout from "@/layouts/default";
import { title, subtitle } from "@/components/primitives";

export default function LoginPage() {
  const navigate = useNavigate();
  // ✅读取全局auth状态、拿到login方法
  const { isLogin, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // 如果已经登录，直接跳首页
  if (isLogin === true) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    setLoading(true);

    try {
      const res = await axios.post("/api/login", {
        username,
        password,
      });
      const data = res.data;

      if (data.ok) {
        // ✅调用context的login，存入内存accessToken、用户信息
        login(data.accessToken, data.user);
        // 登录成功跳首页
        navigate("/", { replace: true });
      } else {
        setErrMsg(data.error || "登录失败");
      }
    } catch (err) {
      setErrMsg("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };
return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center py-8 md:py-10">
        <div className="w-full max-w-lg px-4">
          <h2 className={title({ class: "mb-6 text-center" })}>登录</h2>

          {errMsg && (
            <div className="text-danger text-center mb-4">{errMsg}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className={subtitle({ class: "text-small" })}>用户名</label>
              <input
                className="rounded-xl bg-surface px-4 py-2 outline-none border border-accent/20 focus:border-accent"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={subtitle({ class: "text-small" })}>密码</label>
              <input
                type="password"
                className="rounded-xl bg-surface px-4 py-2 outline-none border border-accent/20 focus:border-accent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button button--primary button--md rounded-full w-full mt-2"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>
      </section>
    </DefaultLayout>
  );
}
