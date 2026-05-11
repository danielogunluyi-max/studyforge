$lines = Get-Content src/app/dashboard/page.tsx
for ($i=1137; $i -lt 1154; $i++) {
    $ln = $lines[$i]
    $num = $i + 1
    Write-Output "$num: $ln"
}
