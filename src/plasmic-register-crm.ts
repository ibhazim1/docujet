/**
 * The lead tracker, as Plasmic sees it.
 *
 * Every visible part of the CRM page is registered on its own, so a designer
 * can select it in the tree, restyle it, move it, duplicate it or delete it —
 * no code required. Nothing here needs a particular parent: each piece reads
 * the tracker's shared state directly (`TrackerContext`), and a piece dropped
 * on a blank artboard falls back to the seed leads so it still renders and
 * still responds.
 *
 * `LeadTracker` owns the state and hands its whole contents to a slot, filled
 * on insert with the dashboard as shipped. Rearranging the page therefore
 * means moving real elements around, not flipping props.
 */

import { PLASMIC } from "./plasmic-init";

import LeadTracker from "./components/crm/LeadTracker";
import KpiRow from "./components/crm/KpiRow";
import KpiCard from "./components/crm/KpiCard";
import PipelineBar from "./components/crm/PipelineBar";
import StageTile from "./components/crm/StageTile";
import FilterBar from "./components/crm/FilterBar";
import SearchInput from "./components/crm/filters/SearchInput";
import FilterSelect from "./components/crm/filters/FilterSelect";
import ApplyButton from "./components/crm/filters/ApplyButton";
import ClearFilters from "./components/crm/filters/ClearFilters";
import ViewToggle from "./components/crm/ViewToggle";
import ViewSwitch from "./components/crm/ViewSwitch";
import LeadCountLabel from "./components/crm/LeadCountLabel";
import FlashMessage from "./components/crm/FlashMessage";
import LeadEmptyState from "./components/crm/LeadEmptyState";
import LeadTable from "./components/crm/LeadTable";
import LeadBoard from "./components/crm/LeadBoard";
import LeadCharts from "./components/crm/LeadCharts";
import LeadDetail from "./components/crm/LeadDetail";
import SourceVolumeChart from "./components/crm/charts/SourceVolumeChart";
import SourceQualityChart from "./components/crm/charts/SourceQualityChart";
import FunnelChart from "./components/crm/charts/FunnelChart";
import MonthlyChart from "./components/crm/charts/MonthlyChart";
import SourceStageMatrix from "./components/crm/charts/SourceStageMatrix";
import SocialSplitMeter from "./components/crm/charts/SocialSplitMeter";
import SourceShareDonut from "./components/crm/charts/SourceShareDonut";
import ActiveLostDonut from "./components/crm/charts/ActiveLostDonut";
import StageShareDonut from "./components/crm/charts/StageShareDonut";
import LossReasonChart from "./components/crm/charts/LossReasonChart";
import StageVelocityChart from "./components/crm/charts/StageVelocityChart";
import ActionBoard from "./components/crm/ActionBoard";
import InsightPanel from "./components/crm/InsightPanel";
import ScoreChip from "./components/crm/ScoreChip";
import ScoreBreakdown from "./components/crm/ScoreBreakdown";
import LeadTimeline from "./components/crm/LeadTimeline";
import AdminOverview from "./components/crm/AdminOverview";
import ContactLog from "./components/crm/ContactLog";
import TablePagination from "./components/crm/TablePagination";

/** Everything in this file sits under the tracker in the insert menu. */
const GROUP = "LeadTracker";

const STAGE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "mql", label: "MQL" },
  { value: "sql", label: "SQL" },
  { value: "opportunity", label: "Opportunity" },
  { value: "customer", label: "Customer" },
  { value: "lost", label: "Lost" },
];

const COLUMN_OPTIONS = [
  { value: "name", label: "Lead name" },
  { value: "company", label: "Company" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "source", label: "Source" },
  { value: "created_at", label: "Captured date" },
  { value: "stage", label: "Stage" },
  { value: "title", label: "Job title" },
  { value: "interest", label: "Interest" },
  { value: "notes", label: "Notes" },
];

// ---------------------------------------------------------------------------
// The container
// ---------------------------------------------------------------------------

