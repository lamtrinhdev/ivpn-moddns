import Home from "@/pages/home/Home";
import type { JSX } from "react";

export default function HomeScreen(): JSX.Element {
    return (
        <div className="flex flex-col w-full gap-6 p-8 bg-[var(--shadcn-ui-app-background)]">
            <Home />
        </div>
    );
}
