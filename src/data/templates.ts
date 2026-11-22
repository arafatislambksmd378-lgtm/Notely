import type { DocumentTemplate, StructuredContent } from '../types/notely';

function makeDoc(nodes: StructuredContent['content']): StructuredContent {
  return { type: 'doc', content: nodes };
}

export const BUILT_IN_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-blank',
    name: 'Blank Document',
    category: 'General',
    description: 'Clean slate for long-form writing or quick notes',
    icon: 'file',
    color: 'purple',
    isCustom: false,
    content: makeDoc([{ type: 'paragraph', content: [] }]),
    htmlContent: '<p></p>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-meeting',
    name: 'Meeting Notes',
    category: 'Work',
    description: 'Agenda, attendees, key decisions & action items',
    icon: 'users',
    color: 'blue',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Meeting Details' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Date:  |  Facilitator:  |  Attendees:' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Topic 1: Status updates' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Topic 2: Blockers & decisions' }] }] },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items' }] },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Follow up on next milestones' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Share summary with stakeholders' }] }] },
        ],
      },
    ]),
    htmlContent:
      '<h2>Meeting Details</h2><p>Date: | Facilitator: | Attendees:</p><h2>Agenda</h2><ul><li><p>Topic 1: Status updates</p></li><li><p>Topic 2: Blockers &amp; decisions</p></li></ul><h2>Action Items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Follow up on next milestones</p></li><li data-type="taskItem" data-checked="false"><p>Share summary with stakeholders</p></li></ul>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-journal',
    name: 'Daily Journal',
    category: 'Personal',
    description: 'Gratitude, daily highlights, and evening reflection',
    icon: 'sun',
    color: 'yellow',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Morning Intentions' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Three things I am grateful for today...' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Today’s Priorities' }] },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Primary focus task' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mindful break / walk' }] }] },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Evening Reflection' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'What went well today and what I learned:' }] },
    ]),
    htmlContent:
      '<h2>Morning Intentions</h2><p>Three things I am grateful for today...</p><h2>Today’s Priorities</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Primary focus task</p></li><li data-type="taskItem" data-checked="false"><p>Mindful break / walk</p></li></ul><h2>Evening Reflection</h2><p>What went well today and what I learned:</p>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-project',
    name: 'Project Plan',
    category: 'Work',
    description: 'Objectives, timeline milestones, deliverables & risks',
    icon: 'kanban',
    color: 'purple',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Project Overview' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Define the core problem, target outcome, and key stakeholders.' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Milestones' }] },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Phase' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Owner' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Target Date' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Discovery & Spec' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Product' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Week 1' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Implementation' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Engineering' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Week 3' }] }] },
            ],
          },
        ],
      },
    ]),
    htmlContent:
      '<h1>Project Overview</h1><p>Define the core problem, target outcome, and key stakeholders.</p><h2>Milestones</h2><table><tr><th>Phase</th><th>Owner</th><th>Target Date</th></tr><tr><td>Discovery &amp; Spec</td><td>Product</td><td>Week 1</td></tr><tr><td>Implementation</td><td>Engineering</td><td>Week 3</td></tr></table>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-study',
    name: 'Study Notes',
    category: 'Study',
    description: 'Cornell-inspired key concepts, definitions & summary',
    icon: 'book',
    color: 'green',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Key Concepts' }] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Core theorem or principle' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Supporting examples and formulas' }] }] },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Review Questions' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '1. How does this connect to previous chapters?' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Summary' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Synthesize the main takeaway in 2–3 sentences.' }] },
    ]),
    htmlContent:
      '<h2>Key Concepts</h2><ul><li><p>Core theorem or principle</p></li><li><p>Supporting examples and formulas</p></li></ul><h2>Review Questions</h2><p>1. How does this connect to previous chapters?</p><h2>Summary</h2><p>Synthesize the main takeaway in 2–3 sentences.</p>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-class',
    name: 'Class Notes',
    category: 'Study',
    description: 'Course topic, lecture outline & homework tracker',
    icon: 'graduation',
    color: 'teal',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Lecture Outline' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Course:  |  Instructor:  |  Lecture #:' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Main Points' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Record definitions, derivations, and diagrams.' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Assignments' }] },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Complete assigned reading' }] }] },
        ],
      },
    ]),
    htmlContent:
      '<h2>Lecture Outline</h2><p>Course: | Instructor: | Lecture #:</p><h3>Main Points</h3><p>Record definitions, derivations, and diagrams.</p><h3>Assignments</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Complete assigned reading</p></li></ul>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-report',
    name: 'Business Report',
    category: 'Work',
    description: 'Executive summary, KPIs, analysis & recommendations',
    icon: 'chart',
    color: 'blue',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Executive Summary' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'High-level overview of performance, trends, and strategic impact.' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Key Findings' }] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Revenue growth and retention metrics' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Operational efficiency improvements' }] }] },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Recommendations' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Recommended next quarter investments and priorities.' }] },
    ]),
    htmlContent:
      '<h1>Executive Summary</h1><p>High-level overview of performance, trends, and strategic impact.</p><h2>Key Findings</h2><ul><li><p>Revenue growth and retention metrics</p></li><li><p>Operational efficiency improvements</p></li></ul><h2>Recommendations</h2><p>Recommended next quarter investments and priorities.</p>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-resume',
    name: 'Resume',
    category: 'Career',
    description: 'Clean professional CV with experience, skills & education',
    icon: 'briefcase',
    color: 'purple',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Full Name' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'email@example.com · City, Country · portfolio.example.com' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Experience' }] },
      { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Senior Product Engineer — Company' }, { type: 'text', text: ' (2023 – Present)' }] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Led architecture and delivery of core mobile document workflows.' }] }] },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Education & Skills' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'B.S. in Computer Science · TypeScript, React, SQLite, UI Architecture' }] },
    ]),
    htmlContent:
      '<h1>Full Name</h1><p>email@example.com · City, Country · portfolio.example.com</p><h2>Experience</h2><p><strong>Senior Product Engineer — Company</strong> (2023 – Present)</p><ul><li><p>Led architecture and delivery of core mobile document workflows.</p></li></ul><h2>Education &amp; Skills</h2><p>B.S. in Computer Science · TypeScript, React, SQLite, UI Architecture</p>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-invoice',
    name: 'Invoice',
    category: 'Finance',
    description: 'Billable line items table, totals & payment terms',
    icon: 'receipt',
    color: 'green',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'INVOICE #1042' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Issued: Nov 20, 2026  |  Due: Dec 4, 2026  |  Bill To: Client Name' }] },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Description' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hours / Qty' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Amount' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Product Design & Architecture' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '20 hrs' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '$2,400.00' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Total Due' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '$2,400.00' }] }] },
            ],
          },
        ],
      },
    ]),
    htmlContent:
      '<h1>INVOICE #1042</h1><p>Issued: Nov 20, 2026 | Due: Dec 4, 2026 | Bill To: Client Name</p><table><tr><th>Description</th><th>Hours / Qty</th><th>Amount</th></tr><tr><td>Product Design &amp; Architecture</td><td>20 hrs</td><td>$2,400.00</td></tr><tr><td><strong>Total Due</strong></td><td></td><td><strong>$2,400.00</strong></td></tr></table>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-todo',
    name: 'To-Do List',
    category: 'Productivity',
    description: 'Interactive checklist organized by priority',
    icon: 'check',
    color: 'pink',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Must Do Today' }] },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Review project milestones' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Send weekly status update' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Prepare presentation deck' }] }] },
        ],
      },
    ]),
    htmlContent:
      '<h2>Must Do Today</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Review project milestones</p></li><li data-type="taskItem" data-checked="false"><p>Send weekly status update</p></li><li data-type="taskItem" data-checked="false"><p>Prepare presentation deck</p></li></ul>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-research',
    name: 'Research Notes',
    category: 'Study',
    description: 'Hypothesis, literature sources, methodology & findings',
    icon: 'microscope',
    color: 'orange',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Research Question' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'State the hypothesis and scope of inquiry.' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Sources & Citations' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '• Author (Year) — Title and key finding.' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Observations' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Document quantitative and qualitative data here.' }] },
    ]),
    htmlContent:
      '<h2>Research Question</h2><p>State the hypothesis and scope of inquiry.</p><h2>Sources &amp; Citations</h2><p>• Author (Year) — Title and key finding.</p><h2>Observations</h2><p>Document quantitative and qualitative data here.</p>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-weekly',
    name: 'Weekly Planner',
    category: 'Productivity',
    description: 'Monday to Sunday schedule and weekly goals',
    icon: 'calendar',
    color: 'blue',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Weekly Goals' }] },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 1: Deep focus sprint' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 2: Exercise 3x this week' }] }] },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Daily Schedule' }] },
      { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Monday: ' }, { type: 'text', text: 'Kickoff & planning' }] },
      { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Wednesday: ' }, { type: 'text', text: 'Mid-week review' }] },
      { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Friday: ' }, { type: 'text', text: 'Wrap up & retrospective' }] },
    ]),
    htmlContent:
      '<h2>Weekly Goals</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Goal 1: Deep focus sprint</p></li><li data-type="taskItem" data-checked="false"><p>Goal 2: Exercise 3x this week</p></li></ul><h2>Daily Schedule</h2><p><strong>Monday: </strong>Kickoff &amp; planning</p><p><strong>Wednesday: </strong>Mid-week review</p><p><strong>Friday: </strong>Wrap up &amp; retrospective</p>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-diary',
    name: 'Personal Diary',
    category: 'Personal',
    description: 'Private thoughts, memories, and mood check-in',
    icon: 'heart',
    color: 'pink',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Today’s Story' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Mood: Calm & focused' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Write freely about what happened today...' }] },
    ]),
    htmlContent:
      '<h2>Today’s Story</h2><p>Mood: Calm &amp; focused</p><p>Write freely about what happened today...</p>',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'tpl-expense',
    name: 'Expense Tracker',
    category: 'Finance',
    description: 'Categorized spending log with amount and notes',
    icon: 'wallet',
    color: 'yellow',
    isCustom: false,
    content: makeDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Monthly Expense Log' }] },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Date' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Category' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Amount' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nov 20' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Groceries' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '$48.50' }] }] },
            ],
          },
        ],
      },
    ]),
    htmlContent:
      '<h2>Monthly Expense Log</h2><table><tr><th>Date</th><th>Category</th><th>Amount</th></tr><tr><td>Nov 20</td><td>Groceries</td><td>$48.50</td></tr></table>',
    createdAt: '2026-11-01T00:00:00Z',
  },
];
