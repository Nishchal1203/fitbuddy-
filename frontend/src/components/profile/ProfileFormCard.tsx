"use client";

import React from "react";
import { Save, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "@/components/ui";

type ProfileFormCardProps = {
  fullName: string;
  experienceLevel: string;
  saving: boolean;
  onFullNameChange: (value: string) => void;
  onExperienceLevelChange: (value: string) => void;
  onSubmit: () => void;
};

const LEVEL_OPTIONS = [
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
  { value: "Athlete", label: "Athlete" },
];

export default function ProfileFormCard({
  fullName,
  experienceLevel,
  saving,
  onFullNameChange,
  onExperienceLevelChange,
  onSubmit,
}: ProfileFormCardProps) {
  return (
    <Card className="border-0 shadow-[0_12px_30px_-15px_rgba(81,90,106,0.45)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-deep" />
          <CardTitle>Profile Details</CardTitle>
        </div>
        <CardDescription>Keep your profile updated for better recommendations.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          label="Full name"
          value={fullName}
          onChange={(event) => onFullNameChange(event.target.value)}
          placeholder="Enter your full name"
          maxLength={255}
        />

        <Select
          label="Experience level"
          value={experienceLevel || "Beginner"}
          onChange={(event) => onExperienceLevelChange(event.target.value)}
          options={LEVEL_OPTIONS}
        />

        <div className="pt-2">
          <Button type="button" loading={saving} onClick={onSubmit} className="rounded-xl">
            <Save size={16} />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
