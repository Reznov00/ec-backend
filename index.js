const express = require("express");
const dotenv = require("dotenv");
const colors = require("colors");
const connectDB = require("./config/db");
const cors = require("cors");

//Importing dotenv variables
dotenv.config({ path: "./config/config.env" });

//Import Routes
const users = require("./routes/userRoutes");

//Initialize Express App
const app = express();

//Function call to connect to Database
connectDB();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false }));

// Registering Routes to the Express App
app.use("/api", users);

const PORT = process.env.PORT;

const server = app.listen(
  PORT,
  console.log(`Server started`.bold.yellow.inverse)
);
