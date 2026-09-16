KRAKEN V16.9 CERTIFICATE CARDS

Upload certificate-cards.css and certificate-cards.js to the repository root.

In dashboard.html add AFTER your existing dashboard CSS:
<link rel="stylesheet" href="certificate-cards.css">

Then add AFTER dashboard.js:
<script src="certificate-cards.js"></script>

Keep the existing element with id="certificateList".

Features:
- 3 certificate cards per row on desktop
- 2 on tablet, 1 on mobile
- automatic cards for every row in public.certificates
- search and newest/oldest/A-Z sorting
- miniature certificate preview
- issue date, score and certificate code
- copy certificate code
- View Certificate
- PDF opens the certificate page, where Print / Save PDF already works

No SQL required.
