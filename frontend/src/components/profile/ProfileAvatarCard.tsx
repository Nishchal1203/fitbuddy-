"use client";

import React, { useRef } from "react";
import { Camera, Trash2, UploadCloud, UserCircle2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

type ProfileAvatarCardProps = {
  avatarSrc: string | null;
  fullName: string;
  email: string;
  uploading: boolean;
  deleting: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
};

export default function ProfileAvatarCard({
  avatarSrc,
  fullName,
  email,
  uploading,
  deleting,
  onUpload,
  onDelete,
}: ProfileAvatarCardProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card className="overflow-hidden border-0 shadow-[0_12px_30px_-15px_rgba(81,90,106,0.45)]">
      <div className="bg-gradient-to-r from-brand-deep via-brand-purple to-brand-soft px-6 py-6 text-white">
        <CardTitle className="text-xl text-white">Profile Identity</CardTitle>
        <p className="mt-1 text-sm text-white/80">
          Your public presence on FitBuddy
        </p>
      </div>

      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-brand-bg shadow-lg">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Profile avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-pale text-brand-deep">
                <UserCircle2 size={48} />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 rounded-full bg-brand-gold p-1.5 text-brand-slate shadow">
              <Camera size={14} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-brand-slate">
              {fullName || "FitBuddy Member"}
            </h2>
            <p className="truncate text-sm text-brand-slate/70">{email}</p>
            <p className="mt-2 text-xs text-brand-slate/60">
              PNG/JPG/WEBP, up to 5MB
            </p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            onUpload(file);
            event.currentTarget.value = "";
          }}
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            loading={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl"
          >
            <UploadCloud size={16} />
            {uploading ? "Uploading..." : "Upload New Photo"}
          </Button>

          <Button
            type="button"
            variant="outline"
            loading={deleting}
            disabled={!avatarSrc}
            onClick={onDelete}
            className="rounded-xl"
          >
            <Trash2 size={16} />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
