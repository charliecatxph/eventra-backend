require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const routes = require("./routes/routes");
const cookieParser = require("cookie-parser");
const app = express();

const firestore = require("./deps/firestore");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  })
);
app.use("/api", routes);
app.listen(process.env.PORT, () => {
  console.log(`Server is listening at PORT ${process.env.PORT}`);
});

// const isSupplierArrayValid = (supplierArray) => {
//   supplierArray.forEach((supplier) => {
//     if (
//       !supplier.name ||
//       !supplier.country ||
//       !supplier.description ||
//       !supplier.website
//     )
//       return false;
//   });
//   return true;
// };

// const bizMatchDataVerif = (data) => {
//   const {
//     name,
//     location,
//     organizedBy,
//     description,
//     offset,
//     date,
//     startT,
//     endT,
//     tsStartT,
//     tsEndT,
//     lim,
//     inc,
//     suppliers,
//   } = data;

//   if (
//     !name ||
//     !location ||
//     !organizedBy ||
//     !description ||
//     !offset ||
//     !startT ||
//     !endT ||
//     !tsStartT ||
//     !tsEndT ||
//     lim < 1 ||
//     inc < 1 ||
//     !date ||
//     !isSupplierArrayValid(suppliers)
//   )
//     return false;

//   return true;
// };

// const protectedRoute = (req, res, next) => {
//   const accessToken = req.headers.authorization?.split(" ")[1];
//   const refreshToken = req.cookies?.refreshToken;

//   if (!accessToken || !refreshToken) {
//     res.clearCookie("refreshToken", {
//       httpOnly: true,
//       secure: process.env.MODE === "PRODUCTION",
//       sameSite: "none",
//     });
//     return res.status(400).json({ message: "No tokens provided." });
//   }

//   try {
//     const actok = jwt.verify(accessToken, SECRET_ACCESS);
//     const rstok = jwt.verify(refreshToken, SECRET_REFRESH);

//     req.user = actok;
//     req.ouid = rstok.id;
//     next();
//   } catch (e) {
//     return res.sendStatus(403);
//   }
// };
