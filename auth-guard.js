import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const isGuest=localStorage.getItem("copyshieldGuest")==="true";

onAuthStateChanged(auth,user=>{
  if(!user && !isGuest){
    window.location.href="index.html";
  }
});

document.querySelectorAll("[data-sign-out]").forEach(button=>{
  button.addEventListener("click",async()=>{
    localStorage.removeItem("copyshieldGuest");
    await signOut(auth);
    window.location.href="index.html";
  });
});
