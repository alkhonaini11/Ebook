const puppeteer = require('puppeteer');
const fs = require('fs');
const PDFDocument = require('pdfkit');

(async () => {
  console.log("🚀 السكربت بدأ بنجاح!");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://academy.bankruptcy.gov.sa/ebook/bankruptcy_practitioners/Book_Folder_U15_V2.0/index.html#/reader', { waitUntil: 'networkidle0' });

  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream('الكتاب_الإلكتروني_final.pdf');
  doc.pipe(writeStream);

  let pageNum = 1;

  while (true) {
    try {
      await page.waitForSelector('#epubContent', { timeout: 5000 });

      // سحب النصوص والصور
      const { textContent, imgSrcs } = await page.evaluate(() => {
        const text = document.querySelector('#epubContent')?.innerText || '';
        const images = Array.from(document.querySelectorAll('#epubContent img')).map(img => img.src);
        return { textContent: text, imgSrcs: images };
      });

      // أضف النص للـ PDF
      doc.addPage();
      doc.fontSize(14).text(textContent, { align: 'right' });

      // أضف الصور للـ PDF
      for (let img of imgSrcs) {
        try {
          const imageBuffer = await page.goto(img).then(res => res.buffer());
          doc.addPage();
          doc.image(imageBuffer, { fit: [500, 700], align: 'center', valign: 'center' });
        } catch (e) {
          console.log(`⚠️ فشل تحميل صورة: ${img}`);
        }
      }

      console.log(`✅ أنهيت صفحة ${pageNum}`);

      // اضغط التالي
      const nextButton = await page.$('#nextPage');
      if (!nextButton) break;

      await nextButton.click();
      await page.waitForTimeout(3000); // انتظر تحميل الصفحة

      pageNum++;

    } catch (e) {
      console.log("🚪 مافي صفحات أكثر، وقف السحب");
      break;
    }
  }

  doc.end();
  await browser.close();
  console.log("📚 تم إنشاء الكتاب بنجاح!");

})();
