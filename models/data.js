const mongoose = require("mongoose");

const Data = mongoose.model(
  "Datas",
  new mongoose.Schema(
    {
      volume: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
      },
    },
    { timestamps: true }
  )
);
module.exports = { Data };
