// Core Types for the Personal Brand Workspace

export type ClientStatus = 'Active' | 'Onboarding' | 'Paused' | 'Churned';

// Team Roles
export type TeamRole = 'Coordinator' | 'Short Form Manager' | 'YouTube Manager' | 'Editor';

// Team Categories (content teams)
export type TeamCategory = 'Podcast' | 'Personal Brand' | 'Social Media' | 'Production' | 'Advertising';

// Workspace views
export type WorkspaceType = 'full_dashboard' | 'team_workspace';

// Check-in sentiment
export type CheckinSentiment = 'positive' | 'neutral' | 'negative';

// Check-in response method
export type CheckinResponseMethod = 'Speech' | 'Typed';

export type ContentType = 'Short Form' | 'YouTube' | 'Podcast';

export type ContentStatus =
  // Short Form stages
  | 'To Shoot' | 'In Progress' | 'PC Feedback' | 'Client Feedback'
  | 'Approved' | 'Not Approved' | 'Posted'
  // YouTube/Podcast stages
  | 'Research' | 'Brief' | 'Edit' | 'Thumbnail Design'
  | 'PC Review' | 'Client Review' | 'Final Review'
  | 'To Schedule' | 'Scheduled' | 'Live'
  | 'Live: 24 Hour Review' | 'Live: 48 Hour Review' | 'Live: 5 Day Review' | 'Complete'
  // Podcast only
  | 'Guest Booked'
  // Schedule pipeline statuses (for calendar view)
  | 'Nil' | 'Edited' | 'Filmed';

// Schedule-specific status for calendar grid cells
export type ScheduleStatus = 'Nil' | 'In Progress' | 'Filmed' | 'Edited' | 'Scheduled' | 'Live';

export type IdeaStatus = 'Not started' | 'In Progress' | 'Needs Review' | 'Reviewing' | 'Approved' | 'Not Approved' | 'Done' | 'Recorded' | 'Ideas' | 'Used';

// Content Bank (Ideas) content format
export type IdeaContentFormat = '📹 Short Video' | '🎥 Long Video' | '📷 Image';

// Content Bank (Ideas) style options
export type IdeaStyle =
  | 'Challenge' | 'Reaction' | 'Talking Head/PTC' | 'Paper Explanation'
  | 'Cardboard Reveal' | 'Whiteboard Session' | 'Greenscreen' | 'Vox Pop'
  | 'Vlog' | 'Animation' | 'Quote' | 'Q&A' | 'Role Play' | 'Carousel';

// Content Bank (Ideas) source options
export type IdeaSource =
  | 'Reels' | 'Article' | 'Reddit' | 'Brainstorm' | 'YouTube'
  | 'TikTok' | 'X' | 'Facebook' | 'Question' | 'Email';

export type TaskStatus = 'To Do' | 'In Progress' | 'Complete' | 'Pending';

export type TaskUrgency = 'Urgent' | 'This Week' | 'This Month' | 'Backlog';

export type CaseNoteType = 'Internal Note' | 'Client Request' | 'Editing Guideline';

export type CaseNoteSource = 'Slack' | 'Email' | 'Call' | 'Manual';

// Database Record Types

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  packageId?: string;
  packageName?: string;
  accountManager?: string;
  startDate?: string;
  slackChannel?: string;
  totalContent: number;
  totalIdeas: number;
  totalTasks: number;
  totalBrainDocs: number;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  name: string;
  shortFormPerMonth: number;
  youtubePerMonth: number;
  podcastPerMonth: number;
  monthlyRetainer?: number;
  description?: string;
}

export interface NotionUser {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
}

export interface Content {
  id: string;
  title: string;
  contentType: ContentType;
  clientId: string;
  clientName?: string;
  status: ContentStatus;
  scheduledDate?: string;
  assignedEditor?: NotionUser;
  assignedStrategist?: string; // Hardcoded options: Natasha, Kyle
  assignedCoordinator?: string; // Hardcoded options: Eddie
  style?: string; // Only for Short Form content

  // Attributes (content details)
  titleOptions?: string;
  thumbnails?: string[]; // Array of thumbnail URLs (stored as JSON in Notion Rich Text)
  description?: string;
  transcription?: string;
  script?: string;
  copy?: string;

