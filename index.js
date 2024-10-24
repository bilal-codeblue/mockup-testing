const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const axios = require('axios')
app.use(bodyParser.json());
app.use(express.json());


const AIRTABLE_API_KEY = 'patnIFlyamWZtgthM.886ac387e5e38b76b059aa8c468abb0c7e7b3959917c7c993c619ce92c918057';


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
    console.log(error)

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
    console.log(error)
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
app.listen(5000, () => {
  console.log("App is running");
});

const puppeteer = require("puppeteer");

const waitForSeconds = (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const runPup = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://mockup.epiccraftings.com/");
  await page.setViewport({ width: 1900, height: 1024 });

  await page.waitForSelector(".form-control.txt_area_1");

  await page.evaluate(() => {
    const textarea = document.querySelector(".form-control.txt_area_1");
    if (textarea) textarea.value = "";
  });

  await page.type(".form-control.txt_area_1", "bilal ghauri");

  await page.evaluate(async () => {
    // Get all divs with the class 'font-div' and filter those with the 'data-path' attribute
    let fontDivs = Array.from(
      document.querySelectorAll("div.font-div[data-path]")
    );
    fontDivs = fontDivs.slice(1, 8);
    fontDivs.forEach((div) => div.click());
  });

  //   await page.evaluate(() => {
  //     const findSection = document.querySelector('section.bg-white.px-1')
  //     if(findSection){
  //         findSection.remove()
  //     }
  //   });

  //   await waitForSeconds(2);

  await page.waitForSelector("#takeScreenShoot");

  // Get the bounding box of the div with the ID 'takeScreenShoot'
  const clip = await page.evaluate(() => {
    const element = document.querySelector("#takeScreenShoot");
    if (element) {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }
    return null;
  });

  if (clip) {
    await waitForSeconds(2);
    await page.screenshot({
      path: "div_screenshot.png",
      clip,
    });

    console.log(
      "Screenshot of #takeScreenShoot saved as 'div_screenshot.png'."
    );
  } else {
    console.error("Element with ID 'takeScreenShoot' not found.");
  }

  //   await page.screenshot({ path: `screenshot_dfdsfs.png`, fullPage: true });

  await waitForSeconds(100);

  await browser.close();
};

// runPup();
