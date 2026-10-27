'use strict';
const https = require('node:https');
const { compareVersions } = require('./version.cjs');
const RELEASE_API = 'https://api.github.com/repos/zeldovichmok-alt/paybeat/releases/latest';
const RELEASE_PAGE = 'https://github.com/zeldovichmok-alt/paybeat/releases';

// No profile, salary, cookie, token or device identifier is sent with this request.
function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    let request, settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(deadline);
      if (error) reject(error); else resolve(value);
    };
    const deadline = setTimeout(() => { finish(new Error('timeout')); request?.destroy(); }, 6000);
    try {
      request = https.get(RELEASE_API, { headers: { 'User-Agent': 'PayBeat-Desktop', Accept: 'application/vnd.github+json' } }, response => {
        if (response.statusCode !== 200) { response.resume(); finish(new Error('release unavailable')); return; }
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += chunk;
          if (Buffer.byteLength(body, 'utf8') > 512 * 1024) { finish(new Error('oversized response')); response.destroy(); request.destroy(); }
        });
        response.on('aborted', () => finish(new Error('response interrupted')));
        response.on('error', error => finish(error));
        response.on('end', () => {
          try {
            const release = JSON.parse(body);
            if (!/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release?.tag_name) || release.draft || release.prerelease) throw new Error('invalid stable release');
            finish(null, {
              version: release.tag_name.replace(/^v/, ''),
              notes: String(release.body || release.name || '请在发布页查看更新内容。').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 1600),
              // Construct the destination from our own repository, not arbitrary response URLs.
              url: RELEASE_PAGE + '/tag/' + encodeURIComponent(release.tag_name)
            });
          } catch (error) { finish(error); }
        });
      });
      request.on('error', error => finish(error));
    } catch (error) { finish(error); }
  });
}

function createUpdateChecker({ currentVersion, showMessage, openExternal }) {
  let checking = false;
  return async function checkForUpdates() {
    if (checking) return;
    checking = true;
    try {
      let release;
      try { release = await fetchLatestRelease(); }
      catch {
        await showMessage({ type: 'warning', title: '检查更新失败', message: '暂时无法获取新版本信息。', detail: `当前版本 v${currentVersion}\n请稍后再试，计薪和桌宠会继续运行。`, buttons: ['知道了'], noLink: true });
        return;
      }
      const comparison = compareVersions(release.version, currentVersion), hasUpdate = comparison > 0;
      const result = await showMessage({
        type: 'info', title: hasUpdate ? '发现 PayBeat 新版本' : comparison === 0 ? 'PayBeat 已是最新版本' : '当前使用本地新版',
        message: `当前版本 v${currentVersion} · 最新正式版 v${release.version}`,
        detail: hasUpdate ? `${release.notes}\n\n退出 PayBeat 后，将新包解压到新文件夹再打开。本机设置会保留。` : comparison === 0 ? '暂时没有需要更新的版本。' : '本地版本比已发布版本更新，无需下载旧版。',
        buttons: hasUpdate ? ['打开下载页', '稍后再说'] : ['知道了'], defaultId: 0, cancelId: hasUpdate ? 1 : 0, noLink: true
      });
      if (hasUpdate && result.response === 0) {
        try { await openExternal(release.url); }
        catch { await showMessage({ type: 'warning', title: '下载页未能打开', message: '请用浏览器打开 PayBeat 发布页。', detail: release.url, buttons: ['知道了'], noLink: true }); }
      }
    } finally { checking = false; }
  };
}
module.exports = { createUpdateChecker, fetchLatestRelease, RELEASE_API };
