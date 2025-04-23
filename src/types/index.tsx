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
  status: "pending" | "processing" | "processed" | "failed";
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
  keywords: string;
  weblink?: string;
  image_data?: ProjectImageData[];
  publications?: number;
  googleMaps?: string;
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
