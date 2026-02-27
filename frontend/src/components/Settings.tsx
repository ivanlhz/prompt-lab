import { useState } from "react";
import type { AppSettings } from "../types";
import { useSettings } from "../hooks/useSettings";
import Button from "./atoms/Button";
import Card from "./atoms/Card";
import Input from "./atoms/Input";
import FormField from "./molecules/FormField";
import PageHeader from "./organisms/PageHeader";

function PasswordField({
  id,
  label,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField id={id} label={label}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="pr-16"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-app-subtext hover:text-app-text"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </FormField>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold text-app-text">{title}</h2>
      {children}
    </Card>
  );
}

function TextField({
  id,
  label,
  value,
  onValueChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <FormField id={id} label={label}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FormField>
  );
}

export default function Settings() {
  const { settings, status, error, isDirty, setField, getValue, save, reset } =
    useSettings();

  if (!settings && status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-app-subtext">Loading settings...</p>
      </div>
    );
  }

  const bind = (key: keyof AppSettings) => ({
    value: getValue(key),
    onValueChange: (v: string) => setField(key, v as never),
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader.Root>
        <PageHeader.Title
          title="Settings"
          description="Manage API keys, storage, and operational limits"
        />
        <PageHeader.Actions>
          <div className="flex items-center gap-2">
            {status === "success" && (
              <span className="text-sm text-green-400">Saved!</span>
            )}
            {status === "error" && error && (
              <span className="text-sm text-red-400">Error</span>
            )}
            {isDirty && (
              <Button variant="ghost" onClick={reset}>
                Discard
              </Button>
            )}
            <Button
              onClick={save}
              disabled={!isDirty || status === "saving"}
            >
              {status === "saving" ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </PageHeader.Actions>
      </PageHeader.Root>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {error && (
            <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Section title="Provider API Keys">
            <PasswordField id="GEMINI_API_KEY" label="Gemini API Key" {...bind("GEMINI_API_KEY")} />
            <PasswordField id="OPENAI_API_KEY" label="OpenAI API Key" {...bind("OPENAI_API_KEY")} />
            <PasswordField id="PYAPI_API_KEY" label="PyAPI / PiAPI Key" {...bind("PYAPI_API_KEY")} />
          </Section>

          <Section title="Provider Base URLs">
            <TextField id="GEMINI_API_BASE_URL" label="Gemini API Base URL" placeholder="Default" {...bind("GEMINI_API_BASE_URL")} />
            <TextField id="PYAPI_BASE_URL" label="PyAPI Base URL" placeholder="Default" {...bind("PYAPI_BASE_URL")} />
          </Section>

          <Section title="Storage">
            <TextField id="DATA_DIR" label="Data Directory" {...bind("DATA_DIR")} />
          </Section>

          <Section title="Cloudinary">
            <TextField id="CLOUDINARY_CLOUD_NAME" label="Cloud Name" {...bind("CLOUDINARY_CLOUD_NAME")} />
            <PasswordField id="CLOUDINARY_API_KEY" label="API Key" {...bind("CLOUDINARY_API_KEY")} />
            <PasswordField id="CLOUDINARY_API_SECRET" label="API Secret" {...bind("CLOUDINARY_API_SECRET")} />
          </Section>

          <Section title="Operational">
            <FormField id="MAX_CONCURRENT_TRIALS" label="Max Concurrent Trials (1-10)">
              <Input
                id="MAX_CONCURRENT_TRIALS"
                type="number"
                min={1}
                max={10}
                value={getValue("MAX_CONCURRENT_TRIALS")}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) setField("MAX_CONCURRENT_TRIALS", n);
                }}
              />
            </FormField>
          </Section>
        </div>
      </div>
    </div>
  );
}
