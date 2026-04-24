
$objects = git rev-list --objects --all | ForEach-Object {
    $parts = $_ -split ' ', 2
    $sha = $parts[0]
    $name = if ($parts.Length -gt 1) { $parts[1] } else { "" }
    $info = git cat-file -s $sha
    [PSCustomObject]@{
        SHA = $sha
        Size = [int64]$info
        Path = $name
    }
}
$objects | Sort-Object Size -Descending | Select-Object -First 20 | Format-Table -AutoSize
