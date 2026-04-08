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

export type ProjectCollaboratorsProps = {
  profession: string;
  name: string;
  website?: string;
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
  accessToken: string;
  facebookPageId?: string;
  facebookPageName?: string;
};

export type SocialNetworksCheck = {
  linkedln?: boolean | LinkedInPageInfo;
  instagram?: boolean | InstagramPageInfo;
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

export type LinkedInPage = {
  id: string;
  name: string;
  vanityName: string;
  logoUrl: string | null;
  type: "PERSON" | "ORGANIZATION";
};

export type LinkedInData = {
  isConnected: boolean;
  personId?: string;
  userName?: string;
  expiresAt?: string;
  warning?: string;
  adminPages?: LinkedInPage[];
  pagesFetchedAt?: string;
};

export type InstagramBusinessPage = {
  facebook_page_id: string;
  facebook_page_name: string;
  facebook_page_category: string;
  instagram_business_account_id: string;
  instagram_username: string;
  instagram_name: string;
  instagram_profile_picture: string;
  instagram_followers_count: number;
  instagram_media_count: number;
  instagram_biography: string;
  page_access_token: string;
  permissions: string[];
};

export type InstagramData = {
  isConnected: boolean;
  userId?: string;
  userName?: string;
  expiresAt?: string;
  warning?: string;
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
  student_card_url: string | null;
  created_at: string;
  updated_at: string;
};

export type RegisterFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  plan_type: SubscriptionPlanType;
  billing_period: BillingPeriod;
  student_card?: File;
};

// Site Builder types

export type HeaderSlideConfig = {
  image_url: string;
  title: string;
  description: string;
  type: 1 | 2;
  text_button: string;
  url_button: string;
};

export type SiteComponentType = "header" | "project_list" | "cta" | "body" | "content";

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
  type: 1 | 2 | 3 | 4;
};

export type ProjectListLayout = "grid-4" | "grid-alternating";

export type ProjectListConfig = {
  layout: ProjectListLayout;
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
};

export type SitePageDataProps = {
  id: string;
  site_id: string;
  title: string;
  slug: string;
  position: number;
  visible: boolean;
  show_in_nav: boolean;
  created_at: string;
  updated_at: string;
};

export type SiteComponentDataProps = {
  id: string;
  page_id: string;
  type: SiteComponentType;
  position: number;
  visible: boolean;
  config: HeaderSlideConfig[] | ProjectListConfig | CTAConfig | BodyConfig | ContentConfig;
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
  font: string;
  navbar_type: number;
  custom_domain?: string | null;
  favicon_url?: string | null;
  meta_description?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};
