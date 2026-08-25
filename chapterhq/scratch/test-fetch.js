const http = require("http");

function testFetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 200)
        });
      });
    }).on("error", reject);
  });
}

async function main() {
  const urls = [
    "http://localhost:3005/api/events/6a8d72a2e3dcf4f50d0cc853",
    "http://localhost:3005/api/events/6a8d72a2e3dcf4f50d0cc853/attendance",
    "http://localhost:3005/api/events/6a8d72a2e3dcf4f50d0cc853/registrations?limit=100"
  ];
  for (const url of urls) {
    try {
      console.log(`\nTesting ${url}...`);
      const res = await testFetch(url);
      console.log(`Responded with status:`, res.status);
      console.log("Content-Type:", res.headers["content-type"]);
      console.log("Body snippet:", res.body);
    } catch (e) {
      console.log(`Failed:`, e.message);
    }
  }
}

main();
