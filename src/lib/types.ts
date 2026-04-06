/**
 * Local database type definitions — mirrors the SQLite schema in server/db.js
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface TableDefs {
  career_jobs: {
    id: string;
    title: string;
    description: string;
    location: string;
    job_type: string;
    image_url: string | null;
    icon: string | null;
    is_visible: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };
  client_logos: {
    id: string;
    name: string;
    logo_url: string;
    is_visible: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };
  contact_submissions: {
    id: string;
    full_name: string;
    company_name: string | null;
    email: string;
    phone: string | null;
    message: string;
    is_read: boolean;
    status: string;
    created_at: string;
  };
  seo_settings: {
    id: string;
    page_key: string;
    title: string;
    description: string;
    keywords: string;
    og_image: string | null;
    updated_at: string;
    updated_by: string | null;
  };
  services: {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    icon: string | null;
    is_visible: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };
  site_content: {
    id: string;
    section_key: string;
    content: Json;
    updated_at: string;
    updated_by: string | null;
  };
  testimonials: {
    id: string;
    name: string;
    company: string;
    message: string;
    avatar_url: string | null;
    rating: number;
    is_visible: boolean;
    created_at: string;
    updated_at: string;
  };
  users: {
    id: string;
    email: string;
    password: string;
    userrole: string;
    created_at: string;
    updated_at: string;
  };
  products: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    image_url: string | null;
    extra_text: string | null;
    extra_color: string | null;
    contact_url: string;
    is_popular: boolean;
    is_visible: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };
  job_applications: {
    id: string;
    applicant_name: string;
    email: string;
    phone: string | null;
    job_id: string | null;
    resume_url: string | null;
    cover_letter: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
  application_replies: {
    id: string;
    application_id: string;
    sender: string;
    message: string;
    created_at: string;
  };
  submission_replies: {
    id: string;
    submission_id: string;
    sender: string;
    message: string;
    created_at: string;
  };
  appointments: {
    id: string;
    reference_type: string;
    reference_id: string;
    name: string;
    email: string;
    title: string | null;
    description: string | null;
    notes: string | null;
    appointment_date: string;
    created_at: string;
  };
}

export type Tables<T extends keyof TableDefs> = TableDefs[T];
