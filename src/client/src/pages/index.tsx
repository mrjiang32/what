import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/provider";
import { Button } from "@heroui/react";
import { useState, useEffect } from "react";

export default function IndexPage() {
  const navigate = useNavigate();
  const { isLogin, logout } = useAuth();

  const [expand, setExpand] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setExpand((prev) => !prev);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const getCharStyle = (index: number) => ({
    display: "inline-block",
    transformOrigin: "left center",
    overflow: "hidden",
    transition: `
      transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
      opacity 0.35s ease,
      max-width 0.45s cubic-bezier(0.16, 1, 0.3, 1)
    `,
    transitionDelay: `${index * 70}ms`,
    opacity: expand ? 1 : 0,
    transform: expand ? "scaleX(1)" : "scaleX(0)",
    maxWidth: expand ? "1em" : "0em",
    verticalAlign: "bottom",
  });

  const handleAuthClick = () => {
    if (!isLogin) {
      navigate("/login");
    } else {
      logout();
    }
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-6 py-10 md:py-16">
        <div className="max-w-2xl text-center">
          <div className="inline-block align-bottom">
            <span className={title()}>
              <span>W</span>
              <span style={getCharStyle(0)}>e</span>
              <span style={getCharStyle(1)}>b</span>
              <span>h</span>
              <span style={getCharStyle(2)}>o</span>
              <span style={getCharStyle(3)}>o</span>
              <span style={getCharStyle(4)}>k</span>
            </span>
            <span className={title({ color: "blue" })}>at?&nbsp;</span>
          </div>

          <br />
          <span className={title()}>通用回调工具</span>

          <div className={subtitle({ class: "mt-6" })}>
            接收外部事件推送，支持转换、转发、过滤、日志记录，快速对接各类平台回调。
          </div>
        </div>

        <div className="flex gap-4 flex-wrap justify-center">
          <Button variant="primary" onPress={handleAuthClick}>
            {isLogin ? "退出登录" : "登录进入控制台"}
          </Button>

          {isLogin && (
            <Button variant="outline" onPress={() => navigate("/dashboard")}>
              前往管理面板
            </Button>
          )}

          <Button
            variant="tertiary"
            onPress={() => window.open(siteConfig.links.github, "_blank")}
          >
            <GithubIcon size={20} />
            GitHub
          </Button>
        </div>

        <div className="mt-12 max-w-3xl w-full">
          <div className="flex flex-col gap-4 rounded-xl bg-surface shadow-surface px-6 py-6">
            <h3 className="text-xl font-semibold">功能简介</h3>
            <ul className="list-disc pl-5 space-y-2 text-default-600">
              <li>接收第三方 HTTP WebHook POST 请求</li>
              <li>请求日志查看、请求体预览、状态码记录</li>
              <li>简单请求过滤、Header 查看</li>
              <li>支持将接收到的事件转发到其他目标地址</li>
              <li>多实例管理，每个实例拥有独立回调地址</li>
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-xl bg-surface shadow-surface px-4 py-2">
            <pre className="text-sm font-medium font-mono">
              开始使用：登录后创建 WebHook 实例，获取回调地址
            </pre>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}