require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const qrcode = require("qrcode");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const jwt = require("jsonwebtoken");
const { verify } = require("hcaptcha");
const firebase = initializeApp({
  credential: cert(JSON.parse(process.env.SERVICE_ACCOUNT)),
});

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: process.env.MODE === "PRODUCTION" ? 465 : 587, // 465 ssl
  secure: process.env.MODE === "PRODUCTION",
  auth: {
    user: process.env.TRANSPORTER_EMAIL,
    pass: process.env.TRANSPORTER_PW,
  },
});

const firestore = getFirestore();
const firestorage = getStorage();

const { v2: cloudinary } = require("cloudinary");
const cookieParser = require("cookie-parser");

const SECRET_ACCESS = process.env.JWT_ACCESS;
const SECRET_REFRESH = process.env.JWT_REFRESH;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const upload = multer({ storage });
const moment = require("moment");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  })
);

const isSupplierArrayValid = (supplierArray) => {
  supplierArray.forEach((supplier) => {
    if (
      !supplier.name ||
      !supplier.country ||
      !supplier.description ||
      !supplier.website
    )
      return false;
  });
  return true;
};

const bizMatchDataVerif = (data) => {
  const {
    name,
    location,
    organizedBy,
    description,
    offset,
    date,
    startT,
    endT,
    tsStartT,
    tsEndT,
    lim,
    inc,
    suppliers,
  } = data;

  if (
    !name ||
    !location ||
    !organizedBy ||
    !description ||
    !offset ||
    !startT ||
    !endT ||
    !tsStartT ||
    !tsEndT ||
    lim < 1 ||
    inc < 1 ||
    !date ||
    !isSupplierArrayValid(suppliers)
  )
    return false;

  return true;
};

const protectedRoute = (req, res, next) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken || !refreshToken) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.MODE === "PRODUCTION",
      sameSite: "none",
    });
    return res.status(400).json({ message: "No tokens provided." });
  }

  try {
    const actok = jwt.verify(accessToken, SECRET_ACCESS);
    const rstok = jwt.verify(refreshToken, SECRET_REFRESH);

    req.user = actok;
    req.ouid = rstok.id;
    next();
  } catch (e) {
    return res.sendStatus(403);
  }
};

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

app.post("/get-atendees", protectedRoute, async (req, res) => {
  const { evId } = req.body;
  const { mode } = req.query;

  if (!evId || !mode) return res.sendStatus(400);

  try {
    const reqx = await firestore
      .collection("atendee-org")
      .where("evId", "==", evId)
      .orderBy("name", "asc")
      .get();

    if (mode === "count") {
      return res.status(200).json({
        success: true,
        data: reqx.size,
        err: "",
      });
    }

    let atendees = [];

    reqx.docs.forEach((atendee) => {
      atendees.push({
        id: atendee.id,
        ...atendee.data(),
      });
    });

    res.status(200).json({
      success: true,
      data: atendees,
      err: "",
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      msg: "",
      err: "Server error.",
    });
  }
});

app.post("/get-ord-event-data", protectedRoute, async (req, res) => {
  const { evId } = req.body;
  if (!evId) return res.sendStatus(400);

  try {
    const reqx = await firestore.collection("ordinaryEvent").doc(evId).get();
    res.status(200).json({
      success: true,
      data: reqx.data(),
      err: "",
    });
  } catch (e) {
    res.sendStatus(400);
    res.status(400).json({
      success: false,
      msg: "",
      err: "Server error.",
    });
  }
});

app.post("/get-available-events", async (req, res) => {
  const { orgId } = req.query;

  if (!orgId) return res.sendStatus(400);
  try {
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);

    const org = await firestore.collection("organization").doc(orgId).get();

    if (!org.exists) return res.sendStatus(400);

    const firequery = await firestore
      .collection("ordinaryEvent")
      .where("organizationId", "==", orgId)
      .orderBy("startT", "asc")
      .get();

    let events = [];

    for (const ev of firequery.docs) {
      const atnCnt = await firestore
        .collection("atendee-org")
        .where("evId", "==", ev.id)
        .get();

      events.push({
        ...ev.data(),
        evId: ev.id,
        registrationEnded: nowTimestamp.seconds > ev.data().startT._seconds,
        atendeeCount: atnCnt.size,
      });
    }

    res.status(200).json({
      data: events,
    });
  } catch (e) {}
});

