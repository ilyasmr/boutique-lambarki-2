$ErrorActionPreference = "Stop"

$TaskName = "BoutiqueLambarkiDailyBackup"
$Description = "Runs the backup script for Boutique Lambarki every 24 hours at 11:55 PM"
$ScriptPath = "C:\Users\PRO\Downloads\boutique-lambarki-2\backup.ps1"

Write-Output "Creating Scheduled Task: $TaskName"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
$Trigger = New-ScheduledTaskTrigger -Daily -At "11:55 PM"

# Register the task to run as the current user
Register-ScheduledTask -TaskName $TaskName -Description $Description -Action $Action -Trigger $Trigger -Force

Write-Output "Daily Backup task registered successfully! It will run every day at 11:55 PM."
