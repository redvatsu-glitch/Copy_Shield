import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);

const title=document.getElementById("authTitle");
const subtitle=document.getElementById("authSubtitle");
const submit=document.getElementById("authSubmit");
const toggle=document.getElementById("authModeToggle");
const guestBtn=document.getElementById("guestBtn");
const emailInput=document.getElementById("emailInput");
const passwordInput=document.getElementById("passwordInput");
const message=document.getElementById("authMessage");

let isCreatingAccount=false;

onAuthStateChanged(auth,user=>{
  if(user){
    localStorage.removeItem("copyshieldGuest");
    window.location.href="dashboard.html";
  }
});

function setMessage(text,type){
  message.innerText=text;
  message.classList.toggle("success",type==="success");
}

function setLoading(isLoading){
  submit.disabled=isLoading;
  toggle.disabled=isLoading;
  guestBtn.disabled=isLoading;
  submit.innerText=isLoading ? "Please wait..." : (isCreatingAccount ? "Create Account" : "Sign In");
}

function updateMode(){
  title.innerText=isCreatingAccount ? "Create account" : "Welcome back";
  subtitle.innerText=isCreatingAccount
    ? "Create a new CopyShield account to open the dashboard."
    : "Sign in to open your review dashboard.";
  submit.innerText=isCreatingAccount ? "Create Account" : "Sign In";
  toggle.innerText=isCreatingAccount ? "Already have an account? Sign in" : "Create a new account";
  passwordInput.autocomplete=isCreatingAccount ? "new-password" : "current-password";
  setMessage("");
}

toggle.addEventListener("click",()=>{
  isCreatingAccount=!isCreatingAccount;
  updateMode();
});

guestBtn.addEventListener("click",()=>{
  localStorage.setItem("copyshieldGuest","true");
  window.location.href="dashboard.html";
});

submit.addEventListener("click",async()=>{
  const email=emailInput.value.trim();
  const password=passwordInput.value;

  if(!email || !password){
    setMessage("Enter an email and password.");
    return;
  }

  if(password.length<6){
    setMessage("Password must be at least 6 characters.");
    return;
  }

  setLoading(true);
  setMessage("");
  localStorage.removeItem("copyshieldGuest");

  try {
    if(isCreatingAccount){
      await createUserWithEmailAndPassword(auth,email,password);
      setMessage("Account created. Opening dashboard...","success");
    }
    else {
      await signInWithEmailAndPassword(auth,email,password);
      setMessage("Signed in. Opening dashboard...","success");
    }

    window.location.href="dashboard.html";
  }
  catch(error){
    const errors={
      "auth/email-already-in-use":"An account already exists for this email.",
      "auth/invalid-email":"Enter a valid email address.",
      "auth/invalid-credential":"Invalid email or password.",
      "auth/user-not-found":"No account was found for this email.",
      "auth/wrong-password":"Invalid email or password.",
      "auth/weak-password":"Use a stronger password."
    };
    setMessage(errors[error.code] || "Authentication failed. Check your Firebase setup.");
  }
  finally {
    setLoading(false);
  }
});
