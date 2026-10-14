
"use client";

import { useState } from "react";

type SettingsTab =
  | "company"
  | "work"
  | "notifications"
  | "preferences";

type CompanySettings = {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
};

type WorkSettings = {
  taskPrefix: string;
  defaultDueDays: number;
  requireTimeLog: boolean;
  requireBlockReason: boolean;
  requireCompletionComment: boolean;
};

type NotificationSettings = {
  taskDeadlines: boolean;
  blockedTasks: boolean;
  documentExpiry: boolean;
  dailyReminders: boolean;
};

type PreferenceSettings = {
  dateFormat: string;
  timeZone: string;
  workingHours: number;
  weekStarts: string;
};

const initialCompany: CompanySettings = {
  companyName: "Al Fath Accounts & Tax Solutions",
  email: "info@alfathuae.com",
  phone: "+971 58 584 8008",
  address: "Building No. 33 M04, Defence Road, Al Nahyan, Abu Dhabi, UAE",
  taxNumber: "",
};

const initialWork: WorkSettings = {
  taskPrefix: "TSK",
  defaultDueDays: 7,
  requireTimeLog: true,
  requireBlockReason: true,
  requireCompletionComment: false,
};

const initialNotifications: NotificationSettings = {
  taskDeadlines: true,
  blockedTasks: true,
  documentExpiry: true,
  dailyReminders: false,
};

const initialPreferences: PreferenceSettings = {
  dateFormat: "DD/MM/YYYY",
  timeZone: "Asia/Dubai",
  workingHours: 8,
  weekStarts: "Monday",
};

