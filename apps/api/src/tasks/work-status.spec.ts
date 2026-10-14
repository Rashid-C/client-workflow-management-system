import {
  deriveTaskStatus,
  formatMinutes,
  nextStatus,
  stagesResetByReopen,
  transitionError,
  type StageState,
  type WorkStatus,
} from './work-status.js';

const stages = (...statuses: WorkStatus[]): StageState[] =>
  statuses.map((status, index) => ({ position: index + 1, status }));

describe('deriveTaskStatus', () => {
  it.each([
    [['Pending', 'Pending'], 'Pending'],
    [['In progress', 'Pending'], 'In progress'],
    [['Completed', 'Pending'], 'In progress'],
    [['Completed', 'Blocked'], 'Blocked'],
    [['Blocked', 'Pending'], 'Blocked'],
    [['Completed', 'Completed'], 'Completed'],
  ] as const)('%j → %s', (statuses, expected) => {
    expect(deriveTaskStatus(stages(...statuses))).toBe(expected);
  });

  it('treats a task without stages as pending', () => {
    expect(deriveTaskStatus([])).toBe('Pending');
  });
});

describe('transitionError', () => {
  describe('start', () => {
    it('starts the first pending stage', () => {
      expect(transitionError('start', stages('Pending', 'Pending'), 1)).toBeNull();
    });
    it('waits for earlier stages', () => {
      expect(transitionError('start', stages('In progress', 'Pending'), 2)?.code).toBe('tasks.earlier_stages_open');
    });
    it('starts once every earlier stage is completed', () => {
      expect(transitionError('start', stages('Completed', 'Completed', 'Pending'), 3)).toBeNull();
    });
    it('refuses a stage that is not pending', () => {
      expect(transitionError('start', stages('In progress'), 1)).toEqual({
        code: 'tasks.start_needs_pending',
        message: 'Only a pending stage can be started (this one is in progress)',
        params: { status: 'In progress' },
      });
    });
  });

  describe('complete', () => {
    it('completes a stage in progress', () => {
      expect(transitionError('complete', stages('In progress'), 1)).toBeNull();
    });
    it.each(['Pending', 'Blocked', 'Completed'] as const)('refuses %s', (status) => {
      expect(transitionError('complete', stages(status), 1)).not.toBeNull();
    });
  });

  describe('block', () => {
    it('blocks a stage in progress', () => {
      expect(transitionError('block', stages('In progress'), 1)).toBeNull();
    });
    it('blocks a pending stage whose turn it is', () => {
      expect(transitionError('block', stages('Completed', 'Pending'), 2)).toBeNull();
    });
    it('does not block a pending stage that is still waiting', () => {
      expect(transitionError('block', stages('Pending', 'Pending'), 2)?.code).toBe('tasks.earlier_stages_open');
    });
    it.each(['Blocked', 'Completed'] as const)('refuses %s', (status) => {
      expect(transitionError('block', stages(status), 1)).not.toBeNull();
    });
  });

  describe('resume', () => {
    it('resumes a blocked stage', () => {
      expect(transitionError('resume', stages('Completed', 'Blocked'), 2)).toBeNull();
    });
    it('refuses a stage that is not blocked', () => {
      expect(transitionError('resume', stages('In progress'), 1)).not.toBeNull();
    });
    it('waits for an earlier stage that was reopened', () => {
      expect(transitionError('resume', stages('In progress', 'Blocked'), 2)?.code).toBe('tasks.earlier_stages_open');
    });
  });

  it('reassigns any stage that is not completed', () => {
    for (const status of ['Pending', 'In progress', 'Blocked'] as const) {
      expect(transitionError('reassign', stages(status), 1)).toBeNull();
    }
    expect(transitionError('reassign', stages('Completed'), 1)?.code).toBe('tasks.reassign_completed');
  });

  it('reopens only completed stages', () => {
    expect(transitionError('reopen', stages('Completed'), 1)).toBeNull();
    expect(transitionError('reopen', stages('In progress'), 1)).not.toBeNull();
  });

  it('reports an unknown position', () => {
    expect(transitionError('start', stages('Pending'), 5)?.code).toBe('tasks.stage_not_found');
  });
});

describe('nextStatus', () => {
  it.each([
    ['start', 'Pending', 'In progress'],
    ['complete', 'In progress', 'Completed'],
    ['block', 'Pending', 'Blocked'],
    ['resume', 'Blocked', 'In progress'],
    ['reopen', 'Completed', 'In progress'],
    ['reassign', 'Blocked', 'Blocked'],
  ] as const)('%s from %s → %s', (action, from, to) => {
    expect(nextStatus(action, from)).toBe(to);
  });
});

describe('stagesResetByReopen', () => {
  it('sends later in-progress and blocked stages back, but keeps completed and pending ones', () => {
    expect(
      stagesResetByReopen(stages('Completed', 'Completed', 'In progress', 'Blocked', 'Pending'), 2),
    ).toEqual([3, 4]);
  });
});

describe('formatMinutes', () => {
  it.each([
    [15, '15m'],
    [60, '1h'],
    [75, '1h 15m'],
    [720, '12h'],
  ])('%i → %s', (minutes, text) => {
    expect(formatMinutes(minutes)).toBe(text);
  });
});
