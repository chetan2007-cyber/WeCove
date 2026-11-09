export interface InquiryFormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  projectType: string;
  budget?: string;
  message: string;
  _gotcha?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface ServiceItem {
  id: string;
  category: string;
  title: string;
  tagline: string;
  description: string;
  capabilities: string[];
  technologies: string[];
  deliverables: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  focus: string;
  accent: string;
}
