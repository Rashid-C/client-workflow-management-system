
"use client";

import { useMemo, useState } from "react";

type EmployeeRole = "Super Admin" | "Manager" | "Staff";
type EmployeeStatus = "Active" | "Inactive";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  joinedDate: string;
  assignedTasks: number;
};

const initialEmployees: Employee[] = [
  {
    id: "EMP-001",
    name: "Alex Morgan",
    email: "alex@tickwise.example",
    phone: "+971 50 000 0001",
    designation: "System Administrator",
    role: "Super Admin",
    status: "Active",
    joinedDate: "2026-01-10",
    assignedTasks: 0,
  },
  {
    id: "EMP-002",
    name: "Sarah Thomas",
    email: "sarah@tickwise.example",
    phone: "+971 50 000 0002",
    designation: "Accounts Manager",
    role: "Manager",
    status: "Active",
    joinedDate: "2026-02-15",
    assignedTasks: 8,
  },
  {
    id: "EMP-003",
    name: "Rahul Nair",
    email: "rahul@tickwise.example",
    phone: "+971 50 000 0003",
    designation: "Accountant",
    role: "Staff",
    status: "Active",
    joinedDate: "2026-03-01",
    assignedTasks: 12,
  },
  {
    id: "EMP-004",
    name: "Maya Joseph",
    email: "maya@tickwise.example",
    phone: "+971 50 000 0004",
    designation: "Audit Assistant",
    role: "Staff",
    status: "Active",
    joinedDate: "2026-04-12",
    assignedTasks: 6,
  },
  {
    id: "EMP-005",
    name: "Daniel Mathew",
    email: "daniel@tickwise.example",
    phone: "+971 50 000 0005",
    designation: "Accounts Executive",
    role: "Staff",
    status: "Inactive",
    joinedDate: "2025-11-20",
    assignedTasks: 0,
  },
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none transition focus:border-blue-500";

const roleStyles: Record<EmployeeRole, string> = {
  "Super Admin":
    "border-purple-200 bg-purple-50 text-purple-700",
  Manager: "border-blue-200 bg-blue-50 text-blue-700",
  Staff: "border-gray-200 bg-gray-50 text-gray-700",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<EmployeeRole>("Staff");
  const [joinedDate, setJoinedDate] = useState("");
  const [formError, setFormError] = useState("");

  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((employee) => employee.status === "Active")
        .length,
      inactive: employees.filter(
        (employee) => employee.status === "Inactive",
      ).length,
      managers: employees.filter(
        (employee) =>
          employee.role === "Manager" || employee.role === "Super Admin",
      ).length,
    }),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch = [
        employee.id,
        employee.name,
        employee.email,
        employee.phone,
        employee.designation,
      ].some((value) => value.toLowerCase().includes(query));

      const matchesRole =
        roleFilter === "All" || employee.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" || employee.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, search, roleFilter, statusFilter]);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setRole("Staff");
    setJoinedDate("");
    setFormError("");
  }

  function addEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (
      employees.some(
        (employee) =>
          employee.email.toLowerCase() === email.trim().toLowerCase(),
      )
    ) {
      setFormError("An employee with this email already exists.");
      return;
    }

    const newEmployee: Employee = {
      id: `EMP-${String(
        Math.max(
          0,
          ...employees.map((employee) =>
            Number(employee.id.replace("EMP-", "")),
          ),
        ) + 1,
      ).padStart(3, "0")}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      designation: designation.trim(),
      role,
      status: "Active",
      joinedDate: joinedDate || new Date().toISOString().slice(0, 10),
      assignedTasks: 0,
    };

    setEmployees((current) => [newEmployee, ...current]);
    setShowForm(false);
    resetForm();
    setMessage(`${newEmployee.name} was added to the directory.`);
  }

  function toggleStatus(employeeId: string) {
    const target = employees.find((employee) => employee.id === employeeId);

    if (!target) return;

    if (
      target.role === "Super Admin" &&
      target.status === "Active" &&
      employees.filter(
        (employee) =>
          employee.role === "Super Admin" && employee.status === "Active",
      ).length <= 1
    ) {
      setMessage("At least one active Super Admin must remain.");
      return;
    }

    setEmployees((current) =>
      current.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              status:
                employee.status === "Active" ? "Inactive" : "Active",
            }
          : employee,
      ),
    );

    setSelectedEmployee(null);
    setMessage(
      `${target.name} marked ${
        target.status === "Active" ? "inactive" : "active"
      }.`,
    );
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">
            People management
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Employees
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manage staff records, roles, and employee status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <span aria-hidden="true">+</span>
          Add employee
        </button>
      </header>

      {message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total employees",
            value: stats.total,
            note: "All staff records",
          },
          {
            label: "Active employees",
            value: stats.active,
            note: "Currently active",
          },
          {
            label: "Inactive employees",
            value: stats.inactive,
            note: "Not currently active",
          },
          {
            label: "Administrators & managers",
            value: stats.managers,
            note: "Elevated role assignments",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
          >
            <p className="text-sm text-[var(--muted-foreground)]">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {stat.note}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
        <div>
          <h2 className="font-semibold">Employee directory</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {filteredEmployees.length} of {employees.length} employees
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label htmlFor="employee-search" className="text-sm font-medium">
              Search
            </label>
            <input
              id="employee-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, ID, designation..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="role-filter" className="text-sm font-medium">
              Role
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Manager">Manager</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-12 text-center">
            <p className="font-medium">No employees found</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                    <th className="px-3 py-3 font-medium">Employee</th>
                    <th className="px-3 py-3 font-medium">Designation</th>
                    <th className="px-3 py-3 font-medium">Role</th>
                    <th className="px-3 py-3 font-medium">Tasks</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="align-middle">
                      <td className="px-3 py-4">
                        <div className="font-medium">{employee.name}</div>
                        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {employee.id} · {employee.email}
                        </div>
                      </td>
                      <td className="px-3 py-4">{employee.designation}</td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleStyles[employee.role]}`}
                        >
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-3 py-4">{employee.assignedTasks}</td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            employee.status === "Active"
                              ? "text-emerald-700"
                              : "text-[var(--muted-foreground)]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              employee.status === "Active"
                                ? "bg-emerald-500"
                                : "bg-gray-400"
                            }`}
                          />
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployee(employee)}
                          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredEmployees.map((employee) => (
                <article
                  key={employee.id}
                  className="rounded-lg border border-[var(--border)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium">{employee.name}</h3>
                      <p className="mt-1 break-all text-xs text-[var(--muted-foreground)]">
                        {employee.email}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {employee.id}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${roleStyles[employee.role]}`}
                    >
                      {employee.role}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p>{employee.designation}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {employee.assignedTasks} assigned tasks
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(employee)}
                      className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium"
                    >
                      View details
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                    Status: {employee.status}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-employee-title"
            className="my-4 w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-employee-title" className="text-lg font-semibold">
                  Add employee
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Create a staff record for your directory.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close form"
                className="rounded-md px-2 py-1 text-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              >
                ×
              </button>
            </div>

            <form onSubmit={addEmployee} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="employee-name" className="text-sm font-medium">
                    Full name *
                  </label>
                  <input
                    id="employee-name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass}
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label htmlFor="employee-email" className="text-sm font-medium">
                    Email address *
                  </label>
                  <input
                    id="employee-email"
                    required
                    type="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="employee-phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <input
                    id="employee-phone"
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={inputClass}
                    placeholder="+971 ..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="employee-designation"
                    className="text-sm font-medium"
                  >
                    Designation *
                  </label>
                  <input
                    id="employee-designation"
                    required
                    maxLength={100}
                    value={designation}
                    onChange={(event) => setDesignation(event.target.value)}
                    className={inputClass}
                    placeholder="e.g. Accountant"
                  />
                </div>

                <div>
                  <label htmlFor="employee-role" className="text-sm font-medium">
                    System role *
                  </label>
                  <select
                    id="employee-role"
                    required
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as EmployeeRole)
                    }
                    className={inputClass}
                  >
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    This is a prototype; real access controls are not active yet.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="employee-joined-date"
                    className="text-sm font-medium"
                  >
                    Joining date
                  </label>
                  <input
                    id="employee-joined-date"
                    type="date"
                    value={joinedDate}
                    onChange={(event) => setJoinedDate(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--muted)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add employee
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-details-title"
            className="my-4 w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {selectedEmployee.id}
                </p>
                <h2
                  id="employee-details-title"
                  className="mt-1 text-xl font-semibold"
                >
                  {selectedEmployee.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {selectedEmployee.designation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Close employee details"
                className="rounded-md px-2 py-1 text-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              >
                ×
              </button>
            </div>

            <dl className="mt-5 divide-y divide-[var(--border)] text-sm">
              {[
                ["Email", selectedEmployee.email],
                ["Phone", selectedEmployee.phone || "Not provided"],
                ["Role", selectedEmployee.role],
                ["Status", selectedEmployee.status],
                ["Joining date", selectedEmployee.joinedDate],
                ["Assigned tasks", String(selectedEmployee.assignedTasks)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <dt className="text-[var(--muted-foreground)]">{label}</dt>
                  <dd className="break-all text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--muted)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(selectedEmployee.id)}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--muted)]"
              >
                Mark {selectedEmployee.status === "Active" ? "inactive" : "active"}
              </button>
            </div>
          </section>
        </div>
      )}

      <p className="text-xs text-[var(--muted-foreground)]">
        Prototype data only. Employee changes are kept in page state and will
        reset on refresh. Authentication, real permissions, and database
        persistence will be implemented in later steps.
      </p>
    </div>
  );
}
