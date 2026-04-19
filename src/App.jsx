import React, { useMemo, useState } from "react";

const STORAGE_KEY = "job-search-crm-applications";

const STATUSES = [
  "Wishlist",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
  "Archived",
];

const STATUS_COLORS = {
  Wishlist: "neutral",
  Applied: "blue",
  Interviewing: "green",
  Offer: "gold",
  Rejected: "red",
  Archived: "muted",
};

const emptyForm = {
  company: "",
  title: "",
  status: "Wishlist",
  location: "",
  workType: "Remote",
  priority: "Medium",
  salary: "",
  sourceUrl: "",
  applicationUrl: "",
  contactName: "",
  contactEmail: "",
  followUpDate: "",
  description: "",
  notes: "",
};

const demoApplications = [
  {
    id: crypto.randomUUID(),
    company: "Northstar Labs",
    title: "Frontend Engineer",
    status: "Interviewing",
    location: "Remote",
    workType: "Remote",
    priority: "High",
    salary: "$120k - $145k",
    sourceUrl: "https://linkedin.com",
    applicationUrl: "https://example.com/jobs/frontend-engineer",
    contactName: "Maya Chen",
    contactEmail: "maya@example.com",
    followUpDate: getDateOffset(2),
    description: "React role focused on internal product dashboards and design systems.",
    notes: "Prepare examples of complex UI work and performance improvements.",
    createdAt: getDateOffset(-5, true),
    updatedAt: getDateOffset(-1, true),
    statusChangedAt: getDateOffset(-1, true),
    activities: [
      makeActivity("Created application", getDateOffset(-5, true)),
      makeActivity("Status changed from Applied to Interviewing", getDateOffset(-1, true)),
    ],
  },
  {
    id: crypto.randomUUID(),
    company: "Atlas Health",
    title: "Product Designer",
    status: "Applied",
    location: "New York, NY",
    workType: "Hybrid",
    priority: "Medium",
    salary: "",
    sourceUrl: "https://wellfound.com",
    applicationUrl: "",
    contactName: "",
    contactEmail: "",
    followUpDate: getDateOffset(5),
    description: "Designer role for patient-facing workflows.",
    notes: "Ask about research cadence and product team structure.",
    createdAt: getDateOffset(-2, true),
    updatedAt: getDateOffset(-2, true),
    statusChangedAt: getDateOffset(-2, true),
    activities: [makeActivity("Created application", getDateOffset(-2, true))],
  },
];

function getDateOffset(days, withTime = false) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return withTime ? date.toISOString() : date.toISOString().slice(0, 10);
}

function makeActivity(message, at = new Date().toISOString()) {
  return {
    id: crypto.randomUUID(),
    message,
    at,
  };
}

function readStoredApplications() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : demoApplications;
  } catch {
    return demoApplications;
  }
}

