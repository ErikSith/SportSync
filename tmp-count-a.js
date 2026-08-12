const fs = require("fs");
const q = fs.readFileSync("c:/Users/eriks/Desktop/SportSync/tmp-bulk-events-a.sql", "utf8");
const start = q.indexOf("$json$") + 6;
const end = q.indexOf("$json$", start);
const arr = JSON.parse(q.slice(start, end));
console.log(JSON.stringify({ rows: arr.length, bytes: q.length }));