PLASMIC.registerComponent(LeadTracker, {
  name: "LeadTracker",
  displayName: "CRM Lead Tracker",
  description:
    "The lead dashboard. Holds the leads, the filters and the active view, and hands its contents to the slot below — every part inside can be moved, restyled or deleted.",
  importPath: "@/components/crm/LeadTracker",
  isDefaultExport: true,
  providesData: true,
  props: {
    className: { type: "class" },
    defaultView: {
      type: "choice",
      displayName: "Opening view",
      description:
        "Which view is shown before anyone touches the Action / Table / Board / Charts control.",
      options: [
        { value: "action", label: "Action (work board)" },
        { value: "table", label: "Table" },
        { value: "board", label: "Board" },
        { value: "charts", label: "Charts" },
      ],
      defaultValue: "action",
    },
    readOnly: {
      type: "boolean",
      displayName: "Read-only",
      description:
        "Show each lead's stage and source as a coloured badge instead of an editable control.",
      defaultValue: false,
    },
    today: {
      type: "string",
      displayName: "Today (Y-m-d)",
      description:
        "Pins the date 'added this week' counts back from — for previewing only. Leave empty on a live page.",
      defaultValue: "",
    },
    autoLoad: {
      type: "boolean",
      displayName: "Load real leads",
      description:
        "On the published page, read the live lead book instead of the seed rows. The canvas always shows the seed rows.",
      defaultValue: true,
    },
    children: {
      type: "slot",
      displayName: "Contents",
      unstable__isMainContentSlot: true,
      defaultValue: [
        {
          type: "hbox",
          styles: {
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            padding: "0px",
          },
          children: [
            { type: "component", name: "LeadViewToggle" },
            { type: "component", name: "LeadCountLabel" },
          ],
        },
        { type: "component", name: "LeadFlashMessage" },
        {
          type: "component",
          name: "LeadKpiRow",
          props: {
            children: [
              { type: "component", name: "LeadKpiCard", props: { metric: "total" } },
              { type: "component", name: "LeadKpiCard", props: { metric: "topSource" } },
              { type: "component", name: "LeadKpiCard", props: { metric: "social" } },
              { type: "component", name: "LeadKpiCard", props: { metric: "qualified" } },
              { type: "component", name: "LeadKpiCard", props: { metric: "customers" } },
              { type: "component", name: "LeadKpiCard", props: { metric: "lost" } },
            ],
          },
        },
        {
          type: "component",
          name: "LeadPipelineBar",
          props: {
            children: [
              { type: "component", name: "LeadStageTile", props: { stage: "lead" } },
              { type: "component", name: "LeadStageTile", props: { stage: "mql" } },
              { type: "component", name: "LeadStageTile", props: { stage: "sql" } },
              { type: "component", name: "LeadStageTile", props: { stage: "opportunity" } },
              { type: "component", name: "LeadStageTile", props: { stage: "customer" } },
              { type: "component", name: "LeadStageTile", props: { stage: "lost" } },
            ],
          },
        },
        {
          type: "component",
          name: "LeadFilterBar",
          props: {
            children: [
              { type: "component", name: "LeadSearchInput" },
              { type: "component", name: "LeadFilterSelect", props: { filter: "source" } },
              { type: "component", name: "LeadFilterSelect", props: { filter: "stage" } },
              { type: "component", name: "LeadFilterSelect", props: { filter: "group" } },
              { type: "component", name: "LeadApplyButton" },
              { type: "component", name: "LeadClearFilters" },
            ],
          },
        },
        { type: "component", name: "LeadViewSwitch" },
        { type: "component", name: "LeadDetail" },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// Header strip
// ---------------------------------------------------------------------------

PLASMIC.registerComponent(ViewToggle, {
  name: "LeadViewToggle",
  displayName: "Lead View Toggle",
  description: "The Table / Board / Charts control.",
  importPath: "@/components/crm/ViewToggle",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    actionLabel: { type: "string", defaultValue: "Action" },
    tableLabel: { type: "string", defaultValue: "Table" },
    boardLabel: { type: "string", defaultValue: "Board" },
    chartsLabel: { type: "string", defaultValue: "Charts" },
    views: {
      type: "choice",
      displayName: "Views offered",
      multiSelect: true,
      options: [
        { value: "action", label: "Action (work board)" },
        { value: "table", label: "Table" },
        { value: "board", label: "Board" },
        { value: "charts", label: "Charts" },
      ],
      defaultValue: ["action", "table", "board", "charts"],
    },
  },
});

PLASMIC.registerComponent(LeadCountLabel, {
  name: "LeadCountLabel",
  displayName: "Lead Count Label",
  description: "How many leads the filters are letting through.",
  importPath: "@/components/crm/LeadCountLabel",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    template: {
      type: "string",
      displayName: "Text",
      description: "{visible} and {total} are replaced with the live counts.",
      defaultValue: "Showing {visible} of {total} leads",
    },
  },
});

PLASMIC.registerComponent(FlashMessage, {
  name: "LeadFlashMessage",
  displayName: "Lead Save Message",
  description: "Confirms or rejects the last inline edit. Invisible until something happens.",
  importPath: "@/components/crm/FlashMessage",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    previewText: {
      type: "string",
      displayName: "Preview text",
      description: "Shown while designing so the banner can be styled. Leave empty when done.",
      defaultValue: "",
    },
  },
});

// ---------------------------------------------------------------------------
// KPI tiles
// ---------------------------------------------------------------------------

PLASMIC.registerComponent(KpiRow, {
  name: "LeadKpiRow",
  displayName: "Lead KPI Row",
  description: "A responsive grid for KPI tiles. Add, reorder or remove the tiles inside.",
  importPath: "@/components/crm/KpiRow",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    children: {
      type: "slot",
      displayName: "Tiles",
      allowedComponents: ["LeadKpiCard"],
      defaultValue: [
        { type: "component", name: "LeadKpiCard", props: { metric: "total" } },
        { type: "component", name: "LeadKpiCard", props: { metric: "topSource" } },
        { type: "component", name: "LeadKpiCard", props: { metric: "social" } },
        { type: "component", name: "LeadKpiCard", props: { metric: "qualified" } },
        { type: "component", name: "LeadKpiCard", props: { metric: "customers" } },
        { type: "component", name: "LeadKpiCard", props: { metric: "lost" } },
      ],
    },
  },
});

PLASMIC.registerComponent(KpiCard, {
  name: "LeadKpiCard",
  displayName: "Lead KPI Tile",
  description: "One headline number. Pick which reading it shows.",
  importPath: "@/components/crm/KpiCard",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    metric: {
      type: "choice",
      displayName: "Reading",
      options: [
        { value: "needsAction", label: "Work · Needs action" },
        { value: "hot", label: "Work · Hot leads" },
        { value: "overdue", label: "Work · Overdue" },
        { value: "stalled", label: "Work · Going cold" },
        { value: "untouched", label: "Work · Never contacted" },
        { value: "unowned", label: "Work · Unowned" },
        { value: "total", label: "Count · Total leads" },
        { value: "topSource", label: "Count · Top source" },
        { value: "social", label: "Count · From social" },
        { value: "qualified", label: "Count · Reached SQL+" },
        { value: "customers", label: "Count · Customers" },
        { value: "lost", label: "Count · Lost" },
        { value: "open", label: "Count · Still open" },
        { value: "newThisWeek", label: "Count · New this week" },
      ],
      defaultValue: "total",
    },
    label: {
      type: "string",
      displayName: "Caption",
      description: "Leave empty to use the reading's own name.",
    },
    helper: {
      type: "string",
      displayName: "Sub-line",
      description: "Leave empty to use the reading's own sub-line.",
    },
    valueSize: {
      type: "choice",
      displayName: "Value size",
      options: [
        { value: "md", label: "Large (numbers)" },
        { value: "sm", label: "Small (words)" },
      ],
    },
    clickToFilter: {
      type: "boolean",
      displayName: "Click to filter",
      description:
        "Only 'From social' and 'Lost' can filter — they are the readings that map onto one filter value.",
      defaultValue: true,
    },
  },
});

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