app.post("/fetch-ord-event", async (req, res) => {
  const { evId } = req.body;

  if (!evId)
    return res.status(400).json({
      success: false,
      msg: "",
      err: "Incomplete parameters.",
    });

  try {
    const reqx = await firestore.collection("ordinaryEvent").doc(evId).get();

    if (!reqx.exists) throw new Error("Event not found.");

    res.status(200).json({
      success: true,
      data: reqx.data(),
      err: "",
    });
  } catch (e) {
    return res.status(400).json({
      success: false,
      msg: "",
      err: e.message,
    });
  }
});

app.post("/attend-ord-ev", async (req, res) => {
  const {
    name,
    email,
    orgN,
    orgP,
    phoneNumber,
    salutations,
    addr,
    evId,
    token,
  } = JSON.parse(req.body.data);

  if (
    !name ||
    !email.match(
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    ) ||
    !orgN ||
    !orgP ||
    !salutations ||
    !addr ||
    !phoneNumber ||
    !evId ||
    !token
  )
    return res.status(400).json({
      success: false,
      msg: "",
      err: "Incomplete parameters.",
    });

  try {
    await verify(process.env.HCAPTCHA_SECRET, token).catch((e) => {
      throw new Error("hCaptcha invalid.");
    });

    const rrx = await firestore.collection("ordinaryEvent").doc(evId).get();
    if (!rrx.exists) throw new Error("Event not found.");

    const rrxData = rrx.data();
    const dtNow = Math.floor(new Date().getTime() / 1000);

    const atns = await firestore
      .collection("atendee-org")
      .where("evId", "==", evId)
      .get();

    const rrx2 = await firestore
      .collection("atendee-org")
      .where("email", "==", email)
      .get();

    if (!rrx2.empty)
      throw new Error("Someone has already registered with that email.");

    if (parseInt(rrxData.atendeeLim) <= atns.size)
      throw new Error("Event is full.");

    if (rrxData.startT._seconds <= dtNow && rrxData.allowWalkIn)
      throw new Error(
        "Online registration has ended. But, walk-in applicants are accepted."
      );
    if (rrxData.startT._seconds <= dtNow && !rrxData.allowWalkIn)
      throw new Error(
        "Thank you for you interest, but the registration has ended."
      );

    const atnUUID = uuidv4();
    const evN = uuidv4();

    const qrFilePath = path.join(__dirname, `${evN}.png`);

    await qrcode.toFile(qrFilePath, atnUUID);

    const qrUpl = await cloudinary.uploader.upload(qrFilePath).catch((e) => {
      throw new Error("QR Upload fail.");
    });

    fs.unlinkSync(qrFilePath);

    await firestore
      .collection("atendee-org")
      .doc(atnUUID)
      .set({
        name: name.trim(),
        email: email.trim(),
        orgN: orgN.trim(),
        orgP: orgP.trim(),
        phoneNumber: phoneNumber.trim(),
        salutations: salutations.trim(),
        addr: addr.trim(),
        evId: evId,
        registeredOn: Timestamp.fromMillis(new Date().getTime()),
        public_id_qr: qrUpl.public_id,
      });

    await firestore.collection("notifications").add({
      type: "EVN-001",
      orgId: rrxData.organizationId,
      data: `${name.trim()} has registered on the ordinary event: ${rrxData.name.trim()}.`,
      stamp: Timestamp.fromMillis(new Date().getTime()),
    });

    const mailOptions = {
      from: `${rrxData.name} <events@vinceoleo.com>`, // sender address
      to: `${email.trim()}`, // list of receivers
      subject: `${rrxData.name} Event Confirmation`, // Subject line
      attachments: [
        {
          filename: "eventra-qrId.png",
          path: qrUpl.secure_url,
        },
      ],
      text: `Hello, ${name},\n \nThank you for registering for our event. We're excited to have you join us! Below are the details of the event: \n \nDate: ${moment
        .unix(rrxData.date._seconds)
        .utcOffset(rrxData.offset * -1)
        .format("MMM DD, YYYY")} \nTime: ${moment
        .unix(rrxData.startT._seconds)
        .utcOffset(rrxData.offset * -1)
        .format("hh:mm A")} - ${moment
        .unix(rrxData.endT._seconds)
        .utcOffset(rrxData.offset * -1)
        .format("hh:mm A")}\nLocation: ${rrxData.location}\nDescription: ${
        rrxData.description
      }\nBefore the Event:\nPlease find an attached QR code in this email, which serves as your entry pass to the event. Ensure you have it readily available and present it upon arrival at the venue.\nDuring the event:\nUpon arrival, please approach the registration table where our team will scan your QR code. After scanning, you will be issued an Eventra Passport, which you can use throughout the duration of the event. With your Eventra Passport, you will be able to scan other attendees' passports to access their information.\nAfter the event:\nOnce the event concludes, your Eventra Passport will become inactive. Be sure to utilize it while the event is ongoing to take full advantage of its features.\n\nPowered by Eventra Events\nMade by CTX Technologies (CTX Softwares Philippines)`,
      html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Event Confirmation</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333333;
      background-color: #f9f9f9;
    "
  >
    <table
      align="center"
      border="0"
      cellpadding="0"
      cellspacing="0"
      width="100%"
      style="
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-spacing: 0;
        border-collapse: collapse;
      "
    >
      <!-- Header -->
      <tr>
        <td style="padding: 0">
          <table
            border="0"
            cellpadding="0"
            cellspacing="0"
            width="100%"
            style="border-spacing: 0; border-collapse: collapse"
          >
            <tr>
              <td
                style="padding: 0; background-color: #4f46e5; height: 8px"
              ></td>
            </tr>
            <tr>
              <td style="padding: 30px 30px 20px 30px; text-align: center">
                <h1
                  style="
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                    color: #4f46e5;
                  "
                >
                  Event Confirmation
                </h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Greeting -->
      <tr>
        <td style="padding: 0 30px">
          <table
            border="0"
            cellpadding="0"
            cellspacing="0"
            width="100%"
            style="border-spacing: 0; border-collapse: collapse"
          >
            <tr>
              <td style="padding: 0 0 20px 0">
                <p style="margin: 0; font-size: 16px; line-height: 1.5">
                  Hello, <strong>${name}</strong>,
                </p>
                <p
                  style="margin: 15px 0 0 0; font-size: 16px; line-height: 1.5"
                >
                  Thank you for registering for our event. We're excited to have
                  you join us! Below are the details of the event:
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Event Details -->
      <tr>
        <td style="padding: 0 30px">
          <table
            border="0"
            cellpadding="0"
            cellspacing="0"
            width="100%"
            style="
              border-spacing: 0;
              border-collapse: collapse;
              background-color: #f5f7ff;
              border-radius: 8px;
            "
          >
            <tr>
              <td style="padding: 25px">
                <table
                  border="0"
                  cellpadding="0"
                  cellspacing="0"
                  width="100%"
                  style="border-spacing: 0; border-collapse: collapse"
                >
                  <tr>
                    <td style="padding: 0 0 15px 0">
                      <h2
                        style="
                          margin: 0;
                          font-size: 22px;
                          font-weight: 600;
                          color: #4f46e5;
                        "
                      >
                        ${rrxData.name}
                      </h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 10px 0">
                      <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                        style="border-spacing: 0; border-collapse: collapse"
                      >
                        <tr>
                          <td
                            width="24"
                            valign="top"
                            style="padding: 0 10px 0 0"
                          >
                            <img
                              src="https://cdn-icons-png.flaticon.com/512/747/747310.png"
                              width="18"
                              height="18"
                              alt="Calendar"
                              style="display: block"
                            />
                          </td>
                          <td style="padding: 0">
                            <p style="margin: 0; font-size: 16px">
                              <strong>Date:</strong> ${moment
                                .unix(rrxData.date._seconds)
                                .utcOffset(rrxData.offset * -1)
                                .format("MMM DD, YYYY")}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 10px 0">
                      <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                        style="border-spacing: 0; border-collapse: collapse"
                      >
                        <tr>
                          <td
                            width="24"
                            valign="top"
                            style="padding: 0 10px 0 0"
                          >
                            <img
                              src="https://cdn-icons-png.flaticon.com/512/2088/2088617.png"
                              width="18"
                              height="18"
                              alt="Clock"
                              style="display: block"
                            />
                          </td>
                          <td style="padding: 0">
                            <p style="margin: 0; font-size: 16px">
                              <strong>Time:</strong> ${moment
                                .unix(rrxData.startT._seconds)
                                .utcOffset(rrxData.offset * -1)
                                .format("hh:mm A")} - ${moment
        .unix(rrxData.endT._seconds)
        .utcOffset(rrxData.offset * -1)
        .format("hh:mm A")}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 10px 0">
                      <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                        style="border-spacing: 0; border-collapse: collapse"
                      >
                        <tr>
                          <td
                            width="24"
                            valign="top"
                            style="padding: 0 10px 0 0"
                          >
                            <img
                              src="https://cdn-icons-png.flaticon.com/512/684/684908.png"
                              width="18"
                              height="18"
                              alt="Location"
                              style="display: block"
                            />
                          </td>
                          <td style="padding: 0">
                            <p style="margin: 0; font-size: 16px">
                              <strong>Location:</strong> ${rrxData.location}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0">
                      <p
                        style="
                          margin: 10px 0 0 0;
                          font-size: 16px;
                          line-height: 1.5;
                        "
                      >
                        ${rrxData.description}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Event Information -->
      <tr>
        <td style="padding: 30px">
          <table
            border="0"
            cellpadding="0"
            cellspacing="0"
            width="100%"
            style="border-spacing: 0; border-collapse: collapse"
          >
            <tr>
              <td style="padding: 0 0 20px 0">
                <h3
                  style="
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #4f46e5;
                  "
                >
                  Before the Event
                </h3>
                <p
                  style="margin: 10px 0 0 0; font-size: 16px; line-height: 1.5"
                >
                  Please find an attached QR code in this email, which serves as
                  your entry pass to the event. Ensure you have it readily
                  available and present it upon arrival at the venue.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 20px 0">
                <h3
                  style="
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #4f46e5;
                  "
                >
                  During the Event
                </h3>
                <p
                  style="margin: 10px 0 0 0; font-size: 16px; line-height: 1.5"
                >
                  Upon arrival, please approach the registration table where our
                  team will scan your QR code. After scanning, you will be
                  issued an Eventra Passport, which you can use throughout the
                  duration of the event. With your Eventra Passport, you will be
                  able to scan other attendees' passports to access their
                  information.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 20px 0">
                <h3
                  style="
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #4f46e5;
                  "
                >
                  After the Event
                </h3>
                <p
                  style="margin: 10px 0 0 0; font-size: 16px; line-height: 1.5"
                >
                  Once the event concludes, your Eventra Passport will become
                  inactive. Be sure to utilize it while the event is ongoing to
                  take full advantage of its features.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA Button -->

      <!-- Footer -->
      <tr>
        <td style="padding: 0">
          <table
            border="0"
            cellpadding="0"
            cellspacing="0"
            width="100%"
            style="
              border-spacing: 0;
              border-collapse: collapse;
              background-color: #f5f7ff;
            "
          >
            <tr>
              <td style="padding: 20px 30px; text-align: center">
                <p
                  style="
                    margin: 15px 0 0 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #4f46e5;
                  "
                >
                  Powered by Eventra Events
                </p>

                <a
                  target="_blank"
                  href="https://www.facebook.com/ctxsoftwaresphilippines"
                >
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #666666">
                    Made by <b>CTX Technologies (CTX Softwares Philippines)</b>
                  </p>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
    };

    await transporter.sendMail(mailOptions).catch((e) => {
      console.log(e);
      throw new Error("Fail to send mail.");
    });
    return res.status(201).json({
      success: true,
      msg: "You have been registered! Please check your email for your identification.",
      err: "",
    });
  } catch (e) {
    return res.status(400).json({
      success: false,
      msg: "",
      err: e.message,
    });
  }
});

