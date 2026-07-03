import mongoose, { Schema } from "mongoose";
import type { IPlatformConfig } from "../types/platformConfigType.js";

const platformConfigSchema = new Schema<IPlatformConfig>(
  {
    siteName: { type: String, default: "EduNext" },
    tagline: { type: String, default: "Learn & Grow" },
    supportEmail: { type: String, default: "support@edunext.com" },
    maintenanceMode: { type: Boolean, default: false },
    currency: { type: String, enum: ["BDT", "USD"], default: "BDT" },
    contactPhone: { type: String, default: "" },
    copyrightText: { type: String, default: "© EduNext. All rights reserved." },

    siteLogo: { type: String, default: "" },
    favicon: { type: String, default: "" },

    metaDescription: { type: String, default: "" },
    metaKeywords: { type: [String], default: [] },
    ogImage: { type: String, default: "" },
    googleAnalyticsId: { type: String, default: "" },

    socialLinks: {
      facebook: { type: String, default: "" },
      youtube: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  },
);

const PlatformConfigModel = mongoose.model<IPlatformConfig>(
  "PlatformConfig",
  platformConfigSchema,
);

export default PlatformConfigModel;
