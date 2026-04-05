"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { ProfileAvatarCard, ProfileFormCard } from "@/components/profile";
import { Card, CardContent } from "@/components/ui";
import { useToast } from "@/components/ui";
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

type UserProfile = {
  id: number;
  email: string;
  full_name: string | null;
  experience_level: string | null;
};

export default function ProfilePage() {
  const { showToast } = useToast();
  const avatarObjectUrlRef = useRef<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Beginner");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  const clearAvatarObjectUrl = useCallback(() => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
  }, []);

  const loadAvatar = useCallback(async () => {
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

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: buildAuthHeaders(),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to load profile.");
        throw new Error(message);
      }

      const payload = (await response.json()) as UserProfile;
      setUser(payload);
      setFullName(payload.full_name || "");
      setExperienceLevel(payload.experience_level || "Beginner");

      await loadAvatar();
    } catch (error) {
      showToast({
        title: "Profile load failed",
        description: error instanceof Error ? error.message : "Please refresh and try again.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [loadAvatar, showToast]);

  useEffect(() => {
    loadProfile();
    return () => clearAvatarObjectUrl();
  }, [clearAvatarObjectUrl, loadProfile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PATCH",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          experience_level: experienceLevel,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to update profile.");
        throw new Error(message);
      }

      const updated = (await response.json()) as UserProfile;
      setUser(updated);
      setFullName(updated.full_name || "");
      setExperienceLevel(updated.experience_level || "Beginner");

      showToast({
        title: "Profile updated",
        description: "Your profile changes have been saved successfully.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: "Image too large",
        description: "Please upload an image up to 5MB.",
        variant: "warning",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to upload avatar.");
        throw new Error(message);
      }

      await loadAvatar();
      window.dispatchEvent(new Event("profile-avatar-updated"));
      showToast({
        title: "Avatar updated",
        description: "Your profile photo has been uploaded.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setDeletingAvatar(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to delete avatar.");
        throw new Error(message);
      }

      clearAvatarObjectUrl();
      setAvatarSrc(null);
      window.dispatchEvent(new Event("profile-avatar-updated"));
      showToast({
        title: "Avatar removed",
        description: "Your profile photo has been deleted.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setDeletingAvatar(false);
    }
  };

  const initials = useMemo(() => {
    const source = fullName || user?.email || "U";
    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [fullName, user?.email]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-white" />
        <div className="h-64 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-slate via-brand-deep to-brand-purple px-7 py-8 text-white shadow-[0_18px_44px_-16px_rgba(81,90,106,0.65)]">
        <div className="pointer-events-none absolute -right-16 -top-12 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-brand-gold/20 blur-2xl" />

        <p className="text-xs uppercase tracking-[0.2em] text-white/65">Member Profile</p>
        <h1 className="mt-2 text-3xl font-bold">Build Your Premium Identity</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Personalize your profile for smarter plans, better coaching context, and a cleaner fitness journey.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
          <UserRound size={14} />
          {initials || "U"}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <ProfileAvatarCard
          avatarSrc={avatarSrc}
          fullName={fullName || user?.full_name || "FitBuddy Member"}
          email={user?.email || ""}
          uploading={uploading}
          deleting={deletingAvatar}
          onUpload={handleAvatarUpload}
          onDelete={handleAvatarDelete}
        />

        <ProfileFormCard
          fullName={fullName}
          experienceLevel={experienceLevel}
          saving={saving}
          onFullNameChange={setFullName}
          onExperienceLevelChange={setExperienceLevel}
          onSubmit={handleSaveProfile}
        />
      </div>

      <Card className="border-0 bg-white shadow-[0_10px_26px_-14px_rgba(81,90,106,0.55)]">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-pale bg-brand-bg p-4">
            <p className="text-xs uppercase tracking-wider text-brand-slate/60">Email</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-brand-slate">
              <Mail size={16} className="text-brand-deep" />
              {user?.email}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-pale bg-brand-bg p-4">
            <p className="text-xs uppercase tracking-wider text-brand-slate/60">Account Security</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-brand-slate">
              <ShieldCheck size={16} className="text-brand-deep" />
              Protected by token authentication
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
