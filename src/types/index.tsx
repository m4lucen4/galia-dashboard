import type { SiteLanguage } from "@/helpers/siteLanguages";

export type LoginProps = {
  email: string;
  password: string;
};

export type ChangePasswordProps = {
  newPassword: string;
};

export type UserDataProps = {
  id: string;
  created_at: string;
  updated_at: string;
  uid: string;
  active: boolean;
  avatar_url: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  description: string;
  vat: string;
  role: string;
  language?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  province_id?: number | null;
  country?: number | null;
  job_position?: string;
  web?: string;
  tags?: string;
  odoo_id?: number;
  folder_nas?: string;
  has_web?: boolean;
};

export type ProjectImageData = {
  url: string;
  status: "pending" | "processing" | "processed" | "failed" | "not_selected";
  processingId?: string;
  processingResult?: {
    outputUrl?: string;
    metadata?: string;
    timestamps: {
      queued: string;
      started?: string;
      completed?: string;
    };
  };
};

export type ProjectVideo = {
  id: string;
  project_id: number;
  storage_path: string;
  poster_path: string | null;
  original_name: string;
  bytes: number;
  duration_ms: number;
  width: number;
  height: number;
  faststart: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
};

export type ProjectCollaboratorsProps = {
  id: string;
  profession: string;
  name: string;
  website?: string;
  odooId?: number;
};

export type ProjectDataProps = {
  id: string;
  created_at?: string;
  updated_at?: string;
  user: string;
  userData?: UserDataProps;
  assigned?: string;
  title: string;
  state: string;
  description: string;
  keywords?: string;
  requiredAI?: boolean;
  prompt?: string;
  weblink?: string;
  image_data?: ProjectImageData[];
  publications?: number;
  googleMaps?: string;
  category?: string;
  year?: string;
  showMap?: boolean;
  projectCollaborators?: ProjectCollaboratorsProps[];
  nas_folder?: string;
  translation_settings?: {
    original_language: SiteLanguage;
    translations: { language: SiteLanguage }[];
  } | null;
};

export type LinkedInPageInfo = {
  id: string;
  name: string;
  type: string;
};

export type InstagramPageInfo = {
  id: string;
  name: string;
  type: "BUSINESS";
  // Legacy rows may carry it; new selections never do (a DB trigger fills it server-side for n8n).
  accessToken?: string;
  facebookPageId?: string;
  facebookPageName?: string;
};

export type SocialNetworksCheck = {
  linkedln?: boolean | LinkedInPageInfo;
  instagram?: boolean | InstagramPageInfo;
};

// Per-network publication target (public.publication_targets), as the publish-publication Edge
// Function returns it and the dashboard reads it (S23). Never carries tokens.
export type PublicationTargetStatus =
  | "pending"
  | "running"
  | "published"
  | "failed"
  | "needs_action"
  | "cancelled";

export type PublicationTargetErrorKind =
  | "transient"
  | "action_required"
  | "permanent";

export type PublicationTargetAccountKind =
  | "instagram_business"
  | "linkedin_person"
  | "linkedin_organization";

export type PublicationTarget = {
  id: string;
  previewId: string;
  network: "instagram" | "linkedin";
  status: PublicationTargetStatus;
  /** Real instant (ISO) of the scheduled run, or of the next automatic attempt. */
  runAt: string;
  attempts: number;
  maxAttempts: number;
  errorCode: string | null;
  errorKind: PublicationTargetErrorKind | null;
  accountKind: PublicationTargetAccountKind;
  accountName: string | null;
  externalPostId: string | null;
  permalink: string | null;
  publishedAt: string | null;
};

export type PublishVersions = {
  id: string;
  description: string;
  main: boolean;
};

export type PreviewProjectDataProps = {
  id: string;
  created_at?: string;
  updated_at?: string;
  user: string;
  title: string;
  state: string;
  description_rich: string;
  weblink?: string;
  image_data?: ProjectImageData[];
  publishDate?: string;
  checkSocialNetworks?: SocialNetworksCheck;
  instagramResult?: string;
  linkedlnResult?: string;
  versions?: PublishVersions[];
  instructions?: string;
};

export type UpdateProjectPublishingProps = {
  projectId: string;
  publishDate?: string;
  checkSocialNetworks?: SocialNetworksCheck;
  publishNow?: boolean;
};

