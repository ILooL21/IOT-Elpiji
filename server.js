const express = require("express");
const bodyParser = require("body-parser");
const expressSession = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(expressSession);
const bcrypt = require("bcrypt");
const path = require("path");
const mqtt = require("mqtt");

const app = express();

//MQTT
const client = mqtt.connect("mqtt://localhost:1883");
const topic = "VOLUMEGAS";

//Models
const { mongoose } = require("./models/database.js");
const { User } = require("./models/user.js");
const { Data } = require("./models/data.js");

//Session store
const store = new MongoDBStore({
  uri: "mongodb://127.0.0.1:27017/IOT",
  collection: "sessions",
});

//Socket.io server
const server = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: "10000mb", parameterLimit: 100000 }));

//buat function pendefinisian waktu
function defineTime() {
  date = new Date();
  dd = String(date.getDate()).padStart(2, "0");
  mm = String(date.getMonth() + 1).padStart(2, "0");
  yyyy = date.getFullYear();
  HH = String(date.getHours()).padStart(2, "0");
  MM = String(date.getMinutes()).padStart(2, "0");
  SS = String(date.getSeconds()).padStart(2, "0");
}
defineTime();

//Koneksi ke mqtt broker
client.on("connect", () => {
  console.log("Connected to MQTT broker");
  client.on("message", async (topic, payload) => {
    console.log("Received Message:", topic, payload.toString());
    defineTime();
    io.emit("message", payload.toString());

    // Simpan data ke database
    const datas = await Data.findOne({ Date: `${dd}/${mm}/${yyyy}` });
    if (datas) {
      await Data.updateOne(
        { Date: `${dd}/${mm}/${yyyy}` },
        {
          $push: {
            Volume: {
              time: date.toLocaleTimeString(),
              volume: payload.toString(),
            },
          },
        }
      );
    } else {
      const data = new Data({
        Date: `${dd}/${mm}/${yyyy}`,
        Volume: [
          {
            time: date.toLocaleTimeString(),
            volume: payload.toString(),
          },
        ],
      });
      await data.save();
    }
  });
  client.subscribe(topic);
});

//Koneksi ke socket io
io.on("connection", (socket) => {
  console.log("connected");
  socket.on("disconnect", () => {
    console.log("disconnected");
  });
  socket.on("date", async (data) => {
    const dates = data;
    const tanggal = await Data.findOne({ Date: dates });
    io.emit("chart", tanggal.Volume);
  });
  socket.on("switchOnOff", (data) => {
    client.publish("switchOnOff", data);
  });
});

//Session
app.use(
  expressSession({
    key: "user_sid",
    secret: "iotelpiji",
    store: store,
    resave: true,
    saveUninitialized: true,
    cookie: {
      expires: 86400000,
    },
  })
);

//View engine
app.set("view engine", "ejs");

//Routes
server.listen(8080, () => {
  console.log("Server started on http://localhost:8080");

  app.get("/", (req, res) => {
    res.render("index");
  });

  app.get("/spec", (req, res) => {
    res.render("spec");
  });

  app.get("/dashboard", async (req, res) => {
    const tanggal = await Data.find().sort({ Date: 1 });
    isLogin = req.session.user ? true : false;
    if (isLogin) {
      res.render("dashboard", {
        data: tanggal,
      });
    } else {
      res.redirect("/login");
    }
  });

  app.get("/register", (req, res) => {
    res.render("register", {
      error: "",
      message: "",
    });
  });

  app.post("/register", async (req, res) => {
    try {
      const users = await User.findOne({ email: req.body.email });
      const names = await User.findOne({ name: req.body.username });
      if (users || names) {
        res.render("register", {
          error: "User already exists",
          message: "",
        });
      } else {
        bcrypt.hash(req.body.password, 10, async (err, hash) => {
          const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hash,
          });
          await user.save();
          res.redirect("/login");
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/login", (req, res) => {
    isLogin = req.session.user ? true : false;
    if (!isLogin) {
      res.render("login", {
        message: "",
        error: "",
      });
    } else {
      res.redirect("/dashboard");
    }
  });

  app.post("/login", async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      res.render("login", {
        error: "Email does not exist",
        message: "",
      });
    } else {
      bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (result) {
          req.session.user = user;
          res.redirect("/dashboard");
        } else {
          res.render("login", {
            message: "",
            error: "Wrong password",
          });
        }
      });
    }
  });

  app.get("/profile", async (req, res) => {
    isLogin = req.session.user ? true : false;
    if (isLogin) {
      const id = await User.findOne({ email: req.session.user.email });
      res.render("profile", {
        user: id,
        error: "",
        message: "",
      });
    } else {
      res.redirect("/login");
    }
  });

  app.post("/changepassword", async (req, res) => {
    try {
      const user = await User.findOne({ email: req.session.user.email });
      bcrypt.compare(req.body.oldpassword, user.password, async (err, result) => {
        if (result) {
          bcrypt.hash(req.body.newpassword, 10, async (err, hash) => {
            await User.updateOne(
              { email: req.session.user.email },
              {
                $set: {
                  password: hash,
                },
              }
            );
            res.render("profile", {
              user: user,
              error: "",
              message: "Password changed successfully",
            });
          });
        } else {
          res.render("profile", {
            user: user,
            error: "Wrong old password",
            message: "",
          });
        }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return console.log(err);
      }
      res.redirect("/");
    });
  });
});
