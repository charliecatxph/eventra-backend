require("dotenv").config();
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

initializeApp({
  credential: cert(JSON.parse(process.env.SERVICE_ACCOUNT)),
});

const firestore = getFirestore();

module.exports = firestore;
