import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/provider";
import DefaultLayout from "@/layouts/default";
import {
  Card,
  Button,
  Chip,
  Spinner,
  Tooltip,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Alert,
  Code,
} from "@heroui/react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isLogin, state } = useAuth();
  const token = state?.token;

  const [funcModules, setFuncModules] = useState<string[]>([]);
  const [hookModules, setHookModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"func" | "hook">("func");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const [editorValue, setEditorValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{ ok: boolean; data?: any; error?: string } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");

  useEffect(() => {
    if (isLogin === false) navigate("/login", { replace: true });
  }, [isLogin, navigate]);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  }, [token]);

  const fetchModules = useCallback(async () => {
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
  }, [authFetch]);

  useEffect(() => {
    if (isLogin === true) fetchModules();
  }, [isLogin, fetchModules]);

  const loadModuleSource = useCallback(async (type: "func" | "hook", moduleName: string) => {
    setIsLoadingSource(true);
    setEditorValue("");
    setExecResult(null);
    try {
      const cleanName = moduleName.split(".")[0];
      const res = await authFetch(`/api/${type}/${cleanName}`);
      const data = await res.json();

      if (data.ok) {
        const content = typeof data.source === "string"
          ? data.source
          : JSON.stringify(data.source, null, 2);
        setEditorValue(content);
      } else {
        console.error("加载源码失败:", data.error);
      }
    } catch (err) {
      console.error("加载源码异常:", err);
    } finally {
      setIsLoadingSource(false);
    }
  }, [authFetch]);

  const handleSelectModule = (mod: string) => {
    setSelectedModule(mod);
    loadModuleSource(activeTab, mod);
  };

  const handleReload = async () => {
    setLoading(true);
    try {
      await Promise.all([
        authFetch("/api/func/.reload"),
        authFetch("/api/hook/.reload"),
      ]);
      await fetchModules();
      if (selectedModule) loadModuleSource(activeTab, selectedModule);
    } catch (err) {
      console.error("刷新失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExec = async (type: "func" | "hook", moduleName: string) => {
    setExecuting(true);
    setExecResult(null);
    try {
      const cleanName = moduleName.split(".")[0];
      const res = await authFetch(`/api/${type}/${cleanName}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params: {} }),
      });
      const data = await res.json();

      if (data.ok) {
        setExecResult({ ok: true, data: data.value });
      } else {
        setExecResult({ ok: false, error: data.error });
      }
    } catch (err) {
      setExecResult({ ok: false, error: String(err) });
    } finally {
      setExecuting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedModule) return;
    setIsSaving(true);
    try {
      const cleanName = selectedModule.split(".")[0];
      const res = await authFetch(`/api/${activeTab}/${cleanName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: editorValue }),
      });
      const data = await res.json();

      if (!data.ok) {
        console.error("保存失败:", data.error);
        alert(`保存失败: ${data.error}`);
      }
    } catch (err) {
      console.error("保存异常:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newModuleName.trim()) return;
    setIsSaving(true);
    try {
      const body: Record<string, any> = { id: newModuleName };

      if (activeTab === "func") {
        body.raw = `// ${newModuleName}.js
// 自定义函数入口
// params 为调用时传入的参数对象
module.exports = async function(params) {
  // TODO: 在此编写业务逻辑
  return {
    success: true,
    message: "Hello from " + ${JSON.stringify(newModuleName)},
    input: params
  };
};
`;
      } else {
        body.friendlyName = newModuleName;
        body.description = "新建钩子配置";
        body.bindedActionIds = [];
      }

      const res = await authFetch(`/api/${activeTab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.ok) {
        setShowCreateModal(false);
        setNewModuleName("");
        await fetchModules();
        const ext = activeTab === "func" ? "js" : "json";
        handleSelectModule(`${newModuleName}.${ext}`);
      } else {
        alert(`创建失败: ${data.error}`);
      }
    } catch (err) {
      console.error("创建异常:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedModule) return;
    setIsSaving(true);
    try {
      const cleanName = selectedModule.split(".")[0];
      const res = await authFetch(`/api/${activeTab}/${cleanName}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.ok) {
        setSelectedModule(null);
        setEditorValue("");
        setExecResult(null);
        setShowDeleteModal(false);
        await fetchModules();
      } else {
        alert(`删除失败: ${data.error}`);
      }
    } catch (err) {
      console.error("删除异常:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (tab: "func" | "hook") => {
    setActiveTab(tab);
    setSelectedModule(null);
    setEditorValue("");
    setExecResult(null);
  };

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
  const editorLanguage = activeTab === "func" ? "javascript" : "json";

  return (
    <DefaultLayout>
      <section className="py-8 px-4 md:px-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-bold">控制台</h1>
            <p className="text-default-500 mt-1">管理和监控你的自定义函数与钩子</p>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <Tooltip.Trigger>
                <Button variant="primary" onPress={() => setShowCreateModal(true)}>
                  新建模块
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>新建当前类型的模块</Tooltip.Content>
            </Tooltip>

            <Tooltip>
              <Tooltip.Trigger>
                <Button variant="outline" onPress={handleReload}>
                  {loading ? <Spinner size="sm" /> : "刷新数据源"}
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>重新从文件系统加载模块列表</Tooltip.Content>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-1 gap-6 min-h-0">
          <Card className="w-80 shrink-0 p-4 flex flex-col">
            <div className="flex gap-2 mb-4 shrink-0">
              <Button
                size="sm"
                variant={activeTab === "func" ? "primary" : "tertiary"}
                onPress={() => handleTabChange("func")}
                className="flex-1"
              >
                函数 (Func)
              </Button>
              <Button
                size="sm"
                variant={activeTab === "hook" ? "primary" : "tertiary"}
                onPress={() => handleTabChange("hook")}
                className="flex-1"
              >
                钩子 (Hook)
              </Button>
            </div>

            <div className="border-b border-default-200 mb-3" />

            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
              {currentModules.length === 0 ? (
                <p className="text-default-400 text-center py-8 text-sm">
                  暂无{activeTab === "func" ? "函数" : "钩子"}模块
                </p>
              ) : (
                currentModules.map((mod) => (
                  <div
                    key={mod}
                    className={`p-3 rounded-lg transition-all border ${
                      selectedModule === mod
                        ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                        : "border-default-200 hover:border-primary-300 hover:bg-default-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex flex-col gap-1 min-w-0 flex-1 cursor-pointer"
                        onClick={() => handleSelectModule(mod)}
                      >
                        <span className="font-mono text-sm font-medium truncate">
                          {mod}
                        </span>
                        <Chip
                          size="sm"
                          variant={activeTab === "func" ? "primary" : "secondary"}
                          className="w-fit"
                        >
                          {activeTab === "func" ? "JS 函数" : "JSON 钩子"}
                        </Chip>
                      </div>
                      <div className="flex gap-1">
                        <Tooltip>
                          <Tooltip.Trigger>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="tertiary"
                              onPress={() => handleExec(activeTab, mod)}
                            >
                              ▶
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>执行</Tooltip.Content>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="flex-1 p-6 flex flex-col min-h-0">
            {selectedModule ? (
              <div className="flex flex-col h-full gap-4 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <Chip
                      size="lg"
                      variant="soft"
                      color="accent"
                      className="font-mono"
                    >
                      {selectedModule}
                    </Chip>
                    <span className="text-default-500 text-sm">
                      {activeTab === "func"
                        ? "JavaScript 自定义函数"
                        : "JSON 事件钩子配置"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <Tooltip.Trigger>
                        <Button
                          variant="primary"
                          isDisabled={isLoadingSource || isSaving}
                          onPress={handleSave}
                        >
                          {isSaving ? <Spinner size="sm" /> : "保存"}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>保存当前修改</Tooltip.Content>
                    </Tooltip>

                    <Tooltip>
                      <Tooltip.Trigger>
                        <Button
                          variant="outline"
                          isDisabled={isLoadingSource || executing}
                          onPress={() => handleExec(activeTab, selectedModule)}
                        >
                          {executing ? <Spinner size="sm" /> : "执行"}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>运行该模块并查看返回结果</Tooltip.Content>
                    </Tooltip>

                    <Tooltip>
                      <Tooltip.Trigger>
                        <Button
                          variant="danger-soft"
                          onPress={() => setShowDeleteModal(true)}
                        >
                          删除
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>删除该模块</Tooltip.Content>
                    </Tooltip>
                  </div>
                </div>

                <div className="border-b border-default-200" />

                <div className="flex-1 min-h-0 border border-default-200 rounded-lg overflow-hidden">
                  {isLoadingSource ? (
                    <div className="flex flex-col justify-center items-center h-full gap-2">
                      <Spinner size="sm" />
                      <span className="text-sm text-default-500">加载源码中...</span>
                    </div>
                  ) : (
                    <Editor
                      height="100%"
                      language={editorLanguage}
                      value={editorValue}
                      onChange={(value: string | undefined) => setEditorValue(value || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        automaticLayout: true,
                        tabSize: 2,
                        scrollBeyondLastLine: false,
                        formatOnPaste: true,
                        formatOnType: true,
                      }}
                    />
                  )}
                </div>

                {execResult && (
                  <div className="shrink-0">
                    <p className="text-sm font-medium mb-2 text-default-600">执行结果</p>
                    <Alert color={execResult.ok ? "success" : "danger"}>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {execResult.ok ? "执行成功" : "执行失败"}
                        </span>
                        <pre className="text-xs max-h-36 overflow-auto font-mono whitespace-pre-wrap">
                          {JSON.stringify(
                            execResult.ok ? execResult.data : execResult.error,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </Alert>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-default-400">
                <p className="text-6xl mb-4">👈</p>
                <p className="text-xl">请从左侧列表中选择一个模块</p>
                <p className="text-sm mt-2">
                  或点击左上角「新建模块」创建你的第一个
                  {activeTab === "func" ? "函数" : "钩子"}
                </p>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* 新建弹窗 */}
      <Modal
        isOpen={showCreateModal}
        onOpenChange={(open) => setShowCreateModal(open)}
      >
        <ModalHeader>
          新建{activeTab === "func" ? "自定义函数" : "事件钩子"}
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-600 mb-2">模块名称</p>
          <Input
            placeholder="仅支持字母、数字、下划线、横杠"
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-default-400 mt-2">
            将生成文件: {newModuleName || "module"}.{activeTab === "func" ? "js" : "json"}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="tertiary"
            onPress={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={!newModuleName.trim() || isSaving}
            onPress={handleCreate}
          >
            {isSaving ? <Spinner size="sm" /> : "创建"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* 删除弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onOpenChange={(open) => setShowDeleteModal(open)}
      >
        <ModalHeader>确认删除模块</ModalHeader>
        <ModalBody>
          <p className="text-default-600">
            确定要删除模块 <Code>{selectedModule}</Code> 吗？
          </p>
          <p className="text-sm text-danger mt-2">
            此操作会从文件系统中永久删除该文件，无法撤销。
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="tertiary"
            onPress={() => setShowDeleteModal(false)}
          >
            取消
          </Button>
          <Button
            variant="danger"
            isDisabled={isSaving}
            onPress={handleDelete}
          >
            {isSaving ? <Spinner size="sm" /> : "确认删除"}
          </Button>
        </ModalFooter>
      </Modal>
    </DefaultLayout>
  );
}