PLASMIC.registerComponent(PipelineBar, {
  name: "LeadPipelineBar",
  displayName: "Lead Pipeline Bar",
  description: "A grid for stage tiles.",
  importPath: "@/components/crm/PipelineBar",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    children: {
      type: "slot",
      displayName: "Tiles",
      allowedComponents: ["LeadStageTile"],
      defaultValue: [
        { type: "component", name: "LeadStageTile", props: { stage: "lead" } },
        { type: "component", name: "LeadStageTile", props: { stage: "mql" } },
        { type: "component", name: "LeadStageTile", props: { stage: "sql" } },
        { type: "component", name: "LeadStageTile", props: { stage: "opportunity" } },
        { type: "component", name: "LeadStageTile", props: { stage: "customer" } },
        { type: "component", name: "LeadStageTile", props: { stage: "lost" } },
      ],
    },
  },
});

PLASMIC.registerComponent(StageTile, {
  name: "LeadStageTile",
  displayName: "Lead Stage Tile",
  description: "How many leads sit at one lifecycle stage. Clicking filters to it.",
  importPath: "@/components/crm/StageTile",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    stage: {
      type: "choice",
      displayName: "Stage",
      options: STAGE_OPTIONS,
      defaultValue: "lead",
    },
    label: { type: "string", displayName: "Caption", description: "Leave empty to use the stage's name." },
    showBar: { type: "boolean", displayName: "Share bar", defaultValue: true },
    clickToFilter: { type: "boolean", displayName: "Click to filter", defaultValue: true },
  },
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

PLASMIC.registerComponent(FilterBar, {
  name: "LeadFilterBar",
  displayName: "Lead Filter Bar",
  description: "The card the filter controls sit in. The controls work anywhere on the page.",
  importPath: "@/components/crm/FilterBar",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    children: {
      type: "slot",
      displayName: "Controls",
      defaultValue: [
        { type: "component", name: "LeadSearchInput" },
        { type: "component", name: "LeadFilterSelect", props: { filter: "source" } },
        { type: "component", name: "LeadFilterSelect", props: { filter: "stage" } },
        { type: "component", name: "LeadFilterSelect", props: { filter: "group" } },
        { type: "component", name: "LeadApplyButton" },
        { type: "component", name: "LeadClearFilters" },
      ],
    },
  },
});

