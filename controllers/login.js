require("dotenv").config();
const firestore = require("../deps/firestore");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const SECRET_ACCESS = process.env.JWT_ACCESS;
const SECRET_REFRESH = process.env.JWT_REFRESH;

async function login(req, res) {
  const packet = JSON.parse(req.body.data);
  if (!packet.email || !packet.pw) return res.sendStatus(400);

  try {
    const reqFire = await firestore
      .collection("organization")
      .where("email", "==", packet.email)
      .get();
    if (reqFire.empty) throw new Error("Organization doesn't exist.");
    const datax = reqFire.docs[0].data();

    const match = await bcrypt.compare(packet.pw, datax.pw);

    if (!match) throw new Error("Wrong password.");
    const acsPayload = {
      fn: datax.fn,
      ln: datax.ln,
      email: datax.email,
      org_name: datax.org_name,
      country: datax.country,
      website: datax.website,
      logo: datax.logo,
      id: reqFire.docs[0].id,
    };

    const accessToken = jwt.sign(acsPayload, SECRET_ACCESS, {
      expiresIn: 24 * 60 * 60,
    });
    const refreshToken = jwt.sign({ id: reqFire.docs[0].id }, SECRET_REFRESH, {
      expiresIn: 30 * 24 * 60 * 60,
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.MODE === "PRODUCTION",
      sameSite: process.env.MODE === "PRODUCTION" ? "none" : "Lax",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.MODE === "PRODUCTION", // Ensures it is only sent over HTTPS
      sameSite: process.env.MODE === "PRODUCTION" ? "none" : "Lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    // Send Access Token in Response
    res.status(200).json({
      success: true,
      token: accessToken,
      err: "",
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      msg: "",
      err: e.message,
    });
  }
}

module.exports = { login };
