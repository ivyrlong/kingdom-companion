"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileSettingsProps {
  currentAgeGroup: string;
  displayName: string;
  congregation: string;
}

const AGE_GROUPS = [
  { value: "LITTLE_ONES", label: "Little Ones (5-8)", description: "Simpler games, larger text, fewer options" },
  { value: "YOUTH", label: "Youth (9-17)", description: "Moderate difficulty, mix of fun and learning" },
  { value: "ADULT", label: "Adult (18+)", description: "Full difficulty, deeper Bible content" },
  { value: "FAMILY", label: "Family", description: "All games visible, great for mixed groups" },
];

export default function ProfileSettings({
  currentAgeGroup,
  displayName: initialName,
  congregation: initialCong,
}: ProfileSettingsProps) {
  const router = useRouter();
  const [ageGroup, setAgeGroup] = useState(currentAgeGroup);
  const [displayName, setDisplayName] = useState(initialName);
  const [congregation, setCongregation] = useState(initialCong);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges =
    ageGroup !== currentAgeGroup ||
    displayName !== initialName ||
    congregation !== initialCong;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageGroup, displayName, congregation }),
      });
      if (res.ok) {
        setSaved(true);
        // Refresh page to update server-side data + re-sign JWT on next request
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 mb-8">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
        Settings
      </h2>

      <div className="space-y-6">
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-coral-500 focus:border-transparent outline-none transition"
          />
        </div>

        {/* Congregation */}
        <div>
          <label htmlFor="congregation" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Congregation <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            id="congregation"
            type="text"
            value={congregation}
            onChange={(e) => setCongregation(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-coral-500 focus:border-transparent outline-none transition"
            placeholder="e.g., Springfield North"
          />
        </div>

        {/* Age Group */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Age Group
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            {AGE_GROUPS.map((ag) => (
              <button
                key={ag.value}
                onClick={() => setAgeGroup(ag.value)}
                className={`text-left p-4 rounded-xl border-2 transition ${
                  ageGroup === ag.value
                    ? "border-coral-500 bg-coral-50 dark:bg-coral-900/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <div className={`text-sm font-semibold ${
                  ageGroup === ag.value
                    ? "text-coral-700 dark:text-coral-300"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}>
                  {ag.label}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {ag.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Saved!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
