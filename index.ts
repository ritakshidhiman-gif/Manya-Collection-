import express from "express";
import { configureApp } from "./server/_core/app.ts";

const app = configureApp(express());

export default app;