PLASMIC.registerComponent(SearchInput, {
  name: "LeadSearchInput",
  displayName: "Lead Search Box",
  description: "Free-text filter over name, email, phone and interest.",
  importPath: "@/components/crm/filters/SearchInput",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    placeholder: {
      type: "string",
      defaultValue: "Search name, email, phone or interest…",
    },
    instant: {
      type: "boolean",
      displayName: "Filter as you type",
      description: "Off means the filter waits for Enter or the Apply button.",
      defaultValue: false,
    },
  },
});

PLASMIC.registerComponent(FilterSelect, {
  name: "LeadFilterSelect",
  displayName: "Lead Filter Dropdown",
  description: "One dropdown filter — source, stage or channel group.",
  importPath: "@/components/crm/filters/FilterSelect",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    filter: {
      type: "choice",
      displayName: "Filters by",
      options: [
        { value: "source", label: "Source" },
        { value: "stage", label: "Stage" },
        { value: "group", label: "Channel group" },
      ],
      defaultValue: "source",
    },
    allLabel: {
      type: "string",
      displayName: "'No filter' option",
      description: "What the dropdown reads when nothing is narrowed.",
    },
    openOnlyLabel: {
      type: "string",
      displayName: "'Open only' option",
      description: "Stage filter only — everything still in play, whatever stage it sits at.",
      defaultValue: "Open only",
      hidden: (props: { filter?: string }) => props.filter !== "stage",
    },
  },
});

PLASMIC.registerComponent(ApplyButton, {
  name: "LeadApplyButton",
  displayName: "Lead Apply Button",
  description: "Commits whatever is typed in the search box. The dropdowns apply themselves.",
  importPath: "@/components/crm/filters/ApplyButton",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    label: { type: "string", defaultValue: "Apply" },
  },
});

PLASMIC.registerComponent(ClearFilters, {
  name: "LeadClearFilters",
  displayName: "Lead Clear Filters",
  description: "Drops every filter at once. Hides itself while nothing is filtered.",
  importPath: "@/components/crm/filters/ClearFilters",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    label: { type: "string", defaultValue: "Clear" },
    alwaysShow: {
      type: "boolean",
      displayName: "Always visible",
      description: "Keeps it on screen while designing, even with nothing filtered.",
      defaultValue: false,
    },
  },
});

// ---------------------------------------------------------------------------
// The three views
// ---------------------------------------------------------------------------

PLASMIC.registerComponent(ViewSwitch, {
  name: "LeadViewSwitch",
  displayName: "Lead View Switch",
  description:
    "Shows one of the three views, following the Table / Board / Charts control. Each branch is a slot you can fill with anything.",
  importPath: "@/components/crm/ViewSwitch",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    forceView: {
      type: "choice",
      displayName: "Design as",
      description:
        "Pins the switch to one branch so you can work on it without changing the view first. Leave on Follow the toggle when done.",
      options: [
        { value: "", label: "Follow the toggle" },
        { value: "action", label: "Action (work board)" },
        { value: "table", label: "Table" },
        { value: "board", label: "Board" },
        { value: "charts", label: "Charts" },
      ],
      defaultValue: "",
    },
    actionView: {
      type: "slot",
      displayName: "Action view",
      defaultValue: [{ type: "component", name: "LeadActionBoard" }],
    },
    tableView: {
      type: "slot",
      displayName: "Table view",
      defaultValue: [{ type: "component", name: "LeadTable" }],
    },
    boardView: {
      type: "slot",
      displayName: "Board view",
      defaultValue: [{ type: "component", name: "LeadBoard" }],
    },
    chartsView: {
      type: "slot",
      displayName: "Charts view",
      defaultValue: [
        {
          type: "component",
          name: "LeadCharts",
          props: {
            children: [
              { type: "component", name: "LeadLossReasonChart" },
              { type: "component", name: "LeadStageVelocityChart" },
              { type: "component", name: "LeadSourceVolumeChart" },
              { type: "component", name: "LeadSourceQualityChart" },
              { type: "component", name: "LeadFunnelChart" },
              { type: "component", name: "LeadMonthlyChart" },
              { type: "component", name: "LeadSourceStageMatrix" },
              { type: "component", name: "LeadSocialSplitMeter" },
              { type: "component", name: "LeadSourceShareDonut" },
              { type: "component", name: "LeadActiveLostDonut" },
              { type: "component", name: "LeadStageShareDonut" },
            ],
          },
        },
      ],
    },
    emptyView: {
      type: "slot",
      displayName: "When nothing matches",
      defaultValue: [{ type: "component", name: "LeadEmptyState" }],
    },
  },
});