app.post("/delete-event-ord", protectedRoute, async (req, res) => {
  const { evId } = req.body;

  if (!evId) {
    return res.status(400).json({
      success: false,
      msg: "",
      err: "Incomplete parameters.",
    });
  }

  try {
    const rqx = await firestore.collection("ordinaryEvent").doc(evId).get();

    if (!rqx.exists) throw new Error("Event doesn't exist.");

    await cloudinary.uploader.destroy(rqx.data().coverFilePubId).catch((e) => {
      throw new Error("Fail to delete cover file.");
    });

    await rqx.ref.delete().catch((e) => {
      throw new Error("Fail to delete event.");
    });

    const rqx2 = await firestore
      .collection("atendee-org")
      .where("evId", "==", evId)
      .get();

    for (const doc of rqx2.docs) {
      await doc.ref.delete().catch(() => {
        throw new Error("Failed to delete one or more attendees.");
      });
    }

    res.status(200).json({
      success: true,
      msg: "Event has been deleted.",
      err: "",
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      msg: "",
      err: e.message,
    });
  }
});

app.post("/fetch-events", protectedRoute, async (req, res) => {
  const { mode } = req.query;
  try {
    const firequery = firestore
      .collection("ordinaryEvent")
      .where("organizationId", "==", req.ouid)
      .orderBy("endT", "desc");

    const firequery2 = firestore
      .collection("bizmatch")
      .where("organizationId", "==", req.ouid)
      .orderBy("endT", "desc");

    let payload = [];
    let payload2 = [];
    let snap1;
    let snap2;

    if (mode === "partial-ord") {
      snap1 = await firequery.get();
      for (const event of snap1.docs) {
        const fqAtn = await firestore
          .collection("atendee-org")
          .where("evId", "==", event.id)
          .get();
        payload.push({
          ...event.data(),
          id: event.id,
          atnSz: fqAtn.size,
        });
      }
    } else if (mode === "partial-biz") {
      snap2 = await firequery2.get();
      snap2.forEach((doc) => {
        payload2.push({
          ...doc.data(),
          id: doc.id,
        });
      });
    } else if (mode === "full") {
      snap1 = await firequery.get();
      snap2 = await firequery2.get();

      for (const event of snap1.docs) {
        const fqAtn = await firestore
          .collection("atendee-org")
          .where("evId", "==", event.id)
          .get();
        payload.push({
          ...event.data(),
          id: event.id,
          atnSz: fqAtn.size,
        });
      }
      snap2.forEach((doc) => {
        payload2.push({
          ...doc.data(),
          id: doc.id,
        });
      });
    } else {
      return res.status(403).json({
        success: false,
        msg: "",
        err: "",
      });
    }

    return res.status(200).json({
      success: true,
      data: payload,
      bz: payload2,
      err: "",
    });
  } catch (e) {
    res.status(403).json({
      success: false,
      msg: "",
      err: "",
    });
  }
});

