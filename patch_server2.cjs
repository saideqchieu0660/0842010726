const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(/res = await executeRouted\(req, contents, config\);/, 'res = await CrossProviderRotator.execute(contents, config);');
server = server.replace(/stream = executeStreamRouted\(req, contents, config\);/, 'stream = CrossProviderRotator.executeStream(contents, config);');

fs.writeFileSync('server.ts', server);
