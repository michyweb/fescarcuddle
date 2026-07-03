import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  login_page: {
    type: String,
    required: true
  },
  boot_location: {
    type: String
  },
  tab_title: {
    type: String
  },
  favicon: {
    type: String
  },
  language: {
    type: String,
    default: 'es-419,es;q=0.9,en;q=0.8'
  },
  payload: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

export const Target = mongoose.model('Target', targetSchema);
