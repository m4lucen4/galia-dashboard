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
