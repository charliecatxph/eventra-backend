const firestore = require("../deps/firestore");
const fs = require("fs");
const { Timestamp } = require("firebase-admin/firestore");
const cloudinary = require("../deps/cloudinary");

async function uploadBizMatch(req, res) {
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

module.exports = { uploadBizMatch };
