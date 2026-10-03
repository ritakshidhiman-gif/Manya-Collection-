import express from "express";
import { configureApp } from "./server/_core/app";

const app = configureApp(express());

export default app;