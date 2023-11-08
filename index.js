const app = require("express")();

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get("/api", async (req, res) => {
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    let browser = await puppeteer.launch(options);

    let page = await browser.newPage();
     // Điều hướng đến URL của trang web bạn muốn kiểm tra
    await page.goto('https://muasamcong.mpi.gov.vn/web/guest/contractor-selection?render=index', {
      waitUntil: 'networkidle0', // Chờ cho đến khi không có request mạng nào hoặc ít nhất 500ms sau lần cuối request mạng
    });

    // Kích hoạt Request Interception
    await page.setRequestInterception(true);
    
    let blockRequests = false;

    // Xử lý sự kiện trước request
    page.on('request', (request) => {
      if (blockRequests) {
          request.abort(); // Chặn request nếu biến blockRequests là true
      } else if (request.url().includes('https://muasamcong.mpi.gov.vn/o/egp-portal-contractor-selection-v2/services/smart/search')) {
          blockRequests = true; // Bắt đầu chặn request sau request cụ thể
          request.abort(); // Chặn request đầu tiên
      } else {
          request.continue(); // Cho phép các request khác đi tiếp
      }
    });

      page.on('response', async (response) => {
          const url = response.url();
          const status = response.status();
          // Kiểm tra các response và xử lý dữ liệu nếu cần
          if (url.includes('https://www.google.com/recaptcha/api2/reload') && status === 200) {
              // Tiếp tục với xử lý dữ liệu theo nhu cầu của bạn.
              const responseText = await response.text(); // Chờ cho đến khi response.text() được giải quyết
              const cleanedResponse = responseText.replace(")]}'", ''); // Thực hiện việc replace() trên nội dung text
              const jsonData = JSON.parse(cleanedResponse); // Phân tích dữ liệu JSON từ văn bản
              const jsonData1 = {
                  token: jsonData[1],
              };
              
              res.json(jsonData1);
              //   fs.writeFileSync('./data/reload/reload.json', JSON.stringify(jsonData[1], null, 2));
          }
      });

       // Điều hướng đến URL của trang web bạn muốn kiểm tra
       await page.goto('https://muasamcong.mpi.gov.vn/web/guest/contractor-selection?render=index', {
        waitUntil: 'networkidle0', // Chờ cho đến khi không có request mạng nào hoặc ít nhất 500ms sau lần cuối request mạng
        });
    
        // Chờ cho các yêu cầu và phản hồi kết thúc
        await page.waitForTimeout(5000);

  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
