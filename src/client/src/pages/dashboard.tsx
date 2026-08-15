import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/provider";
import DefaultLayout from "@/layouts/default";
import { Card, Button, Chip, Spinner, Tooltip } from "@heroui/react";

export default function DashboardPage() {
  const navigate = useNavigate();
  // 从 useAuth 中获取 token
  const { isLogin, state } = useAuth(); 
  const token = state?.token;

  const [funcModules, setFuncModules] = useState<string[]>([]);
  const [hookModules, setHookModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<"func" | "hook">("func");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // 1. 登录态校验
  useEffect(() => {
    if (isLogin === false) navigate("/login", { replace: true });
  }, [isLogin, navigate]);

  // 封装带 Authorization 的请求方法
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  // 2. 获取模块列表
  const fetchModules = async () => {
    setLoading(true);
    try {
      const [funcRes, hookRes] = await Promise.all([
        authFetch("/api/func"),
        authFetch("/api/hook"),
      ]);
      const funcData = await funcRes.json();
      const hookData = await hookRes.json();

      if (funcData.ok) setFuncModules(funcData.modules || []);
      if (hookData.ok) setHookModules(hookData.modules || []);
    } catch (err) {
      console.error("加载模块列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLogin === true) fetchModules();
  }, [isLogin]);

  // 3. 强制刷新数据源
  const handleReload = async () => {
    setLoading(true);
    try {
      await Promise.all([
        authFetch("/api/func/.reload"),
        authFetch("/api/hook/.reload"),
      ]);
      await fetchModules();
    } catch (err) {
      console.error("刷新失败:", err);
    }
  };

  // 4. 执行模块
  const handleExec = async (type: "func" | "hook", moduleName: string) => {
    setExecuting(true);
    try {
      const cleanName = moduleName.split(".")[0];
      const res = await authFetch(`/api/${type}/${cleanName}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params: {} }),
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`[${moduleName}] 执行成功:`, data.value);
      } else {
        console.error(`[${moduleName}] 执行失败:`, data.error);
      }
    } catch (err) {
      console.error(`[${moduleName}] 请求异常:`, err);
    } finally {
      setExecuting(false);
    }
  };

  // 加载中或等待登录态
  if (isLogin === null || loading) {
    return (
      <DefaultLayout>
        <div className="flex justify-center items-center h-screen">
          <Spinner size="lg" />
        </div>
      </DefaultLayout>
    );
  }

  const currentModules = activeTab === "func" ? funcModules : hookModules;

  return (
    <DefaultLayout>
      <section className="py-8 px-4 md:px-8 max-w-7xl mx-auto h-full flex flex-col">
        {/* 顶部操作栏 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">控制台</h1>
            <p className="text-default-500 mt-1">管理和监控你的自定义函数与钩子</p>
          </div>
          {/* ✅ 修复 Tooltip：v3 中直接包裹子组件，文本作为 children */}
          <Tooltip>向服务器发送请求刷新数据源</Tooltip>
          <Button 
            variant="ghost" 
            onPress={handleReload} 
          >
            刷新数据源
          </Button>
        </div>

        {/* 主体区域：左右分栏布局 */}
        <div className="flex flex-1 gap-6 min-h-[600px]">
          {/* 左侧：模块列表导航 */}
          <Card className="w-1/3 p-4 flex flex-col">
            <div className="flex gap-2 mb-4">
              {/* ✅ 修复 Button 变体：v3 使用 primary / tertiary 替代 solid / light */}
              <Button 
                size="sm" 
                variant={activeTab === "func" ? "primary" : "tertiary"} 
                onPress={() => { setActiveTab("func"); setSelectedModule(null); }}
                className="flex-1"
              >
                函数 (Func)
              </Button>
              <Button 
                size="sm" 
                variant={activeTab === "hook" ? "primary" : "tertiary"} 
                onPress={() => { setActiveTab("hook"); setSelectedModule(null); }}
                className="flex-1"
              >
                钩子 (Hook)
              </Button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {currentModules.length === 0 ? (
                <p className="text-default-400 text-center py-8">暂无模块</p>
              ) : (
                currentModules.map((mod) => (
                  <Button
                    key={mod}
                    variant={selectedModule === mod ? "primary" : "tertiary"}
                    onPress={() => setSelectedModule(mod)}
                    className="justify-start font-mono text-sm h-auto py-2"
                  >
                    {mod}
                  </Button>
                ))
              )}
            </div>
          </Card>

          {/* 右侧：详情与执行区 */}
          <Card className="w-2/3 p-8 flex flex-col items-center justify-center text-center">
            {selectedModule ? (
              <>
                {/* ✅ 修复 Chip：v3 颜色使用 accent，变体使用 soft */}
                <Chip 
                  size="lg" 
                  color="accent" 
                  variant="soft" 
                  className="mb-4 font-mono"
                >
                  {selectedModule}
                </Chip>
                <h2 className="text-2xl font-bold mb-2">
                  {activeTab === "func" ? "自定义函数" : "事件钩子"}
                </h2>
                <p className="text-default-500 mb-8 max-w-md">
                  你已选中模块 <code className="bg-default-100 px-1 rounded">{selectedModule}</code>。
                  点击下方按钮触发后端执行逻辑。
                </p>
                <Tooltip>向服务器发送 POST 请求执行此模块</Tooltip>
                {/* ✅ 修复执行按钮：v3 使用 outline 替代 shadow */}
                <Button
                  size="lg"
                  variant="outline"
                  isDisabled={executing}
                  onPress={() => handleExec(activeTab, selectedModule)}
                >
                  {executing ? <Spinner size="sm" /> : "立即执行"}
                </Button>
              </>
            ) : (
              <div className="text-default-400">
                <p className="text-6xl mb-4">👈</p>
                <p className="text-xl">请从左侧列表中选择一个模块</p>
              </div>
            )}
          </Card>
        </div>
      </section>
    </DefaultLayout>
  );
}