import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";

// ========== 类型 ==========
interface UserInfo {
  id: number;
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

// ========== reducer ==========
const initialState: AuthState = {
  isLogin: null, // 初始loading
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

// ========== Context ==========
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ✅ 这里解构出 [state, dispatch]，必须写在组件函数内部！
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 初始化校验登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/validate", { credentials: "include" });
        const data = await res.json();
        if (data.ok) {
          // ✅ 这里的dispatch来自上面useReducer解构
          dispatch({
            type: "LOGIN",
            payload: { token: data.accessToken, userInfo: data.user },
          });
        } else {
          dispatch({ type: "LOGOUT" });
        }
      } catch (e) {
        dispatch({ type: "LOGOUT" });
      }
    };
    checkAuth();
  }, []);

  const login = (token: string, userInfo: UserInfo) => {
    dispatch({ type: "LOGIN", payload: { token, userInfo } });
  };

  const logout = () => {
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

// 自定义hook方便组件使用
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须放在 AuthProvider 内部使用");
  return ctx;
};
