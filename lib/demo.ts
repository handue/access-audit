// A paired fixture: the first page exercises all five rules; the second fixes them.
export const demoHtml = `<!doctype html>
<html lang="en">
<head><title>Fieldnotes — community workshop</title></head>
<body>
  <header><h1>Make room for everyone.</h1></header>
  <main>
    <img src="workshop.jpg">
    <h3>Join the next workshop</h3>
    <p>Small ideas. Shared possibilities.</p>
    <form>
      <input id="email" type="email" placeholder="Your email">
      <button type="submit"><svg aria-hidden="true"></svg></button>
    </form>
    <a href="/workshops">Click here</a>
  </main>
</body>
</html>`;
export const fixedHtml = `<!doctype html>
<html lang="en">
<head><title>Fieldnotes — community workshop</title></head>
<body>
  <header><h1>Make room for everyone.</h1></header>
  <main>
    <img src="workshop.jpg" alt="Participants collaborating at a workshop table">
    <h2>Join the next workshop</h2>
    <p>Small ideas. Shared possibilities.</p>
    <form>
      <label for="email">Email address</label>
      <input id="email" type="email" autocomplete="email">
      <button type="submit">Join the workshop</button>
    </form>
    <a href="/workshops">Explore upcoming workshops</a>
  </main>
</body>
</html>`;
