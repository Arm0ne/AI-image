import { ArrowRight } from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

import { navigationTools } from "@/constant/navigation-tools";
import { TypewriterText } from "@/components/typewriter-text";
import { ParticleCanvas } from "@/components/particle-canvas";

function Highlighter({ action, color, children }: { action: "highlight" | "underline"; color: string; children?: ReactNode }) {
    return (
        <span className="relative inline-block px-1">
            {action === "highlight" ? (
                <span className="absolute inset-x-0 bottom-0 top-1 rounded-sm opacity-45" style={{ backgroundColor: color }} />
            ) : (
                <span className="absolute inset-x-0 bottom-0 h-1 rounded-full opacity-80" style={{ backgroundColor: color }} />
            )}
            <span className="relative font-medium text-stone-800 dark:text-stone-200">{children}</span>
        </span>
    );
}

export default function IndexPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [primaryTool] = navigationTools;

    return (
        <main className="relative h-full overflow-y-auto text-stone-950 dark:text-stone-100">
            <div className="pointer-events-none fixed inset-0 bg-[#0D1117]" style={{ zIndex: -10 }} />
            <ParticleCanvas />
            <section className="relative mx-auto min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden px-6">
                <div
                    className="pointer-events-none absolute"
                    style={{
                        zIndex: 0,
                        left: '50%',
                        top: '35%',
                        width: '700px',
                        height: '700px',
                        transform: 'translate(-50%, -50%)',
                        background: 'radial-gradient(circle, rgba(245, 166, 35, 0.28) 0%, rgba(245, 166, 35, 0) 70%)'
                    }}
                />
                <div
                    className="pointer-events-none absolute"
                    style={{
                        zIndex: 0,
                        left: '65%',
                        top: '55%',
                        width: '600px',
                        height: '600px',
                        transform: 'translate(-50%, -50%)',
                        background: 'radial-gradient(circle, rgba(91, 155, 213, 0.22) 0%, rgba(91, 155, 213, 0) 70%)'
                    }}
                />
                <div className="relative flex min-h-[620px] flex-col items-center justify-center pt-16 text-center">
                    <div className="min-h-[16rem] sm:min-h-[20rem] lg:min-h-[24rem]">
                        <TypewriterText
                            strings={[
                                "发挥你的<span style='color:#FF9800'>创造力</span>，<br/>构建<span style='color:#87CEFA'>无限的可能</span>。",
                                "让每一个<span style='color:#FF9800'>TOKEN</span>，<br/>都有<span style='color:#87CEFA'>价值</span>。"
                            ]}
                            className="ai-title-aurora inline-block max-w-5xl text-balance text-5xl font-semibold leading-snug tracking-normal sm:text-7xl sm:leading-snug lg:text-8xl lg:leading-snug"
                        />
                    </div>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        <Button type="primary" size="large" onClick={() => navigate("/canvas")} icon={<ArrowRight className="size-4" />} iconPlacement="end">
                            {t("home.openCanvas")}
                        </Button>
                        <Button size="large" onClick={() => navigate("/image")}>
                            {t("home.openImageWorkbench")}
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
