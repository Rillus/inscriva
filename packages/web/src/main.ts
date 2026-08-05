import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}

mount(App, { target: document.getElementById("app")! });
