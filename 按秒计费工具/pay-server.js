const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = Number(process.env.PAYBEAT_PORT || 8876);
const root = __dirname;
const page = path.join(root, 'index.html');
const mainToolPage = path.join(root, 'pay-by-second.html');
const experimentalPage = path.join(root, 'pay-by-second-readymag.html');

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address);
}

const server = http.createServer((req, res) => {
  const requested = (req.url || '/').split('?')[0];
  const file = requested === '/' || requested === '/index.html' ? page : path.join(root, path.basename(requested));
  if (file !== page && file !== mainToolPage && file !== experimentalPage) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to read page'); return; }
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`电脑打开: http://localhost:${port}/index.html`);
  console.log(`主工具副本: http://localhost:${port}/pay-by-second.html`);
  console.log(`默认分享小窗: http://localhost:${port}/index.html?popup=1`);
  console.log(`创意实验版（可随时撤回）: http://localhost:${port}/pay-by-second-readymag.html`);
  for (const address of lanAddresses()) {
    console.log(`手机同一 Wi-Fi 打开: http://${address}:${port}/index.html`);
    console.log(`手机/朋友默认小窗: http://${address}:${port}/index.html?popup=1`);
  }
  console.log('保持此窗口运行即可让手机访问；按 Ctrl+C 停止。');
});
