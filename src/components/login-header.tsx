
'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Globe, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Logo } from "./icons";

export function LoginHeader() {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
        if(typeof window !== 'undefined') {
            localStorage.setItem('universe-lang', newLang);
        }
    };

    return (
        <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <button onClick={toggleLanguage} className="h-8 px-2.5 rounded-md border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5"/>
                <span>{i18n.language === 'en' ? 'عربي' : 'EN'}</span>
            </button>
        </div>
    )
}

export function LoginHeaderV2() {
    return (
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
            <div className="absolute inset-0 bg-zinc-900" />
            <Link href="/" className="relative z-20 flex items-center text-lg font-medium gap-2">
                <Logo />
                Universe Academy
            </Link>
            <div className="relative z-20 mt-auto">
                <blockquote className="space-y-2">
                <p className="text-lg">
                    &ldquo;The best way to predict the future is to create it.&rdquo;
                </p>
                <footer className="text-sm">Peter Drucker</footer>
                </blockquote>
            </div>
        </div>
    );
}

