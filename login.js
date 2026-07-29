const form = $("#loginForm");
const feedback = $("#loginFeedback");
const button = $("#loginButton");

form.addEventListener("submit", async event => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = "Signing in…";
  feedback.textContent = "";

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value
    });

    if (error) throw error;

    const returnTo = localStorage.getItem("kmtReturnTo") || "admin.html";
    localStorage.removeItem("kmtReturnTo");
    location.href = returnTo;
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Sign in";
  }
});

(async function redirectIfSignedIn() {
  const session = await getCurrentSession();
  if (session) location.href = "admin.html";
})();
