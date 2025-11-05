import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

import cors from "cors";

const app = express();
const port = 3005;

app.use(
  cors({
    origin: "http://localhost:3000", 
    methods: ["GET", "POST", "PUT", "DELETE"], 
    credentials: true, 
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth)); 

app.use(express.json());

app.get("/api/me", async (req, res) => {
 	const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
 	return res.json(session);
});

app.get("/device" , async (req, res) => {
  const {user_code} = req.params;

  res.redirect(`http://localhost:3000/device?user_code=${user_code}`);
})

app.listen(port, () => {

	console.log(`Example app listening on port ${port}`);
});

