using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class Launcher
{
    [STAThread]
    private static void Main()
    {
        var root = AppDomain.CurrentDomain.BaseDirectory;
        var app = Path.Combine(root, "本地桌宠", "PayBeat.exe");
        if (!File.Exists(app))
        {
            MessageBox.Show("请先完整解压 PayBeat 压缩包，并把本地桌宠文件夹和打开 PayBeat.exe 放在一起。", "PayBeat", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }
        try { Process.Start(new ProcessStartInfo(app) { WorkingDirectory = Path.GetDirectoryName(app), UseShellExecute = true }); }
        catch (Exception error) { MessageBox.Show("PayBeat 暂时无法启动：" + error.Message, "PayBeat", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }
}
