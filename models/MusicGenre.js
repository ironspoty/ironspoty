const mongoose = require("mongoose");

const musicGenreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: "Name is required",
    }
  }
);

module.exports = mongoose.model("MusicGenre", musicGenreSchema);