$dir = "c:\Users\hp\Desktop\autostock-frontend"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\AutoStock ERP.lnk")
$Shortcut.TargetPath = "$dir\AutoStock.vbs"
$Shortcut.WorkingDirectory = $dir
$Shortcut.Description = "AutoStock ERP"
$Shortcut.Save()
Write-Output "OK"
