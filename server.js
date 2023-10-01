const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const { mongoose } = require("./models/database.js");
const { User } = require("./models/user.js");

const app = express();

app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: "10000mb", parameterLimit: 100000 }));

// ubah jika menggunakan react
app.use(express.static(path.join(__dirname, "views")));

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");

  app.get("/", (req, res) => {
    res.sendFile("index.html");
  });
});
