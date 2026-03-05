import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    source: { type: String, default: "website_form" }, // website_form / landing_page / etc.
    message: String,
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);