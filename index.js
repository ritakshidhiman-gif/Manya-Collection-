import express from "express";
import { configureApp } from "./dist/vercel-app.js";

const app = configureApp(express());

export default app;