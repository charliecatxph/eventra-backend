const firestore = require("../deps/firestore");
const { Timestamp } = require("firebase-admin/firestore");
const fs = require("fs");
const cloudinary = require("../deps/cloudinary");

async function uploadOrdEvent(req, res) {
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

module.exports = { uploadOrdEvent };
