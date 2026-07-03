import { Document } from "mongoose";

export interface IPlatformConfig extends Document {
  // Basic & Operational
  siteName: string;
  tagline: string;
  supportEmail: string;
  maintenanceMode: boolean;
  currency: "BDT" | "USD";
  contactPhone: string;
  copyrightText: string;

  // Media & Branding
  siteLogo: string;
  favicon: string;

  // SEO & Meta
  metaDescription: string;
  metaKeywords: string[];
  ogImage: string;
  googleAnalyticsId: string;

  // Social Media
  socialLinks: {
    facebook: string;
    youtube: string;
    linkedin: string;
    github: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