app.post("/fetch-notifications", protectedRoute, async (req, res) => {
  try {
    const rx = await firestore
      .collection("notifications")
      .where("orgId", "==", req.ouid)
      .orderBy("stamp", "desc")
      .get();

    let notifs = [];

    rx.forEach((notification) => {
      notifs.push(notification.data());
    });
    res.status(200).json({
      success: true,
      data: notifs,
      err: "",
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      msg: "",
      err: e.message,
    });
  }
});

app.post(
  "/upload-ord-event",
  protectedRoute,
  upload.single("coverFile"),
  async (req, res) => {
    const coverFile = req.file;
    const {
      name: ev_name,
      location: ev_loc,
      organizedBy: ev_orgBy,
      description: ev_desc,
      offset: ev_offset,
      date: ev_date,
      startT: ev_st,
      endT: ev_et,
      allowWalkIn: ev_awl,
      atendeeLim: ev_al,
    } = JSON.parse(req.body.data);
    if (!ev_name || !ev_loc || !ev_orgBy || !ev_desc || !ev_awl) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const startTime = Timestamp.fromMillis(ev_st * 1000);
      const endTime = Timestamp.fromMillis(ev_et * 1000);

      const query = await firestore
        .collection("ordinaryEvent")
        .where("organizationId", "==", req.ouid)
        .where("startT", "<", startTime) // Existing event starts before the new one ends
        .where("endT", ">", endTime) // Existing event ends after the new one starts
        .get();

      if (!query.empty) {
        fs.unlinkSync(coverFile.path);
        return res.status(409).json({
          msg: "Event not uploaded. Conflicts with another event in the same date.",
        });
      }

      const uplImg = await cloudinary.uploader.upload(coverFile.path);
      fs.unlinkSync(coverFile.path);

      await firestore.collection("ordinaryEvent").add({
        name: ev_name,
        location: ev_loc,
        organizedBy: ev_orgBy,
        description: ev_desc,
        offset: ev_offset,
        date: Timestamp.fromMillis(ev_date * 1000),
        startT: startTime,
        endT: endTime,
        allowWalkIn: ev_awl === "true" ? true : false,
        atendeeLim: ev_al,
        organizationId: req.ouid,
        coverFile: uplImg.secure_url,
        coverFilePubId: uplImg.public_id,
      });

      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

app.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.MODE === "PRODUCTION",
    sameSite: "none",
  });
  res.sendStatus(200);
});

