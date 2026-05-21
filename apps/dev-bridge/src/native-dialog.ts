import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function pickDirectory(
  prompt = "Select book folder",
): Promise<string | null> {
  const platform = process.platform;

  if (platform === "darwin") {
    return pickDirectoryMac(prompt);
  }
  if (platform === "linux") {
    return pickDirectoryLinux(prompt);
  }
  if (platform === "win32") {
    return pickDirectoryWindows(prompt);
  }

  return null;
}

async function pickDirectoryMac(prompt: string): Promise<string | null> {
  const escaped = prompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `POSIX path of (choose folder with prompt "${escaped}")`;
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script]);
    const chosen = stdout.trim();
    return chosen.length > 0 ? chosen : null;
  } catch {
    return null;
  }
}

async function pickDirectoryLinux(prompt: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("zenity", [
      "--file-selection",
      "--directory",
      `--title=${prompt}`,
    ]);
    const chosen = stdout.trim();
    return chosen.length > 0 ? chosen : null;
  } catch {
    return null;
  }
}

async function pickDirectoryWindows(prompt: string): Promise<string | null> {
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '${prompt.replace(/'/g, "''")}'
if ($dialog.ShowDialog() -eq 'OK') { Write-Output $dialog.SelectedPath }
`;
  try {
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      ps,
    ]);
    const chosen = stdout.trim();
    return chosen.length > 0 ? chosen : null;
  } catch {
    return null;
  }
}

export function nativeDialogSupported(): boolean {
  return process.platform === "darwin" ||
    process.platform === "linux" ||
    process.platform === "win32";
}
