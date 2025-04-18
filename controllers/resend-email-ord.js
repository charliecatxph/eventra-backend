const firestore = require("../deps/firestore");
const transporter = require("../deps/transporter");
const moment = require("moment");

async function resendEmailOrd(req, res) {
  const { id } = req.body;

  if (!id)
    return res.status(400).json({
      success: false,
      msg: "",
      err: "Incomplete parameters.",
    });
  try {
    const req = await firestore
      .collection("atendee-org")
      .doc(id)
      .get()
      .catch((e) => {
        throw new Error("Fail to fetch atendee.");
      });

    if (!req.exists) throw new Error("Atendee doesn't exist.");

    const atendeeData = req.data();

    const req2 = await firestore
      .collection("ordinaryEvent")
      .doc(atendeeData.evId)
      .get()
      .catch((e) => {
        throw new Error("Fail to get associated event.");
      });

    if (req2.empty) throw new Error("Event doesn't exist.");

    const eventData = req2.data();
    const mailOptions = {
      from: `${eventData.name} <events@vinceoleo.com>`, // sender address
      to: `${atendeeData.email}`, // list of receivers
      subject: `${eventData.name} Event Confirmation`, // Subject line
      attachments: [
        {
          filename: "eventra-qrId.png",
          path: atendeeData.qrId_secUrl,
        },
      ],
      text: `Hello, ${
        atendeeData.name
      },\n \nThank you for registering for our event. We're excited to have you join us! Below are the details of the event: \n \nDate: ${moment
        .unix(eventData.date._seconds)
        .utcOffset(eventData.offset * -1)
        .format("MMM DD, YYYY")} \nTime: ${moment
        .unix(eventData.startT._seconds)
        .utcOffset(eventData.offset * -1)
        .format("hh:mm A")} - ${moment
        .unix(eventData.endT._seconds)
        .utcOffset(eventData.offset * -1)
        .format("hh:mm A")}\nLocation: ${
        eventData.location
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
                        Hello, <strong>${atendeeData.name}</strong>,
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
                              ${eventData.name}
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
                                      .unix(eventData.date._seconds)
                                      .utcOffset(eventData.offset * -1)
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
                                      .unix(eventData.startT._seconds)
                                      .utcOffset(eventData.offset * -1)
                                      .format("hh:mm A")} - ${moment
        .unix(eventData.endT._seconds)
        .utcOffset(eventData.offset * -1)
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
                                    <strong>Location:</strong> ${
                                      eventData.location
                                    }
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
              <li>
                <a
                  href="https://wa.me/639156442425"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-weight: 500;
                    text-decoration: none;
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="green"
                    class="bi bi-whatsapp"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"
                    />
                  </svg>
                  +63 915 644 2425</a
                >
              </li>
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
              <li>
                <a
                  href="https://wa.me/639663874917"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-weight: 500;
                    text-decoration: none;
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="green"
                    class="bi bi-whatsapp"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"
                    />
                  </svg>
                  +63 966 387 4917</a
                >
              </li>
            </ul>
          </div>
          <div>
            <ul style="list-style-type: none; padding-left: 0">
              <li style="font-weight: 500">Rina Mariati Gustam</li>
              <li>
                <a href="mailto:rina@mpoc.org.my" style="text-decoration: none">
                  rina@mpoc.org.my
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/60123353004"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-weight: 500;
                    text-decoration: none;
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="green"
                    class="bi bi-whatsapp"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"
                    />
                  </svg>
                  +60 12-335 3004</a
                >
              </li>
            </ul>
          </div>
          <div>
            <ul style="list-style-type: none; padding-left: 0">
              <li style="font-weight: 500">William Lau</li>
              <li>
                <a
                  href="mailto:williamlhh@mpoc.org.my"
                  style="text-decoration: none"
                >
                  williamlhh@mpoc.org.my
                </a>
              </li>

              <li>
                <a
                  href="https://wa.me/60168707250"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-weight: 500;
                    text-decoration: none;
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="green"
                    class="bi bi-whatsapp"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"
                    />
                  </svg>
                  +60 16-870 7250</a
                >
              </li>
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

    await transporter.sendMail(mailOptions).catch((e) => {
      throw new Error("Fail to send mail.");
    });

    return res.status(200).json({
      success: true,
      msg: "Atendee has been sent a confirmation e-mail.",
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

module.exports = { resendEmailOrd };