function saveStoredApplications(applications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function App() {
  const [applications, setApplications] = useState(readStoredApplications);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(applications[0]?.id ?? null);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return applications
      .filter((application) => {
        const matchesStatus =
          statusFilter === "All" || application.status === statusFilter;
        const searchable = [
          application.company,
          application.title,
          application.location,
          application.description,
          application.notes,
          application.contactName,
        ]
          .join(" ")
          .toLowerCase();
        return matchesStatus && searchable.includes(normalizedQuery);
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [applications, query, statusFilter]);

  const selectedApplication =
    applications.find((application) => application.id === selectedId) ??
    filteredApplications[0] ??
    null;

  const metrics = useMemo(() => {
    const active = applications.filter(
      (application) => !["Rejected", "Archived"].includes(application.status),
    ).length;
    const interviews = applications.filter(
      (application) => application.status === "Interviewing",
    ).length;
    const followUps = applications.filter((application) => {
      if (!application.followUpDate) return false;
      const today = new Date().toISOString().slice(0, 10);
      return application.followUpDate <= today && !["Rejected", "Archived"].includes(application.status);
    }).length;

    return { active, interviews, followUps, total: applications.length };
  }, [applications]);

  function persist(nextApplications) {
    setApplications(nextApplications);
    saveStoredApplications(nextApplications);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const now = new Date().toISOString();

    if (editingId) {
      const nextApplications = applications.map((application) => {
        if (application.id !== editingId) return application;
        const statusChanged = application.status !== form.status;
        return {
          ...application,
          ...form,
          updatedAt: now,
          statusChangedAt: statusChanged ? now : application.statusChangedAt,
          activities: statusChanged
            ? [
                makeActivity(
                  `Status changed from ${application.status} to ${form.status}`,
                  now,
                ),
                ...application.activities,
              ]
            : application.activities,
        };
      });
      persist(nextApplications);
      setSelectedId(editingId);
      resetForm();
      return;
    }

    const newApplication = {
      id: crypto.randomUUID(),
      ...form,
      createdAt: now,
      updatedAt: now,
      statusChangedAt: now,
      activities: [makeActivity("Created application", now)],
    };
    const nextApplications = [newApplication, ...applications];
    persist(nextApplications);
    setSelectedId(newApplication.id);
    resetForm();
  }

  function startEdit(application) {
    setEditingId(application.id);
    setForm({
      company: application.company,
      title: application.title,
      status: application.status,
      location: application.location,
      workType: application.workType,
      priority: application.priority,
      salary: application.salary,
      sourceUrl: application.sourceUrl,
      applicationUrl: application.applicationUrl,
      contactName: application.contactName,
      contactEmail: application.contactEmail,
      followUpDate: application.followUpDate,
      description: application.description,
      notes: application.notes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteApplication(id) {
    const nextApplications = applications.filter((application) => application.id !== id);
    persist(nextApplications);
    if (selectedId === id) {
      setSelectedId(nextApplications[0]?.id ?? null);
    }
    if (editingId === id) resetForm();
  }

  function addQuickActivity(id, message) {
    if (!message.trim()) return;
    const now = new Date().toISOString();
    const nextApplications = applications.map((application) =>
      application.id === id
        ? {
            ...application,
            updatedAt: now,
            activities: [makeActivity(message.trim(), now), ...application.activities],
          }
        : application,
    );
    persist(nextApplications);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(applications, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "job-search-crm.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("Expected an array");
        persist(parsed);
        setSelectedId(parsed[0]?.id ?? null);
      } catch {
        alert("This file does not look like a valid CRM export.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <main>
      <section className="topbar">
        <div>
          <p className="eyebrow">Job Search CRM</p>
          <h1>Track every opportunity from first save to final answer.</h1>
        </div>
        <div className="topbar-actions">
          <button className="secondary" type="button" onClick={exportData}>
            Export JSON
          </button>
          <label className="secondary file-button">
            Import JSON
            <input type="file" accept="application/json" onChange={importData} />
          </label>
        </div>
      </section>

      <section className="metrics" aria-label="Application summary">
        <Metric label="Active" value={metrics.active} />
        <Metric label="Interviewing" value={metrics.interviews} />
        <Metric label="Follow-ups due" value={metrics.followUps} />
        <Metric label="Total saved" value={metrics.total} />
      </section>

      <section className="workspace">
        <form className="application-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <p className="eyebrow">{editingId ? "Edit application" : "New application"}</p>
              <h2>{editingId ? "Update the details" : "Add an opportunity"}</h2>
            </div>
            {editingId && (
              <button className="ghost" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>

          <div className="field-grid">
            <Field label="Company" required>
              <input
                value={form.company}
                onChange={(event) => updateForm("company", event.target.value)}
                placeholder="OpenAI"
                required
              />
            </Field>
            <Field label="Job title" required>
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Product Manager"
                required
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value)}
              >
                {STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(event) => updateForm("priority", event.target.value)}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </Field>
            <Field label="Location">
              <input
                value={form.location}
                onChange={(event) => updateForm("location", event.target.value)}
                placeholder="Berlin, Remote, London"
              />
            </Field>
            <Field label="Work type">
              <select
                value={form.workType}
                onChange={(event) => updateForm("workType", event.target.value)}
              >
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
                <option>Flexible</option>
              </select>
            </Field>
            <Field label="Salary range">
              <input
                value={form.salary}
                onChange={(event) => updateForm("salary", event.target.value)}
                placeholder="$90k - $120k"
              />
            </Field>
            <Field label="Follow-up date">
              <input
                type="date"
                value={form.followUpDate}
                onChange={(event) => updateForm("followUpDate", event.target.value)}
              />
            </Field>
            <Field label="Source link">
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(event) => updateForm("sourceUrl", event.target.value)}
                placeholder="https://linkedin.com/..."
              />
            </Field>
            <Field label="Application link">
              <input
                type="url"
                value={form.applicationUrl}
                onChange={(event) => updateForm("applicationUrl", event.target.value)}
                placeholder="https://company.com/jobs/..."
              />
            </Field>
            <Field label="Contact name">
              <input
                value={form.contactName}
                onChange={(event) => updateForm("contactName", event.target.value)}
                placeholder="Recruiter or referral"
              />
            </Field>
            <Field label="Contact email">
              <input
                type="email"
                value={form.contactEmail}
                onChange={(event) => updateForm("contactEmail", event.target.value)}
                placeholder="name@company.com"
              />
            </Field>
          </div>

          <Field label="Job description">
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              placeholder="Paste the useful parts of the role here."
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Interview prep, salary thoughts, recruiter notes, next action."
            />
          </Field>

          <button className="primary" type="submit">
            {editingId ? "Save changes" : "Add application"}
          </button>
        </form>

        <section className="list-panel">
          <div className="filters">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, title, notes..."
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option>All</option>
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="application-list">
            {filteredApplications.length === 0 ? (
              <EmptyState />
            ) : (
              filteredApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  selected={selectedApplication?.id === application.id}
                  onSelect={() => setSelectedId(application.id)}
                  onEdit={() => startEdit(application)}
                  onDelete={() => deleteApplication(application.id)}
                />
              ))
            )}
          </div>
        </section>
      </section>

      {selectedApplication && (
        <ApplicationDetails
          application={selectedApplication}
          onActivity={(message) => addQuickActivity(selectedApplication.id, message)}
        />
      )}
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Field({ label, required = false, children }) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function ApplicationCard({ application, selected, onSelect, onEdit, onDelete }) {
  return (
    <article className={`application-card ${selected ? "selected" : ""}`}>
      <button className="card-main" type="button" onClick={onSelect}>
        <div>
          <h3>{application.title}</h3>
          <p>{application.company}</p>
        </div>
        <StatusPill status={application.status} />
      </button>
      <div className="card-meta">
        <span>{application.location || "Location not set"}</span>
        <span>{application.priority} priority</span>
        <span>Updated {formatDate(application.updatedAt)}</span>
      </div>
      <p className="card-description">
        {application.description || "No job description saved yet."}
      </p>
      <div className="card-links">
        <ExternalLink href={application.sourceUrl}>Source</ExternalLink>
        <ExternalLink href={application.applicationUrl}>Application</ExternalLink>
      </div>
      <div className="card-actions">
        <button className="ghost" type="button" onClick={onEdit}>
          Edit
        </button>
        <button className="danger" type="button" onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  );
}

function ApplicationDetails({ application, onActivity }) {
  const [activity, setActivity] = useState("");

  function submitActivity(event) {
    event.preventDefault();
    onActivity(activity);
    setActivity("");
  }

  return (
    <section className="details">
      <div className="details-hero">
        <img
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"
          alt="A focused desk setup in a modern office"
        />
        <div>
          <p className="eyebrow">Selected opportunity</p>
          <h2>{application.title}</h2>
          <p>{application.company}</p>
        </div>
      </div>

      <div className="detail-grid">
        <Detail label="Status" value={<StatusPill status={application.status} />} />
        <Detail label="Location" value={application.location || "Not set"} />
        <Detail label="Work type" value={application.workType || "Not set"} />
        <Detail label="Priority" value={application.priority || "Not set"} />
        <Detail label="Salary" value={application.salary || "Not set"} />
        <Detail label="Follow-up" value={formatDate(application.followUpDate)} />
        <Detail label="Created" value={formatDateTime(application.createdAt)} />
        <Detail label="Status changed" value={formatDateTime(application.statusChangedAt)} />
      </div>

      <div className="links-row">
        <ExternalLink href={application.sourceUrl}>Source link</ExternalLink>
        <ExternalLink href={application.applicationUrl}>Application link</ExternalLink>
        {application.contactEmail && (
          <a href={`mailto:${application.contactEmail}`}>Email {application.contactName || "contact"}</a>
        )}
      </div>

      <div className="text-columns">
        <section>
          <h3>Job description</h3>
          <p>{application.description || "No description saved yet."}</p>
        </section>
        <section>
          <h3>Notes</h3>
          <p>{application.notes || "No notes saved yet."}</p>
        </section>
      </div>

      <form className="activity-form" onSubmit={submitActivity}>
        <input
          value={activity}
          onChange={(event) => setActivity(event.target.value)}
          placeholder="Add activity: emailed recruiter, prepared case study, phone screen..."
        />
        <button className="primary" type="submit">
          Add activity
        </button>
      </form>

      <div className="activity-list">
        {application.activities.map((item) => (
          <article key={item.id}>
            <span>{formatDateTime(item.at)}</span>
            <p>{item.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }) {
  return <span className={`status ${STATUS_COLORS[status]}`}>{status}</span>;
}

function ExternalLink({ href, children }) {
  if (!href) return <span className="disabled-link">{children} not set</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function EmptyState() {
  return (
    <article className="empty-state">
      <img
        src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80"
        alt="A notebook and laptop on a desk"
      />
      <h3>No matching applications</h3>
      <p>Change the search or add a new opportunity.</p>
    </article>
  );
}
