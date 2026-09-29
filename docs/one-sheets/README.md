# One-sheets

`speaking-one-sheet.html` is the source for `public/assets/Speaking_One_Sheet.pdf`.
Edit the HTML, then re-render and re-pin:

```bash
google-chrome --headless=new --disable-gpu --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw --virtual-time-budget=5000 \
  --print-to-pdf="$PWD/public/assets/Speaking_One_Sheet.pdf" \
  "file://$PWD/docs/one-sheets/speaking-one-sheet.html"
sha256sum public/assets/Speaking_One_Sheet.pdf
```

Then update the `Speaking_One_Sheet.pdf` entry in `tests/publicDownloads.test.ts`
(`REVIEWED_UNSCANNED`) with the new sha256 and a one-line review of what the file
now says. The PDF is served but no test can read its text, so the hash pins the
reviewed bytes.

`tests/speakingSheet.test.ts` checks the HTML against the `SPEAKING` and
`CONTACT_INTENTS` constants and checks that the PDF carries a real title. Keep the
page to one Letter sheet; check the render before committing.
