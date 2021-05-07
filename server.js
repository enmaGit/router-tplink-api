const express = require("express");
const app = express();
const port = 3000;
require("dotenv").config();
import md5Hex from "md5-hex";
const base64 = require("base-64");
import { escape } from "html-escaper";

const https = require("https");

app.get("/", (req, res) => {
  const options = {
    hostname: "192.168.0.1",
    port: 8080,
    path: "/",
    method: "GET",
  };

  const password = md5Hex(process.env.password);

  const auth = `Basic ${base64.encode(`${process.env.user}:${password}`)}`;
  const cookie = `Authorization=${escape(auth)};path=/`;

  console.log(cookie);
  const response = {};
  res.send(response);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
