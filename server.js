const express = require("express");
const bodyParser = require("body-parser");

const { mongoose } = require("./models/database.js");
const { User } = require("./models/user.js");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