PLASMIC.registerComponent(LeadEmptyState, {
  name: "LeadEmptyState",
  displayName: "Lead Empty State",
  description: "What the list says when the filters let nothing through.",
  importPath: "@/components/crm/LeadEmptyState",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    title: { type: "string", defaultValue: "No leads match these filters" },
    description: {
      type: "string",
      defaultValue: "Clear a filter or widen the search to bring rows back.",
    },
    alwaysShow: {
      type: "boolean",
      displayName: "Always visible",
      description: "Keeps it on screen while designing, even when rows are showing.",
      defaultValue: false,
    },
  },
});

PLASMIC.registerComponent(LeadTable, {
  name: "LeadTable",
  displayName: "Lead Table",
  description:
    "The working list, ten rows at a time. Every cell is edited in place. Choose the columns, their order and their headings below.",
  importPath: "@/components/crm/LeadTable",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    showPagination: {
      type: "boolean",
      displayName: "Rows picker & pager",
      description:
        "The footer that chooses how many rows to show and moves between pages. Turning it off caps the table at the current size with no way past it.",
      defaultValue: true,
    },
    columns: {
      type: "array",
      displayName: "Columns",
      itemType: {
        type: "object",
        nameFunc: (item: { field?: string; header?: string }) => item?.header || item?.field,
        fields: {
          field: {
            type: "choice",
            displayName: "Field",
            options: COLUMN_OPTIONS,
            defaultValue: "name",
          },
          header: {
            type: "string",
            displayName: "Heading",
            description: "Leave empty to use the field's own name.",
          },
          width: {
            type: "string",
            displayName: "Width",
            description: "A CSS width such as 17% or 180px. Leave empty for the built-in share.",
          },
        },
      },
      defaultValue: [
        { field: "name" },
        { field: "email" },
        { field: "phone" },
        { field: "source" },
        { field: "created_at" },
        { field: "stage" },
        { field: "notes" },
      ],
    },
    showOpenLink: {
      type: "boolean",
      displayName: "Row link",
      description: "The 'L-1088 · open' link under each name, which opens the detail panel.",
      defaultValue: true,
    },
    rowClickOpens: {
      type: "boolean",
      displayName: "Click a row to open",
      description:
        "Clicking anywhere on a row that is not a control opens that lead's card. The row link stays the keyboard route either way.",
      defaultValue: true,
    },
    readOnly: {
      type: "boolean",
      displayName: "Read-only",
      description: "Overrides the tracker's setting for this table only.",
    },
  },
});

PLASMIC.registerComponent(LeadBoard, {
  name: "LeadBoard",
  displayName: "Lead Board",
  description: "Kanban by lifecycle stage. Cards advance a stage or close from here.",
  importPath: "@/components/crm/LeadBoard",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    stages: {
      type: "choice",
      displayName: "Columns",
      multiSelect: true,
      options: STAGE_OPTIONS,
      defaultValue: ["lead", "mql", "sql", "opportunity", "customer", "lost"],
    },
    showActions: {
      type: "boolean",
      displayName: "Card buttons",
      description: "The Move / Lost / Reopen buttons on each card.",
      defaultValue: true,
    },
    showSourcePill: { type: "boolean", displayName: "Source pill", defaultValue: true },
    emptyLabel: { type: "string", displayName: "Empty column text", defaultValue: "Empty" },
    readOnly: {
      type: "boolean",
      displayName: "Read-only",
      description: "Overrides the tracker's setting for this board only.",
    },
  },
});

PLASMIC.registerComponent(LeadCharts, {
  name: "LeadCharts",
  displayName: "Lead Charts Grid",
  description: "A two-column grid for charts. Add, reorder or remove the charts inside.",
  importPath: "@/components/crm/LeadCharts",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    children: {
      type: "slot",
      displayName: "Charts",
      defaultValue: [
        { type: "component", name: "LeadSourceVolumeChart" },
        { type: "component", name: "LeadSourceQualityChart" },
        { type: "component", name: "LeadFunnelChart" },
        { type: "component", name: "LeadMonthlyChart" },
        { type: "component", name: "LeadSourceStageMatrix" },
        { type: "component", name: "LeadSocialSplitMeter" },
        { type: "component", name: "LeadSourceShareDonut" },
        { type: "component", name: "LeadActiveLostDonut" },
        { type: "component", name: "LeadStageShareDonut" },
      ],
    },
  },
});

