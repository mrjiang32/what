import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/provider";
import { Button } from "@heroui/react";

export default function IndexPage() {
  const navigate = useNavigate();
  const { isLogin, logout } = useAuth();

  const handleAuthClick = () => {
    if (!isLogin) {
      // 当前页无刷新跳转到登录页
      navigate("/login");
    } else {
      logout();
    }
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <span className={title()}>Make&nbsp;</span>
          <span className={title({ color: "blue" })}>beautiful&nbsp;</span>
          <br />
          <span className={title()}>
            websites regardless of your design experience.
          </span>
          <div className={subtitle({ class: "mt-4" })}>
            Beautiful, fast and modern React UI library.
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="primary" onPress={handleAuthClick}>
            {isLogin ? "退出登录" : "去登录"}
          </Button>
          <Button
            variant="tertiary"
            onPress={() => window.open(siteConfig.links.github, "_blank")}
          >
            <GithubIcon size={20} />
            GitHub
          </Button>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 rounded-xl bg-surface shadow-surface px-4 py-2">
            <pre className="text-sm font-medium font-mono">
              Get started by editing{" "}
              <code className="px-2 py-1 h-fit font-mono font-normal inline whitespace-nowrap rounded-sm bg-accent/20 text-accent text-sm">
                pages/index.tsx
              </code>
            </pre>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}