app.post("/get-user-data", async (req, res) => {
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
});

app.post(
  "/upload-biz-match",
  protectedRoute,
  upload.array("logo"),
  async (req, res) => {
    const packet = JSON.parse(req.body.data);
    const supplierImages = req.files;
    if (packet.suppliers.length !== supplierImages.length) {
      supplierImages.forEach((image) => {
        fs.unlink(image.path);
      });
      return res.sendStatus(400);
    }
    if (!bizMatchDataVerif(packet)) {
      supplierImages.forEach((image) => {
        fs.unlink(image.path);
      });
      return res.sendStatus(400);
    }

    try {
      const upl_on = Timestamp.fromMillis(new Date().getTime());
      const st = Timestamp.fromMillis(packet.startT * 1000);
      const et = Timestamp.fromMillis(packet.endT * 1000);

      const query = await firestore
        .collection("bizmatch")
        .where("organizationId", "==", req.ouid)
        .where("startT", "<=", st)
        .where("endT", ">=", et)
        .get();

      if (!query.empty) {
        supplierImages.forEach((supplierImage) => {
          fs.unlinkSync(supplierImage.path);
        });
        return res.status(409).json({
          msg: "BizMatch not uploaded. Conflicts with another event in the same date.",
        });
      }

      const uploadSupplierLogos = supplierImages.map((file) => {
        return new Promise((resolve) => {
          cloudinary.uploader.upload(file.path).then((rx) => {
            return resolve(rx);
          });
        });
      });

      const uplSuplRes = await Promise.all(uploadSupplierLogos);
      supplierImages.forEach((supplierImage) => {
        fs.unlinkSync(supplierImage.path);
      });

      let shwl = packet.suppliers;
      shwl.forEach((supplier, index) => {
        shwl[index].name = supplier.name.trim();
        shwl[index].description = supplier.description.trim();
        shwl[index].website = supplier.website.trim();
        shwl[index].url = uplSuplRes[index].secure_url;
      });

      const timeslots = [];

      const increment = packet.inc * 60;
      for (
        let currentStart = packet.tsStartT;
        currentStart < packet.tsEndT;
        currentStart += increment
      ) {
        const currentEnd = currentStart + increment;

        timeslots.push({
          start: Timestamp.fromMillis(currentStart * 1000),
          end: Timestamp.fromMillis(currentEnd * 1000),
          slotsAvailable: packet.lim,
          slotsSet: packet.lim,
          atendee: [],
        });
      }

      const payload = {
        name: packet.name.trim(),
        date: Timestamp.fromMillis(packet.date * 1000),
        startT: st,
        endT: et,
        organizationId: req.ouid,
        lim: packet.lim,
        offset: packet.offset,
        timeslotsCount: timeslots.length,
        suppliersCount: shwl.length,
        upl_on: upl_on,
      };

      try {
        const bzreq = await firestore.collection("bizmatch").add(payload);
        const promises = shwl.map(async (supplier) => {
          const timeslotsUUID = uuidv4();

          const supplierRef = await firestore.collection("suppliers").add({
            name: supplier.name,
            country: supplier.country,
            description: supplier.description,
            website: supplier.website,
            id: bzreq.id,
            timeslots: timeslotsUUID,
          });

          await firestore.collection("timeslots").doc(timeslotsUUID).set({
            slots: timeslots,
          });
        });

        // Wait for all the promises to complete
        await Promise.all(promises);
        return res.sendStatus(200);
      } catch (error) {
        console.error("Error in uploading suppliers:", error.message);
        res.sendStatus(403);
      }
    } catch (e) {
      res.sendStatus(500);
    }
  }
);

app.post("/eventra-register", upload.single("logo"), async (req, res) => {
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

    const hash = await bcrypt.hash(packet.pw, saltRounds);

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
});

app.post("/login", async (req, res) => {
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
      sameSite: "none",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.MODE === "PRODUCTION", // Ensures it is only sent over HTTPS
      sameSite: "none",
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
});

app.listen(process.env.PORT, () => {
  console.log(`Server is listening at PORT ${process.env.PORT}`);
});