PLASMIC.registerComponent(LeadDetail, {
  name: "LeadDetail",
  displayName: "Lead Detail Panel",
  description:
    "Everything the book holds about one lead, including the appointments they have booked. Appears when a lead is opened from the table or the board.",
  importPath: "@/components/crm/LeadDetail",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    presentation: {
      type: "choice",
      displayName: "Appears as",
      description:
        "A pop-up floats over a dimmed page and closes on Escape or a backdrop click. In place renders it wherever this element sits.",
      options: [
        { value: "modal", label: "Pop-up over the page" },
        { value: "panel", label: "In place" },
      ],
      defaultValue: "modal",
    },
    alwaysShow: {
      type: "boolean",
      displayName: "Always visible",
      description:
        "Falls back to the first lead in the list so the panel can be styled without opening a row first.",
      defaultValue: false,
    },
    stageLabel: { type: "string", defaultValue: "Stage" },
    sourceLabel: { type: "string", defaultValue: "Source" },
    capturedLabel: { type: "string", defaultValue: "Captured" },
    emailLabel: { type: "string", defaultValue: "Email" },
    phoneLabel: { type: "string", defaultValue: "Phone" },
    interestLabel: { type: "string", defaultValue: "Interest" },
    notesLabel: { type: "string", defaultValue: "Notes" },
    appointmentsLabel: { type: "string", defaultValue: "Appointments" },
    noAppointmentsText: {
      type: "string",
      displayName: "No appointments text",
      defaultValue: "No appointments booked.",
    },
    closeLabel: { type: "string", defaultValue: "Close" },
    showAppointments: {
      type: "boolean",
      displayName: "Appointments list",
      description:
        "What this lead has booked — date, time and status. Read-only; statuses are worked on the Appointments page.",
      defaultValue: true,
    },
    showLostPanel: {
      type: "boolean",
      displayName: "Lost explainer",
      description: "The 'closed — lost' note. Only ever shows on a lost lead.",
      defaultValue: true,
    },
    showChatbotPanel: {
      type: "boolean",
      displayName: "Chatbot quote",
      description: "The question that triggered capture. Only ever shows on a chatbot lead.",
      defaultValue: true,
    },
    readOnly: {
      type: "boolean",
      displayName: "Read-only",
      description: "Overrides the tracker's setting for this panel only.",
    },
  },
});

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

/** Every chart takes the same frame props, so they are declared once. */
function chartProps(defaults: { title: string; subtitle: string; footnote?: string }) {
  return {
    className: { type: "class" } as const,
    title: { type: "string", displayName: "Title", defaultValue: defaults.title } as const,
    subtitle: { type: "string", displayName: "Subtitle", defaultValue: defaults.subtitle } as const,
    ...(defaults.footnote === undefined
      ? {}
      : {
          footnote: {
            type: "string",
            displayName: "Footnote",
            defaultValue: defaults.footnote,
          } as const,
        }),
    showTable: {
      type: "boolean",
      displayName: "'View as table'",
      description:
        "The chart's text alternative. Turning it off leaves the values reachable only by hovering.",
      defaultValue: true,
    } as const,
  };
}

PLASMIC.registerComponent(SourceVolumeChart, {
  name: "LeadSourceVolumeChart",
  displayName: "Chart · Source volume",
  description: "Where every lead came from, highest first. Clicking a bar filters the dashboard.",
  importPath: "@/components/crm/charts/SourceVolumeChart",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    ...chartProps({
      title: "Lead source distribution",
      subtitle: "Where every lead came from, highest first",
      footnote: "Click a bar to filter the whole dashboard by that source.",
    }),
    clickToFilter: { type: "boolean", displayName: "Click to filter", defaultValue: true },
  },
});

PLASMIC.registerComponent(SourceQualityChart, {
  name: "LeadSourceQualityChart",
  displayName: "Chart · Source quality",
  description: "Share of each source's leads that reached SQL or beyond.",
  importPath: "@/components/crm/charts/SourceQualityChart",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: chartProps({
    title: "Source quality",
    subtitle: "Share of each source's leads that reached SQL or beyond",
    footnote:
      "Sources with fewer than 4 leads are dimmed — the percentage is not yet meaningful. " +
      "A lead that qualified and was later lost still counts here, so this measures what a " +
      "channel brings in, not what closed.",
  }),
});

PLASMIC.registerComponent(FunnelChart, {
  name: "LeadFunnelChart",
  displayName: "Chart · Lifecycle funnel",
  description: "Leads reaching each stage, counted at the furthest stage they got to.",
  importPath: "@/components/crm/charts/FunnelChart",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: chartProps({
    title: "Lifecycle funnel",
    subtitle: "Leads reaching each stage, counted at the furthest stage they got to",
    footnote:
      "Step conversion counts lost leads in the denominator — otherwise the rate would rise as deals were lost.",
  }),
});

