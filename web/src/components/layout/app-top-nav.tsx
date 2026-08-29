import { Bot, Menu, Cloud, User, LogOut } from "lucide-react";
import { Button, Tooltip, Dropdown } from "antd";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";
import { AppConfigModal } from "@/components/layout/app-config-modal";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { UserStatusActions } from "@/components/layout/user-status-actions";
import { Sub2ApiLoginModal } from "@/components/layout/sub2api-login-modal";
import { useUserStore } from "@/stores/use-user-store";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useAgentStore } from "@/stores/use-agent-store";
import { useConfigStore } from "@/stores/use-config-store";

export function AppTopNav() {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [sub2apiLoginOpen, setSub2apiLoginOpen] = useState(false);
    const autoConnectRef = useRef(false);
    const agentToken = useAgentStore((state) => state.token);
    const agentEnabled = useAgentStore((state) => state.enabled);
    const agentConnected = useAgentStore((state) => state.connected);
    const connectAgent = useAgentStore((state) => state.connectAgent);
    const togglePanel = useAgentStore((state) => state.togglePanel);
    const panelOpen = useAgentStore((state) => state.panelOpen);
    const hideHeader = /^\/canvas\/[^/]+/.test(pathname);
    const slug = pathname.split("/").filter(Boolean)[0];
    const activeToolSlug = navigationTools.some((tool) => tool.slug === slug) ? (slug as NavigationToolSlug) : undefined;

    // 用户登录状态
    const userInfo = useUserStore((state) => state.userInfo);
    const isLoggedIn = useUserStore((state) => state.isLoggedIn);
    const clearUserInfo = useUserStore((state) => state.clearUserInfo);
    const clearAiCredentials = useConfigStore((state) => state.clearAiCredentials);

    const handleLogout = () => {
        clearAiCredentials();
        clearUserInfo();
    };

    useEffect(() => {
        if (autoConnectRef.current || agentEnabled || agentConnected || !agentToken.trim()) return;
        autoConnectRef.current = true;
        connectAgent({ silent: true });
    }, [agentConnected, agentEnabled, agentToken, connectAgent]);

    return (
        <>
            {!hideHeader ? (
                <header className="sticky top-0 z-20 h-14 shrink-0 border-b border-stone-200 bg-background/90 backdrop-blur-xl dark:border-stone-800">
                    <div className="mx-auto flex h-full max-w-7xl items-stretch justify-between gap-5 px-6">
                        <div className="flex min-w-0 items-center">
                            <Link to="/" className="flex h-full shrink-0 items-center gap-2 text-sm font-semibold leading-none tracking-tight text-stone-400 transition hover:text-stone-100 dark:text-stone-400 dark:hover:text-stone-100">
                                <span
                                    className="size-5 shrink-0 bg-current"
                                    style={{
                                        mask: "url(/logo.svg) center / contain no-repeat",
                                        WebkitMask: "url(/logo.svg) center / contain no-repeat",
                                    }}
                                />
                                <span className="text-base font-medium">{t("meta.title")}</span>
                            </Link>

                            <button
                                type="button"
                                className="ml-3 inline-flex size-8 shrink-0 items-center justify-center text-stone-600 transition hover:text-stone-950 md:hidden dark:text-stone-300 dark:hover:text-white"
                                onClick={() => setMobileNavOpen(true)}
                                aria-label={t("topNav.openMenu")}
                                title={t("topNav.menu")}
                            >
                                <Menu className="size-5" />
                            </button>

                            <nav className="hide-scrollbar ml-8 hidden h-14 min-w-0 items-center gap-7 overflow-x-auto md:flex">
                                {navigationTools.map((tool) => {
                                    const Icon = tool.icon;
                                    const active = tool.slug === activeToolSlug;
                                    return (
                                        <Link
                                            key={tool.slug}
                                            to={`/${tool.slug}`}
                                            className={cn(
                                                "relative flex h-14 shrink-0 items-center gap-2 text-sm leading-6 transition after:absolute after:inset-x-0 after:bottom-0 after:h-px",
                                                active
                                                    ? "font-medium text-stone-100 after:bg-primary dark:text-stone-100 dark:after:bg-primary"
                                                    : "text-stone-400 after:bg-transparent hover:text-stone-100 dark:text-stone-400 dark:hover:text-stone-100",
                                            )}
                                        >
                                            <Icon className="size-4" />
                                            <span className="truncate">{t(`navigation.${tool.slug}`)}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="my-auto flex h-9 min-w-0 items-center justify-end gap-2 justify-self-end whitespace-nowrap">
                            {isLoggedIn && userInfo ? (
                                <>
                                    <Dropdown
                                        menu={{
                                            items: [
                                                {
                                                    key: "email",
                                                    label: userInfo.email,
                                                    disabled: true,
                                                },
                                                { type: "divider" },
                                                {
                                                    key: "logout",
                                                    label: t("topNav.logout"),
                                                    icon: <LogOut className="size-4" />,
                                                    onClick: handleLogout,
                                                },
                                            ],
                                        }}
                                        placement="bottomRight"
                                    >
                                        <div className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-stone-100 px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">
                                            <User className="size-4" />
                                            {userInfo.username || userInfo.name || userInfo.email}
                                        </div>
                                    </Dropdown>
                                    <div className="flex h-8 items-center justify-center rounded-md bg-blue-500/10 px-3 text-sm font-medium text-blue-500 dark:bg-blue-400/10 dark:text-blue-400">
                                        ¥{userInfo.balance?.toFixed(2) ?? "0.00"}
                                    </div>
                                </>
                            ) : (
                                <Button
                                    type="primary"
                                    icon={<Cloud className="size-4" />}
                                    onClick={() => setSub2apiLoginOpen(true)}
                                >
                                    <span className="md:hidden">{t("topNav.login")}</span>
                                    <span className="hidden md:inline">{t("topNav.userLogin")}</span>
                                </Button>
                            )}
                            <Tooltip title={t(panelOpen ? "topNav.closeAgent" : "topNav.openAgent")}>
                                <Button type="text" shape="circle" className="!h-8 !w-8 !min-w-8" icon={<Bot className="size-4" />} onClick={togglePanel} aria-label={t(panelOpen ? "topNav.closeAgent" : "topNav.openAgent")} />
                            </Tooltip>
                            <UserStatusActions showConfig={false} />
                        </div>
                    </div>
                </header>
            ) : null}

            <MobileNavDrawer open={mobileNavOpen} activeToolSlug={activeToolSlug} onClose={() => setMobileNavOpen(false)} />
            <AppConfigModal />
            <Sub2ApiLoginModal open={sub2apiLoginOpen} onClose={() => setSub2apiLoginOpen(false)} />
        </>
    );
}
