const mongoose = require("mongoose");

const Data = mongoose.model(
  "Datas",
  new mongoose.Schema({
    Date: {
      type: String,
      required: true,
      minlength: 1,
      trim: true,
    },
    Volume: {
      type: Array,
      required: true,
      minlength: 1,
      trim: true,
    },
  })
);
module.exports = { Data };
