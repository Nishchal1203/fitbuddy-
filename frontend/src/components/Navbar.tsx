"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Sparkles, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import LogoFull from "@/assets/Logo_full.svg";
import Image from "next/image";
import { API_BASE_URL, buildAuthHeaders, getAuthToken } from "@/Utils/api";

type EnterpriseTopNavProps = {
  onLogout?: () => Promise<void> | void;
};

export default function EnterpriseTopNav({ onLogout }: EnterpriseTopNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const clearAvatarObjectUrl = useCallback(() => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
  }, []);

  const loadAvatar = useCallback(async () => {
    if (!getAuthToken()) {
      clearAvatarObjectUrl();
      setAvatarSrc(null);
      return;
    }

    clearAvatarObjectUrl();
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
        headers: buildAuthHeaders(),
      });

      if (!response.ok) {
        setAvatarSrc(null);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      avatarObjectUrlRef.current = objectUrl;
      setAvatarSrc(objectUrl);
    } catch {
      setAvatarSrc(null);
    }
  }, [clearAvatarObjectUrl]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    loadAvatar();
  }, [loadAvatar, pathname]);

  useEffect(() => {
    const onAvatarUpdated = () => {
      loadAvatar();
    };

    window.addEventListener("profile-avatar-updated", onAvatarUpdated);
    return () => {
      window.removeEventListener("profile-avatar-updated", onAvatarUpdated);
      clearAvatarObjectUrl();
    };
  }, [clearAvatarObjectUrl, loadAvatar]);

  const aiTrainerActive = pathname?.startsWith("/without_sidebar/chat");

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src={LogoFull}
            alt="FitBuddy"
            width={150}
            height={150}
            className="h-auto w-28 sm:w-[150px]"
          />
          {/* <p className="text-sm font-semibold text-gray-800">FitBuddy</p> */}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/without_sidebar/chat">
            <Button
              variant={aiTrainerActive ? "primary" : "outline"}
              size="sm"
              className="border-brand-pale bg-brand-pale text-brand-slate hover:bg-brand-pale"
            >
              <Sparkles size={14} className="sm:hidden" />
              <span className="hidden sm:inline">AI Trainer</span>
            </Button>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="User avatar"
                  className="h-[22px] w-[22px] rounded-full object-cover"
                />
              ) : (
                <UserCircle2 size={22} className="text-gray-600" />
              )}
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
                role="menu"
              >
                <Link
                  href="/dashboard/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  role="menuitem"
                >
                  Edit profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    void onLogout?.();
                  }}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
