export type LoginProps = {
  email: string;
  password: string;
};

export type ChangePasswordProps = {
  newPassword: string;
};

export type UserProps = {
  uid: string;
  email: string;
  name: string;
  created_at: string;
  last_sign_in_at: string;
  role: string;
};

export type UserDataProps = {
  id: string;
  created_at: string;
  updated_at: string;
  uid: string;
  active: boolean;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  vat: string;
  role: string;
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

export type ProjectDataProps = {
  id: string;
  created_at?: string;
  updated_at?: string;
  user: string;
  title: string;
  state: string;
  description: string;
  keywords?: string;
  weblink?: string;
  image_data?: ProjectImageData[];
  publications?: number;
  googleMaps?: string;
  promoter?: string;
  collaborators?: string;
  authors?: string;
  category?: string;
  year?: string;
};

export type LinkedInPageInfo = {
  id: string;
  name: string;
  type: string;
};

export type SocialNetworksCheck = {
  linkedln?: boolean | LinkedInPageInfo;
  instagram?: boolean;
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

export type Coordinates = {
  lat: number;
  lng: number;
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