export type UpdatePreviewProjectProps = {
  projectId: string | number;
  description_rich?: string;
  image_data?: Array<{
    url: string;
    status: "pending" | "processing" | "processed" | "failed" | "not_selected";
    processingResult?: {
      timestamps: {
        queued: string;
        started?: string;
        completed?: string;
      };
      outputUrl?: string;
      metadata?: string;
    };
  }>;
  versions?: PublishVersions[];
};

export type IRequest = {
  inProgress: boolean;
  messages: string;
  ok: boolean;
};

export type SupabaseError = {
  message: string;
  status?: number;
};

export type SocialConnectionNetwork = "linkedin" | "instagram";

export type SocialConnectionStatus =
  | "connected"
  | "expiring"
  | "expired"
  | "revoked"
  | "error"
  | "disconnected";

// Publishable page as stored in social_connections.pages (never contains tokens).
export type SocialConnectionPage = {
  id: string;
  name: string;
  type?: string;
  vanityName?: string;
  username?: string;
  facebookPageId?: string;
  facebookPageName?: string;
};

// Connection health read from social_connections or returned by social-connect-* functions.
export type SocialConnection = {
  id: string;
  network: SocialConnectionNetwork;
  status: SocialConnectionStatus;
  statusReason: string | null;
  accountId: string | null;
  accountName: string | null;
  pages: SocialConnectionPage[];
  expiresAt: string | null;
  accessExpiresAt: string | null;
  refreshExpiresAt: string | null;
  dataAccessExpiresAt: string | null;
  connectedAt: string | null;
  lastCheckedAt: string | null;
};

export type LinkedInPage = {
  id: string;
  name: string;
  vanityName?: string;
  logoUrl?: string | null;
  type: "PERSON" | "ORGANIZATION";
};

export type LinkedInData = {
  isConnected: boolean;
  status?: SocialConnectionStatus;
  statusReason?: string | null;
  personId?: string;
  userName?: string;
  expiresAt?: string;
  adminPages?: LinkedInPage[];
  pagesFetchedAt?: string;
};

export type InstagramBusinessPage = {
  facebook_page_id: string;
  facebook_page_name: string;
  facebook_page_category?: string;
  instagram_business_account_id: string;
  instagram_username: string;
  instagram_name: string;
  instagram_profile_picture?: string;
  instagram_followers_count?: number;
  instagram_media_count?: number;
  instagram_biography?: string;
  // Never sent to the browser anymore; kept optional for legacy shapes.
  page_access_token?: string;
  permissions?: string[];
};

export type InstagramData = {
  isConnected: boolean;
  status?: SocialConnectionStatus;
  statusReason?: string | null;
  userId?: string;
  userName?: string;
  expiresAt?: string;
  businessPages?: InstagramBusinessPage[];
  pagesFetchedAt?: string;
};

export type PromptsProps = {
  id: string;
  created_at: string;
  updated_at?: string;
  title: string;
  description: string;
  user: string;
  isPrivate: boolean;
};

export type MultimediaItemType = "file" | "folder";

export type MultimediaItem = {
  id: string;
  name: string;
  type: MultimediaItemType;
  path: string;
  created_at: string;
  updated_at: string;
  size?: number;
  user_id: string;
};

export type FileItem = MultimediaItem & {
  type: "file";
  size: number;
  mime_type: string;
  url: string;
  thumbnail_url?: string;
};

export type FolderItem = MultimediaItem & {
  type: "folder";
  parent_path: string | null;
};

export type UploadProgress = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  url?: string;
};

export type MultimediaState = {
  currentPath: string;
  files: FileItem[];
  folders: FolderItem[];
  uploads: UploadProgress[];
  selectedItems: string[];
  loading: boolean;
  error: string | null;
};

// Subscription types

export type SubscriptionPlanType = "student" | "professional";
export type BillingPeriod = "monthly" | "annual";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "incomplete";

export type SubscriptionDataProps = {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan_type: SubscriptionPlanType;
  billing_period: BillingPeriod;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  catalog_version?: string;
  amount_excluding_tax?: number;
  currency?: string;
  myweb?: boolean;
  myweb_cancel_at?: string | null;
  myweb_payment_url?: string | null;
  has_web?: boolean;
};

export type RegisterFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  plan_type: SubscriptionPlanType;
  billing_period: BillingPeriod;
  myweb: boolean;
};

