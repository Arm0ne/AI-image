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
    modelCatalogLastSyncedAt: number | null;
    setUserInfo: (userInfo: UserInfo) => void;
    setAccessToken: (token: string) => void;
    setModelCatalogLastSyncedAt: (value: number) => void;
    clearUserInfo: () => void;
};

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            userInfo: null,
            accessToken: null,
            isLoggedIn: false,
            modelCatalogLastSyncedAt: null,
            setUserInfo: (userInfo) =>
                set({
                    userInfo,
                    isLoggedIn: true,
                }),
            setAccessToken: (token) =>
                set({
                    accessToken: token,
                }),
            setModelCatalogLastSyncedAt: (value) => set({ modelCatalogLastSyncedAt: value }),
            clearUserInfo: () =>
                set({
                    userInfo: null,
                    accessToken: null,
                    isLoggedIn: false,
                    modelCatalogLastSyncedAt: null,
                }),
        }),
        {
            name: "infinite-canvas:user_store",
        },
    ),
);
