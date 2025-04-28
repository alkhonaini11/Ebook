const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  await page.goto('https://academy.bankruptcy.gov.sa/ebook/bankruptcy_practitioners/Book_Folder_U15_V2.0/index.html#/reader', {
    waitUntil: 'networkidle2',
    timeout: 0
  });

  await new Promise(resolve => setTimeout(resolve, 5000)); // ننتظر أول تحميل

  console.log('🚀 بدأ السحب...');

  if (!fs.existsSync('./images')) {
    fs.mkdirSync('./images');
  }

  const doc = new PDFDocument({ autoFirstPage: false });
  const pdfStream = fs.createWriteStream('الكتاب_الإلكتروني_final.pdf');
  doc.pipe(pdfStream);

  const totalChapters = 5; // عدل حسب عدد الصفحات

  for (let i = 1; i <= totalChapters; i++) {
    console.log(`📖 معالجة الفصل ${i}`);

    const chapterText = await page.$eval('#epubContent', el => el.innerText);

    doc.addPage({ size: 'A4', margin: 50 });
    doc.font('Times-Roman').fontSize(18).text(`فصل ${i}`, { align: 'center' });
    doc.moveDown();
    doc.font('Times-Roman').fontSize(14).text(chapterText, { align: 'right' });
    doc.moveDown();

    const images = await page.$$eval('#epubContent img', imgs => imgs.map(img => img.src));

    for (let j = 0; j < images.length; j++) {
      const imgURL = images[j];
      const imgPath = path.resolve(__dirname, 'images', `chapter${i}_img${j}.png`);
      const viewSource = await page.goto(imgURL);
      fs.writeFileSync(imgPath, await viewSource.buffer());
      
      doc.addPage({ size: 'A4', margin: 50 });
      doc.image(imgPath, {
        fit: [500, 700],
        align: 'center',
        valign: 'center'
      });
      doc.moveDown();
    }

    await page.keyboard.press('ArrowLeft');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  doc.end();
  await browser.close();

  console.log('✅ تم إنشاء ملف PDF بالكامل!');
})();