// Site Builder types

export type HeaderSlideConfig = {
  image_url: string;
  vimeo_url?: string;
  background_type?: "image" | "vimeo";
  title: string;
  description: string;
  type: 1 | 2;
  text_button: string;
  url_button: string;
  icon_button?: string;
  show_logo?: boolean;
  logo_title_align?: "bottom" | "center";
};

export type SiteComponentType = "header" | "project_list" | "cta" | "body" | "content" | "contact" | "project_columns" | "rich_text" | "separator" | "figure" | "editorial_cards";

export type RichTextConfig = {
  content: string;
  alignment: "left" | "right";
  width?: "full" | "half" | "two-thirds";
};

export type SeparatorConfig = {
  size: "small" | "medium" | "large";
};

export type FigureConfig = {
  image_url: string;
  caption: string;
  size: "half" | "full";
  link_url?: string;
  link_type?: "internal" | "external";
};

export type EditorialCardConfig = {
  image_url: string;
  title: string;
  description: string;
  text_secondary_button: string;
  url_secondary_button: string;
};

export type EditorialCardsConfig = {
  cards: [EditorialCardConfig, EditorialCardConfig];
};

export type ProjectColumnsConfig = {
  columns: 1 | 2;
  project_1?: string;
  project_2?: string;
  vertical_align_1?: "top" | "center" | "bottom";
  vertical_align_2?: "top" | "center" | "bottom";
  horizontal_align?: "start" | "end" | "between" | "stretch";
  width_1col?: "full" | "80" | "50";
};

export type ContentConfig = {
  antetitulo?: string;
  titulo?: string;
  image?: string;
  textoIzquierda?: string;
  textoDerecha?: string;
  dato1?: number;
  leyenda1?: string;
  dato2?: number;
  leyenda2?: string;
  dato3?: number;
  leyenda3?: string;
  dato4?: number;
  leyenda4?: string;
  type: 1 | 2;
};

export type BodyConfig = {
  description: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  link_1?: string;
  link_2?: string;
  link_3?: string;
  type: 1 | 2 | 3 | 4 | 5;
};

export type ProjectListLayout = "grid-4" | "grid-alternating";

export type ProjectListConfig = {
  layout: ProjectListLayout;
  project_order?: string[];
  hidden_projects?: string[];
  detail_type?: 1 | 2;
  show_descriptions?: boolean;
};

export type CTAConfig = {
  type: 1 | 2 | 3;
  title: string;
  description: string;
  subtitle: string;
  text_primary_button: string;
  url_primary_button: string;
  text_secondary_button: string;
  url_secondary_button: string;
  split_color?: string;
};

export type ContactConfig = {
  type: 1 | 2;
  antetitulo?: string;
  show_logo?: boolean;
  titulo: string;
  descripcion: string;
  titulo_direccion1?: string;
  direccion1: string;
  titulo_direccion2?: string;
  direccion2?: string;
  form_bg_color?: string;
  form_email?: string;
  columns_reverse?: boolean;
  form_reverse?: boolean;
};

export type SitePageDataProps = {
  page_type?: "page" | "home_anchor" | null;
  target_component_id?: string | null;
  id: string;
  site_id: string;
  title: string;
  slug: string;
  position: number;
  visible: boolean;
  show_in_nav: boolean;
  content?: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteComponentDataProps = {
  anchor_id?: string | null;
  id: string;
  page_id: string;
  type: SiteComponentType;
  position: number;
  visible: boolean;
  config: HeaderSlideConfig[] | ProjectListConfig | CTAConfig | BodyConfig | ContentConfig | ContactConfig | ProjectColumnsConfig | RichTextConfig | SeparatorConfig | FigureConfig | EditorialCardsConfig;
  created_at: string;
  updated_at: string;
};

export type SiteDataProps = {
  id: string;
  user_id: string;
  slug: string;
  studio_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  tertiary_color?: string;
  font: string;
  title_font: string;
  navbar_type: number;
  navbar_transparent?: boolean;
  navbar_hidden?: boolean;
  footer_hidden?: boolean;
  custom_domain?: string | null;
  favicon_url?: string | null;
  meta_description?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  full_width?: boolean;
  default_language?: string;
  enabled_languages?: import("@/helpers/siteLanguages").SiteLanguage[] | null;
  multilanguage?: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};
