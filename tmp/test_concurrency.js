async function test() {
  console.log("Starting 100 concurrent requests...");
  const p = [];
  for (let i = 0; i < 100; i++) {
    p.push(fetch("http://localhost:4001/api/db/hero_stats").then(r => r.status));
  }
  const results = await Promise.all(p);
  const counts = results.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  console.log("Results:", counts);
}
test();