  // Links
  briefUrl?: string;
  driveLink?: string;
  frameIoLink?: string;
  frameIoAssetId?: string; // Frame.io asset ID for auto-move functionality
  editedEpisodeLink?: string;
  switchedFileFrameLink?: string;
  sourceFileLink?: string;
  dropboxLink?: string;
  trailerLink?: string;
  trailerSocialLink?: string;
  snippetsLink?: string;

  // Notes
  clientFeedback?: string;
  internalNotes?: string;
  editingNotes?: string;

  // Clip-specific fields (for Short Form clips from YouTube/Podcast)
  clipTranscription?: string;
  clipTimestamp?: string;  // Format: "00:00 - 00:00" or just start time
  podcastClipStyle?: string; // Podcast Clip Style for clips from YouTube/Podcast

  // Relations
  parentContentId?: string;
  childClipIds?: string[];
  ideaSourceId?: string;
  createdAt: string;
  updatedAt: string;
}

// Rejection reasons for ideas
export type IdeaRejectionReason = 'Not aligned' | 'Controversial' | 'Unclear on angle' | 'Other';

export interface Idea {
  id: string;
  title: string; // Headline field
  clientId: string;
  clientName?: string;
  status: IdeaStatus; // Based on Stage Status
  contentFormat: IdeaContentFormat; // Content Format field
  contentType: ContentType; // Mapped from contentFormat for backwards compat
  script?: string; // Script field
  hook?: string; // Hook Ideas field
  angle?: string; // Angle field - suggested angle for the content
  source?: IdeaSource; // Source field
  sourceLink?: string; // Source Link field - URL reference for the source
  style?: IdeaStyle; // Style field
  priority: 'Urgent' | 'Not Urgent';
  url?: string; // URL field
  briefUrl?: string; // Brief URL field
  ideaAttributionDate?: string; // Idea Attribution Date field
  notApproved: boolean; // Not Approved checkbox
  chosen: boolean; // Chosen checkbox
  linkedContentId?: string; // Content Production Engine relation
  rejectionReason?: IdeaRejectionReason; // Reason for rejection
  rejectionNote?: string; // Additional note when rejection reason is 'Other'
  editingNotes?: string; // Editing notes - carries over to content when converted
  createdAt: string;
}

export interface Task {
  id: string;
  task: string;
  clientId?: string;
  clientName?: string;
  assignedTo?: string; // Display name (from People field or Team Members relation)
  assigneeId?: string; // Team Member database ID (for relation-based assignment)
  status: TaskStatus;
  urgency: TaskUrgency;
  dueDate?: string;
  sourceCaseNoteId?: string;
  recurringTemplateId?: string;
  relatedContentId?: string;
  notes?: string;
  completedDate?: string;
  cadencePhase?: string; // If set, this task was generated from cadence
  // Hubstaff integration fields
  hubstaffTaskId?: string;
  hubstaffProjectId?: string;
  syncStatus?: 'Not Synced' | 'Synced' | 'Failed' | 'Pending';
  lastSynced?: string;
  timeTracked?: number; // Total time tracked in seconds
  // Subtask support
  parentTaskId?: string; // If set, this is a subtask
  subtasks?: Subtask[]; // Child subtasks (loaded from frontend state, not stored)
  createdAt: string;
}

// Lightweight subtask structure for UI
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  parentTaskId: string;
}

export interface CaseNote {
  id: string;
  title: string;
  clientId: string;
  clientName?: string;
  date: string;
  type: CaseNoteType;
  source: CaseNoteSource;
  fullNote: string;
  createdBy?: string;
  autoGenerated: boolean;
  taskIds?: string[];
  createdAt: string;
  // Fireflies meeting note ownership
  firefliesOwnerId?: string;      // Team member ID who owns this meeting note
  firefliesOwnerEmail?: string;   // Team member email for ownership filtering
}

