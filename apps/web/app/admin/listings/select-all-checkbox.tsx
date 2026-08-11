'use client';

/** Toggles every per-row checkbox associated with the bulk form. Plain
 * DOM query rather than React state — the checkboxes live in server-
 * rendered rows this component has no direct relationship to. */
export function SelectAllCheckbox({ formId }: { formId: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-foreground-secondary">
      <input
        type="checkbox"
        onChange={(e) => {
          const checkboxes = document.querySelectorAll<HTMLInputElement>(
            `input[type="checkbox"][form="${formId}"]`,
          );
          checkboxes.forEach((checkbox) => {
            checkbox.checked = e.target.checked;
          });
        }}
      />
      Select all
    </label>
  );
}