const tabs: { id: SettingsTab; label: string; description: string }[] = [
  {
    id: "company",
    label: "Company profile",
    description: "Business identity and contact details",
  },
  {
    id: "work",
    label: "Work settings",
    description: "Task defaults and work rules",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Reminders and operational alerts",
  },
  {
    id: "preferences",
    label: "Preferences",
    description: "Date, time, and working hours",
  },
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const selectClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [company, setCompany] = useState(initialCompany);
  const [work, setWork] = useState(initialWork);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [message, setMessage] = useState("");

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(
      "Settings updated in this page only. Database persistence is not connected yet.",
    );
  }

  function resetCurrentSection() {
    if (activeTab === "company") setCompany({ ...initialCompany });
    if (activeTab === "work") setWork({ ...initialWork });
    if (activeTab === "notifications") {
      setNotifications({ ...initialNotifications });
    }
    if (activeTab === "preferences") {
      setPreferences({ ...initialPreferences });
    }

    setMessage("This section has been restored to its prototype defaults.");
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 pb-10 text-slate-900">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">System administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure company details, work rules, notifications, and system
            preferences.
          </p>
        </div>
      </header>

      {message && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900"
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
            className="shrink-0 font-medium"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="rounded-xl border border-slate-200 bg-white p-2"
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setMessage("");
                }}
                aria-current={selected ? "page" : undefined}
                className={`mb-1 w-full rounded-lg px-3 py-3 text-left transition last:mb-0 ${
                  selected
                    ? "bg-brand-50 text-brand-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="block text-sm font-medium">{tab.label}</span>
                <span
                  className={`mt-1 block text-xs leading-5 ${
                    selected ? "text-brand-700" : "text-slate-500"
                  }`}
                >
                  {tab.description}
                </span>
              </button>
            );
          })}
        </nav>

        <form
          key={activeTab}
          onSubmit={saveSettings}
          className="min-w-0 space-y-5"
        >
          {activeTab === "company" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading
                title="Company profile"
                description="Maintain the business identity used throughout the workspace."
              />

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="company-name"
                    className="text-sm font-medium"
                  >
                    Company name *
                  </label>
                  <input
                    id="company-name"
                    required
                    maxLength={150}
                    value={company.companyName}
                    onChange={(event) =>
                      setCompany({
                        ...company,
                        companyName: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="company-email"
                    className="text-sm font-medium"
                  >
                    Contact email *
                  </label>
                  <input
                    id="company-email"
                    required
                    type="email"
                    maxLength={254}
                    value={company.email}
                    onChange={(event) =>
                      setCompany({ ...company, email: event.target.value })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="company-phone"
                    className="text-sm font-medium"
                  >
                    Contact phone
                  </label>
                  <input
                    id="company-phone"
                    type="tel"
                    maxLength={30}
                    value={company.phone}
                    onChange={(event) =>
                      setCompany({ ...company, phone: event.target.value })
                    }
                    className={inputClass}
                    placeholder="+971 ..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="company-address"
                    className="text-sm font-medium"
                  >
                    Business address
                  </label>
                  <textarea
                    id="company-address"
                    rows={3}
                    maxLength={500}
                    value={company.address}
                    onChange={(event) =>
                      setCompany({ ...company, address: event.target.value })
                    }
                    className={inputClass}
                    placeholder="Enter the registered business address"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="company-tax"
                    className="text-sm font-medium"
                  >
                    Tax registration number
                  </label>
                  <input
                    id="company-tax"
                    maxLength={100}
                    value={company.taxNumber}
                    onChange={(event) =>
                      setCompany({ ...company, taxNumber: event.target.value })
                    }
                    className={inputClass}
                    placeholder="Enter tax registration number"
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === "work" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading
                title="Work settings"
                description="Set defaults and rules for tasks and workflow operations."
              />

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="task-prefix" className="text-sm font-medium">
                    Task ID prefix *
                  </label>
                  <input
                    id="task-prefix"
                    required
                    minLength={2}
                    maxLength={10}
                    pattern="[A-Za-z0-9-]+"
                    value={work.taskPrefix}
                    onChange={(event) =>
                      setWork({ ...work, taskPrefix: event.target.value })
                    }
                    className={inputClass}
                    placeholder="TSK"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Example: TSK-0001
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="due-days"
                    className="text-sm font-medium"
                  >
                    Default due date (days)
                  </label>
                  <input
                    id="due-days"
                    type="number"
                    required
                    min={1}
                    max={365}
                    value={work.defaultDueDays}
                    onChange={(event) =>
                      setWork({
                        ...work,
                        defaultDueDays: Number(event.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-6 divide-y divide-slate-200 border-t border-slate-200">
                <Toggle
                  checked={work.requireTimeLog}
                  onChange={(checked) =>
                    setWork({ ...work, requireTimeLog: checked })
                  }
                  label="Require time logging"
                  description="Require time to be recorded before work is marked complete."
                />
                <Toggle
                  checked={work.requireBlockReason}
                  onChange={(checked) =>
                    setWork({ ...work, requireBlockReason: checked })
                  }
                  label="Require a blocked reason"
                  description="Ask for a reason whenever a task or stage is blocked."
                />
                <Toggle
                  checked={work.requireCompletionComment}
                  onChange={(checked) =>
                    setWork({ ...work, requireCompletionComment: checked })
                  }
                  label="Require completion comments"
                  description="Require a note when work is marked completed."
                />
              </div>
            </section>
          )}

          {activeTab === "notifications" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading
                title="Notifications"
                description="Choose which operational events should trigger reminders."
              />

              <div className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
                <Toggle
                  checked={notifications.taskDeadlines}
                  onChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      taskDeadlines: checked,
                    })
                  }
                  label="Task deadline reminders"
                  description="Notify relevant staff about approaching and overdue deadlines."
                />
                <Toggle
                  checked={notifications.blockedTasks}
                  onChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      blockedTasks: checked,
                    })
                  }
                  label="Blocked work alerts"
                  description="Alert managers when work is blocked."
                />
                <Toggle
                  checked={notifications.documentExpiry}
                  onChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      documentExpiry: checked,
                    })
                  }
                  label="Document expiry reminders"
                  description="Flag documents approaching their expiry date."
                />
                <Toggle
                  checked={notifications.dailyReminders}
                  onChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      dailyReminders: checked,
                    })
                  }
                  label="Daily update reminders"
                  description="Remind staff to submit their daily work updates."
                />
              </div>
            </section>
          )}

          {activeTab === "preferences" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading
                title="System preferences"
                description="Configure date display, timezone, and working schedule defaults."
              />

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="date-format"
                    className="text-sm font-medium"
                  >
                    Date format
                  </label>
                  <select
                    id="date-format"
                    value={preferences.dateFormat}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        dateFormat: event.target.value,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="time-zone" className="text-sm font-medium">
                    Time zone
                  </label>
                  <select
                    id="time-zone"
                    value={preferences.timeZone}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        timeZone: event.target.value,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="working-hours"
                    className="text-sm font-medium"
                  >
                    Standard working hours per day
                  </label>
                  <input
                    id="working-hours"
                    type="number"
                    required
                    min={1}
                    max={24}
                    value={preferences.workingHours}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        workingHours: Number(event.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="week-starts"
                    className="text-sm font-medium"
                  >
                    Week starts on
                  </label>
                  <select
                    id="week-starts"
                    value={preferences.weekStarts}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        weekStarts: event.target.value,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={resetCurrentSection}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset section
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Save settings
            </button>
          </div>
        </form>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Prototype only. Settings currently remain in page state and reset on
        refresh. Saving to PostgreSQL, notification delivery, and enforcing work
        rules will be implemented through the API later.
      </p>
    </main>
  );
}