PLASMIC.registerComponent(MonthlyChart, {
  name: "LeadMonthlyChart",
  displayName: "Chart · Leads per month",
  description: "Capture volume over time, all sources combined.",
  importPath: "@/components/crm/charts/MonthlyChart",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: chartProps({
    title: "Leads captured per month",
    subtitle: "All sources combined",
  }),
});

PLASMIC.registerComponent(SourceStageMatrix, {
  name: "LeadSourceStageMatrix",
  displayName: "Chart · Source × stage",
  description: "Where each source's leads currently sit — darker means more.",
  importPath: "@/components/crm/charts/SourceStageMatrix",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: chartProps({
    title: "Source × stage",
    subtitle: "Where each source's leads currently sit — darker means more",
  }),
});

PLASMIC.registerComponent(SocialSplitMeter, {
  name: "LeadSocialSplitMeter",
  displayName: "Chart · Social vs owned",
  description: "Social platforms against the website chatbot and contact form.",
  importPath: "@/components/crm/charts/SocialSplitMeter",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    ...chartProps({
      title: "Social vs owned channels",
      subtitle: "Social platforms against the website chatbot and contact form",
    }),
    socialLabel: { type: "string", displayName: "Social wording", defaultValue: "social" },
    webLabel: { type: "string", displayName: "Owned wording", defaultValue: "owned web" },
  },
});

PLASMIC.registerComponent(SourceShareDonut, {
  name: "LeadSourceShareDonut",
  displayName: "Chart · Source concentration",
  description: "Top sources by volume, everything else folded into Other.",
  importPath: "@/components/crm/charts/SourceShareDonut",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    ...chartProps({
      title: "Source concentration",
      subtitle: "Top sources by volume, share of all leads",
      footnote:
        "Coloured by rank, not by source — each wedge is labelled directly so a re-filter never quietly repaints what a colour means.",
    }),
    centerCaption: { type: "string", displayName: "Centre caption", defaultValue: "leads" },
  },
});

PLASMIC.registerComponent(ActiveLostDonut, {
  name: "LeadActiveLostDonut",
  displayName: "Chart · Active vs lost",
  description: "Every lead, still in play or closed lost.",
  importPath: "@/components/crm/charts/ActiveLostDonut",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    ...chartProps({
      title: "Active vs lost",
      subtitle: "Every lead, still in play or closed lost",
    }),
    centerCaption: { type: "string", displayName: "Centre caption", defaultValue: "leads" },
  },
});

PLASMIC.registerComponent(StageShareDonut, {
  name: "LeadStageShareDonut",
  displayName: "Chart · Active stage mix",
  description: "Where leads still in play currently sit.",
  importPath: "@/components/crm/charts/StageShareDonut",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    ...chartProps({
      title: "Active lead stage mix",
      subtitle: "Where leads still in play currently sit",
      footnote: "Lost leads are excluded — see Active vs lost for that split.",
    }),
    centerCaption: { type: "string", displayName: "Centre caption", defaultValue: "active" },
  },
});

// ---------------------------------------------------------------------------
// The decision layer
//
// The pieces added when the tracker stopped only describing the book and
// started handing out work. Registered on the same terms as everything above:
// each reads the tracker itself, so any of them can be dropped anywhere, and a
// designer can rebuild the page around the queue rather than around the table.
// ---------------------------------------------------------------------------

PLASMIC.registerComponent(ActionBoard, {
  name: "LeadActionBoard",
  displayName: "Action · Work board",
  description:
    "Every lead filed under the stage it is sitting at, one stage on screen at a time, each with the standing instruction for that stage. The view the tracker opens on.",
  importPath: "@/components/crm/ActionBoard",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    limit: {
      type: "number",
      displayName: "Rows per section",
      description:
        "Beyond this the section says how many it is holding back. On Lost the budget is shared between the causes, so a large one cannot bury the small reopenable ones.",
      defaultValue: 25,
    },
    showActions: {
      type: "boolean",
      displayName: "Inline action buttons",
      description:
        "The stage's own buttons on every row — a Lead offers only qualify and close, a Customer only contact. Turning them off makes the board a report rather than a worklist.",
      defaultValue: true,
    },
  },
});

PLASMIC.registerComponent(InsightPanel, {
  name: "LeadInsightPanel",
  displayName: "Insights · What to do about it",
  description:
    "Ranked findings about the book, each carrying its evidence and linking to the leads behind it.",
  importPath: "@/components/crm/InsightPanel",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    title: { type: "string", displayName: "Title", defaultValue: "What to do about it" },
    limit: { type: "number", displayName: "How many findings", defaultValue: 5 },
    basePath: {
      type: "string",
      displayName: "Link prefix",
      description:
        "Where the drill-downs point. Leave empty on the lead tracker itself; set /admin/leads when this sits on another page.",
      defaultValue: "",
    },
  },
});

