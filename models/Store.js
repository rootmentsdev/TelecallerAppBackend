import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },     
    code: { type: String },                      
    brand: { type: String },                    
    city: { type: String },                     
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Store", storeSchema);
