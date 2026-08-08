import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import request from "@/utils/request";

// ========== 类型 ==========
interface UserInfo {
  username: string;
}

interface AuthState {
  isLogin: boolean | null; // null=加载中
  token: string | null;
  userInfo: UserInfo | null;
}

type AuthAction =
  | { type: "LOGIN"; payload: { token: string; userInfo: UserInfo } }
  | { type: "LOGOUT" }
  | { type: "RESTORE"; payload: AuthState };

interface AuthContextType extends AuthState {
  login: (token: string, userInfo: UserInfo) => void;
  logout: () => void;
}

// ========== 本地存储常量 ==========
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// ========== reducer ==========
const initialState: AuthState = {
  isLogin: null,
  token: null,
  userInfo: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        isLogin: true,
        token: action.payload.token,
        userInfo: action.payload.userInfo,
      };
    case "LOGOUT":
      return { ...initialState, isLogin: false };
    case "RESTORE":
      return action.payload;
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 初始化：先读本地存储，再校验Token有效性
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      // 本地没有Token，直接判定未登录
      if (!savedToken) {
        dispatch({ type: "LOGOUT" });
        return;
      }

      try {
        // ✅ 核心修复：请求校验接口必须带 Bearer Token 请求头
        const res = await request("/api/auth/validate", {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });
        const data = res.data;

        if (data.ok) {
          // 校验通过，恢复登录态
          dispatch({
            type: "LOGIN",
            payload: { 
              token: savedToken, 
              userInfo: data.username || JSON.parse(savedUser || "{}") 
            },
          });
        } else {
          // Token无效，清除本地存储
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          dispatch({ type: "LOGOUT" });
        }
      } catch (e) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        dispatch({ type: "LOGOUT" });
      }
    };

    checkAuth();
  }, []);

  const login = (token: string, userInfo: UserInfo) => {
    // ✅ 登录时持久化到 localStorage
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
    dispatch({ type: "LOGIN", payload: { token, userInfo } });
  };

  const logout = () => {
    // ✅ 登出时清除本地存储
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    dispatch({ type: "LOGOUT" });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须放在 AuthProvider 内部使用");
  return ctx;
};