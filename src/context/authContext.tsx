import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, db } from "../firebase/config";
import {
  login,
  registerUser,
  fetchUserProfile,
} from "../firebase/authFunctions"; // you'll create `fetchUserProfile`

interface userProfile {
  email: string;
  username: string;
  createdAt: any;
  lastLogin: any;
  preferences: {
    notifications: boolean;
    theme: "light" | "dark";
  };
}

interface AuthContextType {
  user: User | null;
  profile: userProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<userProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
  /* 
    Sets up a listener for Firebase auth state changes.
    When the user logs in or logs out, this callback runs:
      - Updates the user state with the Firebase auth user object.
      - Fetches the user profile from Firestore and updates profile state.
      - If no user is logged in, clears both user and profile states.
  */
    const subscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (user) {
        setUser(user);
        const newProfile = await fetchUserProfile(user.uid);
        if (newProfile) {
          const userProfile: userProfile = {
            email: newProfile.email,
            username: newProfile.username,
            createdAt: newProfile.createdAt,
            lastLogin: newProfile.lastLogin,
            preferences: {
              notifications: newProfile.preferences.notifications,
              theme: newProfile.preferences.theme,
            },
          };
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    //acts as a cleanup function that runs on component unmounts
    return () => subscribe();
  }, []);

  //custom loginHandler that updates state
  const loginHandler = async (email: string, password: string) => {
    const userCred = await login(email, password);
    setUser(userCred);
    const newProfile = await fetchUserProfile(userCred.uid);
    if (newProfile) {
      const userProfile: userProfile = {
        email: newProfile.email,
        username: newProfile.username,
        createdAt: newProfile.createdAt,
        lastLogin: newProfile.lastLogin,
        preferences: {
          notifications: newProfile.preferences.notifications,
          theme: newProfile.preferences.theme,
        },
      };
      setProfile(userProfile);
    } else {
      setProfile(null);
    }
  };

  //custom registerHandler that updates state
  const registerHandler = async (
    email: string,
    password: string,
    username: string
  ) => {
    const userCred = await registerUser(email, password, username);
    setUser(userCred);
    const newProfile = await fetchUserProfile(userCred.uid);
    if (newProfile) {
      const userProfile: userProfile = {
        email: newProfile.email,
        username: newProfile.username,
        createdAt: newProfile.createdAt,
        lastLogin: newProfile.lastLogin,
        preferences: {
          notifications: newProfile.preferences.notifications,
          theme: newProfile.preferences.theme,
        },
      };
      setProfile(userProfile);
    } else {
      setProfile(null);
    }
  };

  return (
    //.Provider passes all the context to the child components
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login: loginHandler,
        register: registerHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
