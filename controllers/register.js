const firestore = require("../deps/firestore");
const bcrypt = require("bcrypt");
const fs = require("fs");

const eventraRegisterVerif = (data) => {
  const { fn, ln, email, pw, org_name, country, website } = data;

  if (!fn || !ln || !org_name || !country || !pw) return false;
  if (!website.match(/^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/))
    return false;
  if (
    !email.match(
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    )
  )
    return false;

  return true;
};

async function register(req, res) {
  const packet = JSON.parse(req.body.data);
  const logo = req.file;

  if (!eventraRegisterVerif(packet)) return res.sendStatus(400);
  if (!logo) return res.sendStatus(400);

  try {
    const emailCheck = await firestore
      .collection("organization")
      .where("email", "==", packet.email)
      .get();
    if (!emailCheck.empty) {
      fs.unlinkSync(logo.path);
      throw new Error("Organization already exists with that email.");
    }

    const hash = await bcrypt.hash(packet.pw, 10);

    const uplImg = await cloudinary.uploader.upload(logo.path);
    fs.unlinkSync(logo.path);

    const payload = {
      ...packet,
      pw: hash,
      logo: uplImg.secure_url,
    };

    firestore
      .collection("organization")
      .add(payload)
      .then((d) => {
        res.sendStatus(200);
      })
      .catch((e) => {
        res.sendStatus(500);
      });
  } catch (e) {
    res.status(400).json({
      msg: "E-Mail already exists.",
    });
  }
}

module.exports = { register };
