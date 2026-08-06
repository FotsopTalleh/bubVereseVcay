export const CATEGORIES = [
  "Culture",
  "Sports",
  "Music",
  "Business",
  "Nightlife",
  "Community",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ACCENT: Record<Category, string> = {
  Culture: "var(--violet)",
  Sports: "var(--success)",
  Music: "var(--primary)",
  Business: "var(--foreground)",
  Nightlife: "var(--cyan)",
  Community: "var(--warning)",
};

export const ORGANIZER_STATUSES = [
  "Pending Verification",
  "Verified",
  "Needs More Information",
  "Rejected",
  "Suspended",
] as const;

export type OrganizerStatus = (typeof ORGANIZER_STATUSES)[number];

export const CHANNEL_TYPES = [
  "Mobile phone",
  "WhatsApp",
  "Email",
  "Instagram",
  "Facebook",
  "X (Twitter)",
  "LinkedIn",
  "Other",
] as const;

export type ChannelType = (typeof CHANNEL_TYPES)[number];

export type ContactChannel = { type: ChannelType; value: string };

export type Organizer = {
  id: string;
  name: string;
  email: string;
  password: string;
  bio?: string;
  channels: ContactChannel[];
  showContactsPublicly: boolean;
  status: OrganizerStatus;
  createdAt: string;
};

export type EventStatus = "Published" | "Unpublished" | "Removed";

export type EventRecord = {
  id: string;
  title: string;
  image: string;
  description: string;
  category: Category;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  organizerId: string;
  pinClicks: number;
  directionClicks: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  /** Daily interest history for planner/admin trend charts. */
  history: { date: string; pinClicks: number; directionClicks: number }[];
};

export type ModerationLog = {
  id: string;
  eventId: string;
  eventTitle: string;
  action: string;
  reason: string;
  at: string;
};

export type Session =
  | { role: "planner"; organizerId: string }
  | { role: "admin" }
  | null;
