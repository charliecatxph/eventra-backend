const firestore = require("../deps/firestore");
const cloudinary = require("../deps/cloudinary");

async function deleteAtendee(req, res) {
  const { id, qrId } = req.body;
  try {
    await firestore
      .collection("atendee-org")
      .doc(id)
      .delete()
      .catch((e) => {
        throw new Error("Fail to delete atendee.");
      });

    await cloudinary.uploader.destroy(qrId).catch((e) => {
      throw new Error("Fail to delete public QR.");
    });

    return res.status(200).json({
      success: true,
      msg: "Atendee has been deleted.",
      err: "",
    });
  } catch (e) {
    res.status(403).json({
      success: false,
      msg: "",
      err: "Error in deleting atendee.",
    });
  }
}

module.exports = { deleteAtendee };
