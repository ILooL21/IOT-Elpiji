const express = require("express");
const bodyParser = require("body-parser");
const expressSession = require("express-session");

const { mongoose } = require("./models/database.js");
const { User } = require("./models/user.js");

const app = express();

app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: "10000mb", parameterLimit: 100000 }));

app.use(
  expressSession({
    key: "user_sid",
    secret: "iotelpiji",
    resave: true,
    saveUninitialized: true,
    cookie: {
      expires: 600000,
    },
  })
);

// ubah jika menggunakan react
app.set("view engine", "ejs");

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");

  app.get("/", (req, res) => {
    res.render("index");
  });

  app.get("/dashboard", (req, res) => {
    isLogin = req.session.user ? true : false;
    if (isLogin) {
      res.render("dashboard");
    } else {
      res.redirect("/login");
    }
  });

  app.get("/login", (req, res) => {
    isLogin = req.session.user ? true : false;
    if (!isLogin) {
      res.render("login");
    } else {
      res.redirect("/dashboard");
    }

    app.get("/register", (req, res) => {
      res.render("register");
    });
  });
});
