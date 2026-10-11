
'use client';

import { useMemo, useState } from 'react';

type WorkflowStage = {
  id: number;
  name: string;
  description: string;
};

type Workflow = {
  id: number;
  name: string;
  description: string;
  stages: WorkflowStage[];
  enabled: boolean;
};

const initialWorkflows: Workflow[] = [
  {
    id: 1,
    name: 'Accounting',
    description: 'Routine accounting, bookkeeping and financial records.',
    enabled: true,
    stages: [
      { id: 101, name: 'Documents Received', description: 'Collect and verify client documents.' },
      { id: 102, name: 'Data Entry', description: 'Enter transactions into the accounting system.' },
      { id: 103, name: 'Reconciliation', description: 'Reconcile bank and ledger balances.' },
      { id: 104, name: 'Review', description: 'Review entries and resolve discrepancies.' },
      { id: 105, name: 'Completed', description: 'Complete the assignment and notify the manager.' },
    ],
  },
  {
    id: 2,
    name: 'VAT Return',
    description: 'Prepare, review and finalise VAT return assignments.',
    enabled: true,
    stages: [
      { id: 201, name: 'Documents Received', description: 'Collect sales and purchase records.' },
      { id: 202, name: 'Data Verification', description: 'Validate VAT treatment and supporting records.' },
      { id: 203, name: 'Return Preparation', description: 'Prepare the VAT return.' },
      { id: 204, name: 'Manager Review', description: 'Review figures and supporting evidence.' },
      { id: 205, name: 'Filed', description: 'Record filing confirmation and completion.' },
    ],
  },
  {
    id: 3,
    name: 'Audit',
    description: 'Track audit preparation, fieldwork and final reporting.',
    enabled: true,
    stages: [
      { id: 301, name: 'Planning', description: 'Define scope and request required documents.' },
      { id: 302, name: 'Fieldwork', description: 'Perform audit checks and collect evidence.' },
      { id: 303, name: 'Review', description: 'Review findings and resolve queries.' },
      { id: 304, name: 'Final Report', description: 'Prepare and approve the final report.' },
    ],
  },
  {
    id: 4,
    name: 'Payroll',
    description: 'Process payroll information and review salary calculations.',
    enabled: false,
    stages: [
      { id: 401, name: 'Information Collection', description: 'Collect attendance and payroll inputs.' },
      { id: 402, name: 'Calculation', description: 'Calculate salary and deductions.' },
      { id: 403, name: 'Approval', description: 'Obtain the required approval.' },
      { id: 404, name: 'Completed', description: 'Record payroll completion.' },
    ],
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');

  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedId) ?? null;

  const filteredWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workflows.filter((workflow) => {
      const matchesSearch =
        !query ||
        workflow.name.toLowerCase().includes(query) ||
        workflow.description.toLowerCase().includes(query);

      const matchesFilter =
        filter === 'All' ||
        (filter === 'Enabled' && workflow.enabled) ||
        (filter === 'Disabled' && !workflow.enabled);

      return matchesSearch && matchesFilter;
    });
  }, [workflows, search, filter]);

  function toggleWorkflow(id: number) {
    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === id
          ? { ...workflow, enabled: !workflow.enabled }
          : workflow,
      ),
    );
    setMessage('Workflow status updated in this prototype.');
  }

  function addWorkflow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workflowName.trim()) {
      setMessage('Enter a workflow name.');
      return;
    }

    if (
      workflows.some(
        (workflow) =>
          workflow.name.toLowerCase() === workflowName.trim().toLowerCase(),
      )
    ) {
      setMessage('A workflow with this name already exists.');
      return;
    }

    const newWorkflow: Workflow = {
      id: Date.now(),
      name: workflowName.trim(),
      description: workflowDescription.trim() || 'No description provided.',
      enabled: true,
      stages: [
        {
          id: Date.now() + 1,
          name: 'New Stage',
          description: 'Configure this stage before using the workflow.',
        },
      ],
    };

    setWorkflows((current) => [...current, newWorkflow]);
    setSelectedId(newWorkflow.id);
    setWorkflowName('');
    setWorkflowDescription('');
    setShowForm(false);
    setMessage('Workflow created. You can now edit its stages.');
  }

  function addStage() {
    if (!selectedWorkflow) return;

    const stage: WorkflowStage = {
      id: Date.now(),
      name: `Stage ${selectedWorkflow.stages.length + 1}`,
      description: 'Add a description for this stage.',
    };

    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === selectedWorkflow.id
          ? { ...workflow, stages: [...workflow.stages, stage] }
          : workflow,
      ),
    );
    setMessage('Stage added.');
  }

  function updateStage(
    stageId: number,
    field: 'name' | 'description',
    value: string,
  ) {
    if (!selectedWorkflow) return;

    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === selectedWorkflow.id
          ? {
              ...workflow,
              stages: workflow.stages.map((stage) =>
                stage.id === stageId ? { ...stage, [field]: value } : stage,
              ),
            }
          : workflow,
      ),
    );
  }

  function removeStage(stageId: number) {
    if (!selectedWorkflow) return;

    if (selectedWorkflow.stages.length <= 1) {
      setMessage('A workflow must have at least one stage.');
      return;
    }

    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === selectedWorkflow.id
          ? {
              ...workflow,
              stages: workflow.stages.filter((stage) => stage.id !== stageId),
            }
          : workflow,
      ),
    );
    setMessage('Stage removed.');
  }

  function moveStage(stageId: number, direction: -1 | 1) {
    if (!selectedWorkflow) return;

    setWorkflows((current) =>
      current.map((workflow) => {
        if (workflow.id !== selectedWorkflow.id) return workflow;

        const stages = [...workflow.stages];
        const index = stages.findIndex((stage) => stage.id === stageId);
        const targetIndex = index + direction;

        if (index < 0 || targetIndex < 0 || targetIndex >= stages.length) {
          return workflow;
        }

        [stages[index], stages[targetIndex]] = [
          stages[targetIndex],
          stages[index],
        ];

        return { ...workflow, stages };
      }),
    );
  }

  const enabledCount = workflows.filter((workflow) => workflow.enabled).length;
  const totalStages = workflows.reduce(
    (total, workflow) => total + workflow.stages.length,
    0,
  );

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">
              Process configuration
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Workflows
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure the stages your team follows for accounting, VAT,
              audit and other client assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setMessage('');
            }}
            className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            {showForm ? 'Cancel' : '+ Create workflow'}
          </button>
        </header>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Frontend prototype:</strong> Workflow changes are held in
          browser memory only. They are not saved to PostgreSQL yet.
        </div>

        {message && (
          <div role="status" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        )}

        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Create workflow
            </h2>
            <form onSubmit={addWorkflow} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Workflow name *
                </span>
                <input
                  required
                  value={workflowName}
                  onChange={(event) => setWorkflowName(event.target.value)}
                  placeholder="e.g. Corporate Tax"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </span>
                <input
                  value={workflowDescription}
                  onChange={(event) => setWorkflowDescription(event.target.value)}
                  placeholder="What is this workflow used for?"
                  className={inputClass}
                />
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Create workflow
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Workflow types" value={workflows.length} detail="Configured workflow templates" />
          <SummaryCard label="Enabled workflows" value={enabledCount} detail="Available for assignments" />
          <SummaryCard label="Total stages" value={totalStages} detail="Across all workflow types" />
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.6fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Workflow library</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a workflow to configure its stages.
              </p>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workflows..."
                className={`${inputClass} mt-4`}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {['All', 'Enabled', 'Disabled'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      filter === option
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredWorkflows.map((workflow) => {
                const selected = workflow.id === selectedId;

                return (
                  <div
                    key={workflow.id}
                    className={`p-4 transition ${
                      selected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(workflow.id)}
                      className="block w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {workflow.name}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-slate-500">
                            {workflow.description}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                            workflow.enabled
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {workflow.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="mt-3 text-xs font-medium text-slate-500">
                        {workflow.stages.length} stages
                      </p>
                    </button>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleWorkflow(workflow.id)}
                        className="text-xs font-semibold text-slate-600 hover:text-teal-700"
                      >
                        {workflow.enabled ? 'Disable workflow' : 'Enable workflow'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredWorkflows.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  No workflows match your search.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {selectedWorkflow ? (
              <>
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                        Workflow editor
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">
                        {selectedWorkflow.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Edit stage names, descriptions and sequence.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addStage}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      + Add stage
                    </button>
                  </div>
                  {!selectedWorkflow.enabled && (
                    <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                      This workflow is disabled. It is not intended for new assignments.
                    </p>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    Stages are processed in the displayed order.
                  </div>

                  <div className="space-y-0">
                    {selectedWorkflow.stages.map((stage, index) => (
                      <div key={stage.id} className="relative pb-5 last:pb-0">
                        {index < selectedWorkflow.stages.length - 1 && (
                          <div className="absolute bottom-0 left-[17px] top-9 w-px bg-slate-200" />
                        )}
                        <div className="relative flex gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-sm font-semibold text-teal-800">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 rounded-lg border border-slate-200 p-3">
                            <div className="flex flex-col gap-3">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">
                                  Stage name
                                </span>
                                <input
                                  value={stage.name}
                                  onChange={(event) =>
                                    updateStage(stage.id, 'name', event.target.value)
                                  }
                                  className={inputClass}
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">
                                  Description
                                </span>
                                <textarea
                                  rows={2}
                                  value={stage.description}
                                  onChange={(event) =>
                                    updateStage(stage.id, 'description', event.target.value)
                                  }
                                  className={inputClass}
                                />
                              </label>
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => moveStage(stage.id, -1)}
                                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Move up
                                </button>
                                <button
                                  type="button"
                                  disabled={index === selectedWorkflow.stages.length - 1}
                                  onClick={() => moveStage(stage.id, 1)}
                                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Move down
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeStage(stage.id)}
                                  className="rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Processing sequence
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {selectedWorkflow.stages.map((stage, index) => (
                        <span key={stage.id} className="inline-flex items-center gap-2">
                          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">
                            {stage.name || `Stage ${index + 1}`}
                          </span>
                          {index < selectedWorkflow.stages.length - 1 && (
                            <span className="text-slate-400">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <h2 className="font-semibold text-slate-900">
                  Select a workflow
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a workflow from the library to edit its stages.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
