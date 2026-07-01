import fetch from 'node-fetch';

async function test() {
  const res = await fetch("http://localhost:3000/api/agent3/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Hello, test!",
      history: [],
      responseStyle: "direct"
    })
  });

  console.log("Status:", res.status);
  console.log("Headers:", res.headers.raw());
  
  if (res.body) {
    res.body.on('data', (chunk) => {
      console.log("CHUNK:", chunk.toString());
    });
    res.body.on('end', () => {
      console.log("Stream ended.");
    });
  }
}
test();
