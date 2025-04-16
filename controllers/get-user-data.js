require("dotenv").config();
const firestore = require("../deps/firestore");
const jwt = require("jsonwebtoken");
const SECRET_ACCESS = process.env.JWT_ACCESS;
async function getUserData(req, res) {
  try {
    const reqFire = await firestore
      .collection("organization")
      .doc(jwt.decode(req.cookies.refreshToken).id || "")
      .get();
    if (!reqFire.exists) {
      throw new Error("Organization doesn't exist.");
    }

    const datax = reqFire.data();

    const acsPayload = {
      fn: datax.fn,
      ln: datax.ln,
      email: datax.email,
      org_name: datax.org_name,
      country: datax.country,
      website: datax.website,
      logo: datax.logo,
      id: reqFire.id,
    };

    const accessToken = jwt.sign(acsPayload, SECRET_ACCESS, {
      expiresIn: 24 * 60 * 60,
    });

    res.status(200).json({
      success: true,
      token: accessToken,
      err: "",
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      token: "",
      err: e.message,
    });
  }
}

module.exports = { getUserData };
