param(
  [string]$Workspace = "V:\VinsSoftware\Fiip"
)

$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Normalize-PathList {
  param([string[]]$Items)

  $seen = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $out = [System.Collections.Generic.List[string]]::new()
  $removed = [System.Collections.Generic.List[object]]::new()

  foreach ($item in $Items) {
    if ([string]::IsNullOrWhiteSpace($item)) { continue }

    $path = $item.Trim().Trim('"')
    while ($path.Length -gt 3 -and ($path.EndsWith("\") -or $path.EndsWith("/"))) {
      $path = $path.Substring(0, $path.Length - 1)
    }

    if ($path.Length -eq 0) { continue }

    $expanded = [Environment]::ExpandEnvironmentVariables($path)
    $key = $expanded.TrimEnd("\", "/").ToLowerInvariant()

    if (-not (Test-Path -LiteralPath $expanded)) {
      $removed.Add([pscustomobject]@{ reason = "missing"; value = $path }) | Out-Null
      continue
    }

    if (-not $seen.Add($key)) {
      $removed.Add([pscustomobject]@{ reason = "duplicate"; value = $path }) | Out-Null
      continue
    }

    $out.Add($path) | Out-Null
  }

  return [pscustomobject]@{
    entries = $out.ToArray()
    removed = $removed.ToArray()
  }
}

if (-not (Test-IsAdmin)) {
  throw "Ce script doit être lancé depuis PowerShell en administrateur."
}

if (-not (Test-Path -LiteralPath $Workspace)) {
  New-Item -ItemType Directory -Path $Workspace -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $Workspace "path-machine-backup-$timestamp.json"
$current = [Environment]::GetEnvironmentVariable("Path", "Machine")

[pscustomobject]@{
  created_at = (Get-Date).ToString("o")
  scope = "Machine"
  path = $current
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $backupPath -Encoding UTF8

$normalized = Normalize-PathList -Items ($current -split ";")
$newPath = $normalized.entries -join ";"

[Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")

Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("user32.dll", SetLastError=true, CharSet=System.Runtime.InteropServices.CharSet.Auto)]
public static extern System.IntPtr SendMessageTimeout(System.IntPtr hWnd, uint Msg, System.UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out System.UIntPtr lpdwResult);
'@
$result = [UIntPtr]::Zero
[void][Win32.NativeMethods]::SendMessageTimeout([IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, "Environment", 0x0002, 5000, [ref]$result)

[pscustomobject]@{
  backup = $backupPath
  before_entries = (($current -split ";") | Where-Object { $_.Trim() }).Count
  after_entries = $normalized.entries.Count
  removed = $normalized.removed
  machine_path_length = $newPath.Length
} | ConvertTo-Json -Depth 6
