const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

app.use(bodyParser.json());
app.use(express.json());

app.use(express.static("./public"));

const AIRTABLE_API_KEY =
  "patnIFlyamWZtgthM.886ac387e5e38b76b059aa8c468abb0c7e7b3959917c7c993c619ce92c918057";

async function fetchRecord(tableId, recordId, AIRTABLE_BASE_ID) {
  try {
    const response = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}/${recordId}`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    // handleError(error);
    console.log(error);

    throw error;
  }
}

// Function to fetch a specific payload using the timestamp
async function fetchSpecificPayload(baseId, webhookId, timestamp) {
  try {
    const response = await axios.get(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    // Convert webhook timestamp to Date for comparison
    const webhookTime = new Date(timestamp);
    console.log("Looking for webhook timestamp:", webhookTime.toISOString());

    // Sort payloads by timestamp in descending order (newest first)
    const sortedPayloads = response.data.payloads.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Find the first payload that's within 1 second before the webhook timestamp
    const matchingPayload = sortedPayloads.find((payload) => {
      const payloadTime = new Date(payload.timestamp);
      const timeDiff = webhookTime - payloadTime; // positive if webhook is after payload
      console.log(
        `Comparing with payload timestamp: ${payload.timestamp}, diff: ${timeDiff}ms`
      );
      return timeDiff >= 0 && timeDiff <= 1000;
    });

    if (matchingPayload) {
      console.log(
        "Found matching payload with timestamp:",
        matchingPayload.timestamp
      );
      return matchingPayload;
    }

    console.log("No payload found matching webhook timestamp");
    return null;
  } catch (error) {
    // handleError(error);
    console.log(error);
    throw error;
  }
}

async function processWebhook(req, res) {
  console.log("Webhook received:", req.body);

  const baseId = req.body.base.id;
  const webhookId = req.body.webhook.id;
  const timestamp = req.body.timestamp;
  const targetFieldId = "fldEpaZERjNqdVqIA";
  let baseName;
  let recordDetails;
  try {
    const payload = await fetchSpecificPayload(baseId, webhookId, timestamp);
    if (!payload) {
      console.log("No matching payload found for timestamp:", timestamp);
      return res.sendStatus(200);
    }

    const changedTables = payload.changedTablesById;
    if (!changedTables) {
      console.log("No changed tables in payload");
      return res.sendStatus(200);
    }

    const tableChanges = changedTables["tblgMDhb1xvmg72ha"];
    if (!tableChanges) {
      console.log("No changes in target table");
      return res.sendStatus(200);
    }

    const changedRecords = tableChanges.changedRecordsById;
    if (!changedRecords) {
      console.log("No changed records");
      return res.sendStatus(200);
    }

    for (const recordId in changedRecords) {
      const recordChanges = changedRecords[recordId];
      const changedFieldIds = recordChanges?.current?.cellValuesByFieldId
        ? Object.keys(recordChanges.current.cellValuesByFieldId)
        : [];

      if (!changedFieldIds.includes(targetFieldId)) {
        console.log(`Skipping record ${recordId} - target field not changed`);
        continue;
      }

      console.log(`Processing record ${recordId} - target field was changed`);

      try {
        recordDetails = await fetchRecord(
          "tblgMDhb1xvmg72ha",
          recordId,
          baseId
        );
        console.log("Fetched record details:", recordDetails);
        const mockupText = recordDetails?.fields?.["Mokcup Text"];
        console.log("mockupText", mockupText);
        await runPup(mockupText);
      } catch (error) {
        console.error(`Failed to fetch record ${recordId}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to process webhook:", error);
    return res.sendStatus(500);
  }

  console.log("===============Execution Completed=============");
  res.send(recordDetails);
}

app.post("/airtable-webhook", processWebhook);

app.get('/new-req' ,async (req ,res) => {
  const data =  await runPup("Someone name");
  return res.status(400).json({msg : "api successfully called"})
})



app.listen(5000, () => {
  console.log("App is running");
});

const waitForSeconds = (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const runPup = async (text) => {
  try {

    const executablePath = await chromium.executablePath();
    console.log("Chromium executable path:", executablePath);


    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    console.log('browser launched')
    const page = await browser.newPage();

    await page.goto("https://mockup.epiccraftings.com/");
    await page.setViewport({ width: 1900, height: 1024 });

    await page.waitForSelector(".form-control.txt_area_1");

    console.log('selector found 1')

    await page.evaluate(() => {
      const textarea = document.querySelector(".form-control.txt_area_1");
      if (textarea) textarea.value = "";
    });

    console.log('selector found 2')
    await page.type(".form-control.txt_area_1", "Bilal Ghauriiii");

    await page.evaluate(async () => {
      // Get all divs with the class 'font-div' and filter those with the 'data-path' attribute
      let fontDivs = Array.from(
        document.querySelectorAll("div.font-div[data-path]")
      );
      fontDivs = fontDivs.slice(1, 8);
      fontDivs.forEach((div) => div.click());
    });
    console.log('selector found 3')
    await page.waitForSelector("#takeScreenShoot");

    console.log('selector found 4')

    // Get the bounding box of the div with the ID 'takeScreenShoot'
    const clip = await page.evaluate(() => {
      const element = document.querySelector("#takeScreenShoot");
      if (element) {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      }
      return null;
    });

    console.log('selector found 5')

    function generateUniqueId() {
      return "id-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    }

    console.log('selector found 6')

    const screenShotName = `screenshot${generateUniqueId()}`;
    const screenshot_image_name = `${screenShotName}.png`;
    const screenshotPath = path.join(
      __dirname,
      "public",
      "screenshots",
      screenshot_image_name
    );

    console.log('selector found 7')
    if (clip) {
      await waitForSeconds(2);
      await page.screenshot({
        path: screenshotPath,
        clip,
      });

      console.log("Screenshot of #takeScreenShoot saved as 'screenshot.png'.");
    } else {
      console.error("Element with ID 'takeScreenShoot' not found.");
    }

    console.log('selector found 8')
    //   await page.screenshot({ path: `screenshot_dfdsfs.png`, fullPage: true });

    // await waitForSeconds(100);

    await browser.close();

    const pdfPath = path.join(__dirname, "public", "sample", "sample.pdf");
    const existingPdfBytes = fs.readFileSync(pdfPath);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Embed the screenshot as an image
    const imgBytes = fs.readFileSync(screenshotPath);
    const img = await pdfDoc.embedPng(imgBytes);

    // Get the dimensions of the second page
    const pages = pdfDoc.getPages();
    const pageToReplace = pages[1]; // Index 1 corresponds to the second page
    const { width: pageWidth, height: pageHeight } = pageToReplace.getSize();

    // Calculate the scaled height to maintain aspect ratio of the image
    const imgDims = img.scale(pageWidth / img.width);

    // Draw the image on the second page, clearing the existing content
    pageToReplace.drawImage(img, {
      x: 0,
      y: pageHeight - imgDims.height, // Align the image to the top of the page
      width: pageWidth,
      height: imgDims.height,
    });

    // Serialize the updated PDF document to bytes
    const pdfBytes = await pdfDoc.save();

    console.log('pdf is also save in memory')

    // Write the new PDF file to disk
    const updatedPdfPath = path.join(
      __dirname,
      "public",
      "uploads",
      `${screenShotName}.pdf`
    );

    console.log('pdf is also save in memory 2')

    fs.writeFileSync(updatedPdfPath, pdfBytes);
    console.log(
      `Updated PDF created with the screenshot replacing page 2 at: ${updatedPdfPath}`
    );
  } catch (error) {
    console.log("Puppeteer error", error);
  }
};

// runPup();
