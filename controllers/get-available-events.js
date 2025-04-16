const firestore = require("../deps/firestore");
const { Timestamp } = require("firebase-admin/firestore");

async function getAvailableEvents(req, res) {
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
}

module.exports = { getAvailableEvents };
