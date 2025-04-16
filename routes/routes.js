const { attendOrdEv } = require("../controllers/attend-ord-ev");
const { deleteEventOrd } = require("../controllers/delete-event-ord");
const { fetchEvents } = require("../controllers/fetch-events");
const { fetchNotifications } = require("../controllers/fetch-notifications");
const {
  fetchOrdEventAnalytics,
} = require("../controllers/fetch-ord-event-analytics");
const { fetchOrdEvent } = require("../controllers/fetch-ord-event");
const { getAtendees } = require("../controllers/get-atendees");
const { getAvailableEvents } = require("../controllers/get-available-events");
const { getOrdEventData } = require("../controllers/get-ord-event-data");
const { getUserData } = require("../controllers/get-user-data");
const { login } = require("../controllers/login");
const { logout } = require("../controllers/logout");
const { register } = require("../controllers/register");
const { uploadBizMatch } = require("../controllers/upload-biz-match");
const { uploadOrdEvent } = require("../controllers/upload-ord-event");

const jwt = require("jsonwebtoken");
const multer = require("multer");
const express = require("express");
const { deleteAtendee } = require("../controllers/delete-atendee");
const { updateAtendeeOrg } = require("../controllers/update-atendee-org");
const { resendEmailOrd } = require("../controllers/resend-email-ord");
const router = express.Router();

require("dotenv").config();
const SECRET_ACCESS = process.env.JWT_ACCESS;
const SECRET_REFRESH = process.env.JWT_REFRESH;

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

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({ storage });

router.post("/attend-ord-ev", attendOrdEv);
router.post("/delete-event-ord", protectedRoute, deleteEventOrd);
router.post("/delete-atendee", protectedRoute, deleteAtendee);
router.post("/fetch-events", protectedRoute, fetchEvents); // this is protected
router.post("/fetch-notifications", protectedRoute, fetchNotifications); // this is protected
router.post("/fetch-ord-event-analytics", fetchOrdEventAnalytics);
router.post("/fetch-ord-event", fetchOrdEvent);
router.post("/get-atendees", protectedRoute, getAtendees);
router.post("/get-available-events", getAvailableEvents);
router.post("/get-ord-event-data", getOrdEventData);
router.post("/get-user-data", getUserData);
router.post("/login", login);
router.post("/logout", logout);
router.post("/register", upload.single("logo"), register);
router.post("/resend-email-ord", protectedRoute, resendEmailOrd);
router.post("/update-atendee-org", protectedRoute, updateAtendeeOrg);
router.post(
  "/upload-biz-match",
  protectedRoute,
  upload.array("logo"),
  uploadBizMatch
);
router.post(
  "/upload-ord-event",
  protectedRoute,
  upload.single("coverFile"),
  uploadOrdEvent
);

module.exports = router;
