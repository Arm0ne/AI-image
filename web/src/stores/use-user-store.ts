import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserInfo = {
    id: number;
    email: string;
    username?: string;
    name?: string;
    balance?: number;
};

type UserStore = {
    userInfo: UserInfo | null;
    accessToken: string | null;
    isLoggedIn: boolean;
    setUserInfo: (userInfo: UserInfo) => void;
    setAccessToken: (token: string) => void;
    clearUserInfo: () => void;
};

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            userInfo: null,
            accessToken: null,
            isLoggedIn: false,
            setUserInfo: (userInfo) =>
                set({
                    userInfo,
                    isLoggedIn: true,
                }),
            setAccessToken: (token) =>
                set({
                    accessToken: token,
                }),
            clearUserInfo: () =>
                set({
                    userInfo: null,
                    accessToken: null,
                    isLoggedIn: false,
                }),
        }),
        {
            name: "infinite-canvas:user_store",
        },
    ),
);
