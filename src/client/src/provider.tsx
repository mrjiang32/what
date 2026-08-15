import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { useCookies } from "react-cookie";

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
  state: AuthState
}

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
  const [cookies, setCookies, removeCookies] = useCookies(["user"]);
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = (token: string, userInfo: UserInfo) => {
    setCookies(
      "user",
      {
        token,
        userInfo,
      },
      {
        path: "/",
        maxAge: 3600 * 6, // 6小时后过期
        sameSite: "lax",
      },
    );
    dispatch({ type: "LOGIN", payload: { token, userInfo } });
  };

  const logout = () => {
    logoutServer(state.userInfo, state.token);
    removeCookies("user", { path: "/" });
    dispatch({ type: "LOGOUT" });
  };

  const logoutServer = async (user: UserInfo | null, token: string | null) => {
    return await fetch("/api/auth/logout", {
      headers: {
        authorization: `Bearer ${token}`,
        userInfo: `${user?.username}`,
      },
    }).then((res) => res.json());
  };

  useEffect(() => {
    const checkAuth = async () => {
      const cookieInfo = cookies.user;
      const savedToken = cookieInfo?.token;
      const savedUser = cookieInfo?.userInfo;

      if (!savedToken) {
        dispatch({ type: "LOGOUT" });
        return;
      }

      try {
        // ✅ 核心修复：请求校验接口必须带 Bearer Token 请求头
        const res = await fetch("/api/auth/validate", {
          headers: {
            authorization: `Bearer ${savedToken}`,
            userInfo: savedUser,
          },
        });
        const data = await res.json();

        if (data.ok) {
          // 校验通过，恢复登录态
          dispatch({
            type: "LOGIN",
            payload: {
              token: savedToken,
              userInfo: data.user.username,
            },
          });
        } else {
          logout();
        }
      } catch (e) {
        console.error(e);
        logout();
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        state,
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