export interface BrainDocument {
  id: string;
  name: string;
  clientId: string;
  documentType: string;
  fileUrl?: string;
  url?: string;
  summary?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OperatingCadence {
  id: string;
  taskTemplate: string;
  roles: string[];
  cadencePhase: string;
  dayOfMonth?: number;
  weekOfMonth?: string;
  frequency: 'Monthly' | 'Weekly' | 'Daily';
  active: boolean;
  description?: string;
}

// UI Types

export interface PipelineColumn {
  id: ContentStatus;
  title: string;
  items: Content[];
}

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  contentThisMonth: number;
  pendingTasks: number;
  urgentTasks: number;
}

export interface ClientDeliverables {
  shortForm: { delivered: number; target: number };
  youtube: { delivered: number; target: number };
  podcast: { delivered: number; target: number };
}

// Hubstaff Integration Types

export interface HubstaffProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  organizationId: string;
}

export interface HubstaffUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
}

export interface HubstaffTask {
  id: string;
  summary: string;
  details?: string;
  projectId: string;
  status?: string;
}

export interface HubstaffTimeEntry {
  id: string;
  userId: string;
  taskId?: string;
  projectId: string;
  startTime: string;
  tracked: number; // Duration in seconds
  keyboard: number;
  mouse: number;
  overall: number;
  note?: string;
}

export interface HubstaffConfig {
  apiKey?: string;
  organizationId?: string;
  defaultProjectId?: string;
  userMappings: Record<string, string>; // Notion user ID -> Hubstaff user ID
  autoSync: boolean;
  enabled: boolean;
}

export interface HubstaffSyncResult {
  success: boolean;
  taskId?: string;
  hubstaffTaskId?: string;
  error?: string;
  syncedAt: string;
}

// Acuity Scheduling Integration Types

export interface AcuityAppointment {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  datetime: string;
  endTime: string;
  appointmentTypeID: string;
  appointmentType: string;
  calendarID: string;
  calendar: string;
  canceled: boolean;
  price: string;
  priceSold?: string;
  paid?: string;
  amountPaid?: string;
  notes?: string;
  timezone: string;
  confirmationPage?: string;
  forms?: any[];
  certificate?: string;
}

export interface AcuityAppointmentType {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: string;
  color?: string;
}

export interface AcuityCalendar {
  id: string;
  name: string;
  email?: string;
  description?: string;
  timezone?: string;
}

// Alert Types

export type AlertType =
  | 'task_overdue'
  | 'task_reminder'
  | 'urgent_idea'
  | 'daily_summary'
  | 'general'
  | 'error'
  | 'warning'
  | 'info';

export type AlertPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  priority: AlertPriority;
  clientId?: string;
  clientName?: string;
  relatedEntityId?: string; // ID of related task, idea, content, etc.
  relatedEntityType?: 'task' | 'idea' | 'content' | 'case_note';
  read: boolean;
  dismissed: boolean;
  sentToSlack: boolean;
  createdAt: string;
  updatedAt: string;
}

// Team Member Types

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role?: TeamRole;
  team?: TeamCategory[];
  workspaceType: WorkspaceType;
  isAdmin: boolean;
  slackUserId?: string;
  passwordHash?: string; // For new signup users (not exposed to frontend)
  createdAt?: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: TeamRole;
  team: TeamCategory[];
}

// Daily Check-in Types

export interface DailyCheckin {
  id: string;
  teamMemberId: string;
  teamMemberName?: string;
  date: string;
  outcomesToday: string;
  challenges: string;
  learnings: string;
  nextDayOutcomes: string;
  completed: boolean;
  qualityScore?: number;
  sentiment?: CheckinSentiment;
  aiSummary?: string;
  responseMethod?: CheckinResponseMethod;
  createdAt: string;
}

export interface TeamCheckinReport {
  period: { start: string; end: string };
  totalCheckins: number;
  completionRate: number;
  avgQualityScore: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  byMember: Array<{
    memberId: string;
    memberName: string;
    checkins: number;
    avgQuality: number;
    sentiment: string;
  }>;
  aiInsights?: string;
}

// Auto-Task Assignment Types

export interface TaskTemplate {
  task: string;
  role: TeamRole;
  daysFromTrigger?: number; // Days after content creation or scheduling
  trigger: 'created' | 'scheduled';
}

export interface RoleTaskMapping {
  contentType: ContentType;
  tasks: TaskTemplate[];
}
