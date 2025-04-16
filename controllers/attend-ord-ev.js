require("dotenv").config();
const { verify } = require("hcaptcha");
const firestore = require("../deps/firestore");
const transporter = require("../deps/transporter");
const cloudinary = require("../deps/cloudinary");
const { v4: uuidv4 } = require("uuid");
const qrcode = require("qrcode");
const fs = require("fs");
const moment = require("moment");
const path = require("path");
const { Timestamp } = require("firebase-admin/firestore");

async function attendOrdEv(req, res) {
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
        addr: addr.trim() || "",
        evId: evId,
        registeredOn: Timestamp.fromMillis(new Date().getTime()),
        public_id_qr: qrUpl.public_id,
        qrId_secUrl: qrUpl.secure_url,
        attended: false,
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
        .format("hh:mm A")}\nLocation: ${
        rrxData.location
      }\n\nBefore the Event:\nPlease find an attached QR code in this email, which serves as your entry pass to the event. Ensure you have it readily available and present it upon arrival at the venue.\nDuring the event:\nUpon arrival, please approach the registration table where our team will scan your QR code. After scanning, you will be issued an Eventra Passport, which you can use throughout the duration of the event. With your Eventra Passport, you will be able to scan other attendees' passports to access their information.\nAfter the event:\nOnce the event concludes, your Eventra Passport will become inactive. Be sure to utilize it while the event is ongoing to take full advantage of its features.\n\nPowered by Eventra Events\nMade by CTX Technologies (CTX Softwares Philippines)`,
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
                    style="padding: 0; background-color: #4cbaa1; height: 8px"
                  ></td>
                </tr>
                <tr>
                  <td style="padding: 30px 30px 20px 30px; text-align: center">
                    <h1
                      style="
                        margin: 0;
                        font-size: 28px;
                        font-weight: 700;
                        color: #4cbaa1;
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
                              color: #4cbaa1;
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
                                📅
                              </td>
                              <td style="padding: 0">
                                <p style="margin: 0; font-size: 16px">
                                  <strong>Date:</strong> ${moment
                                    .unix(rrxData.date._seconds)
                                    .utcOffset(rrxData.offset * -1)
                                    .format("dddd, MMM DD, YYYY")}
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
                                ⌚
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
                                📍
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
                            For more information, download the event brochure below:
                            <a
                              href="${
                                process.env.ORIGIN
                              }/assets/MPOF25-Philippines_USD.pdf"
                             download
                              style="text-decoration: none"
                            >
                              <button
                                style="
                                  display: block;
                                  width: 50%;
                                  margin: 0 auto;
                                  padding: 0.75rem 0.5rem;
    
                                  background-color: #4cbaa1;
                                  color: white;
                                  font-weight: 600;
                                  border: none;
                                  border-radius: 15px;
                                  margin-top: 1rem;
                                  cursor: pointer;
                                "
                              >
                                Download Brochure
                              </button>
                            </a>
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
                        color: #4cbaa1;
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
                        color: #4cbaa1;
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
                        color: #4cbaa1;
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
    
          <tr>
            <td style="padding: 20px 30px">
              <h3
                style="margin: 0; font-size: 15px; font-weight: 600; color: #4cbaa1"
              >
                If you have any questions, please do not hesitate to contact:
              </h3>
    
              <div>
                <ul style="list-style-type: none; padding-left: 0">
                  <li style="font-weight: 500">Marc Ferrancullo</li>
                  <li>
                    <a
                      href="mailto:marcferrancullo@gmail.com"
                      style="text-decoration: none"
                    >
                      marcferrancullo@gmail.com
                    </a>
                  </li>
                  <li>+63 915 644 2425</li>
                </ul>
              </div>
               <div>
                <ul style="list-style-type: none; padding-left: 0">
                  <li style="font-weight: 500">Marciano Ferrancullo Jr.</li>
                  <li>
                    <a
                      href="mailto:marc_chevoleo@hotmail.com"
                      style="text-decoration: none"
                    >
                      marc_chevoleo@hotmail.com
                    </a>
                  </li>
                  <li>+63 966 387 4917</li>
                </ul>
              </div>
            </td>
          </tr>
    
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
                        color: #4cbaa1;
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

    await transporter.sendMail(mailOptions).catch(async (e) => {
      try {
        await firestore.collection("atendee-org").doc(atnUUID).delete();
        await cloudinary.uploader.destroy(qrUpl.public_id);
      } catch (e) {
        throw new Error("Fatal error.");
      }
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
}

module.exports = { attendOrdEv };
