const firestore = require("../deps/firestore");
const cloudinary = require("../deps/cloudinary");

async function deleteEventOrd(req, res) {
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
}

module.exports = { deleteEventOrd };