PLASMIC.registerComponent(AdminOverview, {
  name: "LeadAdminOverview",
  displayName: "Overview · Owner dashboard",
  description:
    "Pipeline health, the funnel, ranked findings and the work outstanding. The whole /admin summary in one element.",
  importPath: "@/components/crm/AdminOverview",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    leadsPath: {
      type: "string",
      displayName: "Lead tracker path",
      defaultValue: "/admin/leads",
    },
  },
});

PLASMIC.registerComponent(ScoreChip, {
  name: "LeadScoreChip",
  displayName: "Lead Score Chip",
  description:
    "A lead's priority score as a coloured badge. Hovering explains the number.",
  importPath: "@/components/crm/ScoreChip",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    leadId: {
      type: "string",
      displayName: "Lead id",
      description: "Leave empty to follow the selected lead, then the first one shown.",
    },
    size: {
      type: "choice",
      displayName: "Size",
      options: [
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
      ],
      defaultValue: "sm",
    },
    showLabel: {
      type: "boolean",
      displayName: "Show band name",
      defaultValue: false,
    },
  },
});

PLASMIC.registerComponent(ScoreBreakdown, {
  name: "LeadScoreBreakdown",
  displayName: "Lead Score Breakdown",
  description:
    "Every factor behind a lead's score, itemised. What makes the number arguable rather than magic.",
  importPath: "@/components/crm/ScoreBreakdown",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    leadId: { type: "string", displayName: "Lead id" },
  },
});

PLASMIC.registerComponent(LeadTimeline, {
  name: "LeadTimeline",
  displayName: "Lead Timeline",
  description:
    "What has actually happened to a lead. Renders nothing when there is no recorded history.",
  importPath: "@/components/crm/LeadTimeline",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    leadId: { type: "string", displayName: "Lead id" },
    limit: { type: "number", displayName: "Entries shown", defaultValue: 12 },
  },
});

PLASMIC.registerComponent(LossReasonChart, {
  name: "LeadLossReasonChart",
  displayName: "Chart · Why deals are lost",
  description:
    "Losses ranked by the money they cost, coloured by which part of the business owns the fix.",
  importPath: "@/components/crm/charts/LossReasonChart",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: chartProps({
    title: "Why deals are lost",
    subtitle: "Ranked by value lost, with the part of the business that owns each fix",
    footnote:
      "Recorded when a lead is closed, which is why it is required at that moment — a reason that can be skipped is one nobody supplies.",
  }),
});

PLASMIC.registerComponent(StageVelocityChart, {
  name: "LeadStageVelocityChart",
  displayName: "Chart · Where deals are ageing",
  description:
    "How long open leads have sat at their current stage, against what that stage tolerates.",
  importPath: "@/components/crm/charts/StageVelocityChart",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    ...chartProps({
      title: "Where deals are ageing",
      subtitle: "Average days open leads have sat at their current stage",
      footnote:
        "Measured from the last stage change, not from when the lead arrived. The marker on each bar is what that stage tolerates before a lead counts as stalled.",
    }),
    clickToFilter: {
      type: "boolean",
      displayName: "Click a row to filter",
      defaultValue: true,
    },
  },
});

PLASMIC.registerComponent(ContactLog, {
  name: "LeadContactLog",
  displayName: "Contact log",
  description:
    "Every recorded interaction with a lead: who was contacted, how to reach them, who did it and when.",
  importPath: "@/components/crm/ContactLog",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
    title: { type: "string", displayName: "Title", defaultValue: "Contact log" },
    limit: {
      type: "number",
      displayName: "Rows shown",
      description: "The read itself is capped at 200; this trims the table further.",
      defaultValue: 25,
    },
    leadsPath: {
      type: "string",
      displayName: "Lead tracker path",
      defaultValue: "/admin/leads",
    },
    // `entries` is deliberately not a prop a designer fills in: the rows come
    // from a server read that holds the service key, so the page hands them
    // down. Dropped on a bare artboard this renders its empty state, which is
    // the honest thing for it to do.
  },
});

PLASMIC.registerComponent(TablePagination, {
  name: "LeadTablePagination",
  displayName: "Table rows & pager",
  description:
    "How many table rows to show (10 / 20 / 50 / 100 / custom) and which page of them. Ships inside the lead table by default.",
  importPath: "@/components/crm/TablePagination",
  isDefaultExport: true,
  parentComponentName: GROUP,
  props: {
    className: { type: "class" },
  },
});
