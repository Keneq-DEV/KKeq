$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$lib = Join-Path $root "lib"
$configPath = Join-Path $root "config.json"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("kkeq-setup-" + [guid]::NewGuid().ToString("N"))
$text = @{ error = "Setup failed:" }

New-Item -ItemType Directory -Force -Path $lib, $temp | Out-Null

function Save-Config($Config) {
    $json = $Config | ConvertTo-Json -Depth 10
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($configPath, $json, $utf8WithoutBom)
}

function Download-File([string]$Url, [string]$Destination) {
    Write-Host "$($text.downloading) $Url"
    Invoke-WebRequest -Uri $Url -OutFile $Destination
}

try {
    $config = [ordered]@{}
    if (Test-Path -LiteralPath $configPath) {
        $existingConfig = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        if ($existingConfig -is [System.Collections.IDictionary]) {
            foreach ($key in $existingConfig.Keys) {
                $config[$key] = $existingConfig[$key]
            }
        }
        elseif ($null -ne $existingConfig) {
            foreach ($property in $existingConfig.PSObject.Properties) {
                $config[$property.Name] = $property.Value
            }
        }
    }

    if ($config.lang -notin @("es", "en", "ru", "zh")) {
        Write-Host ""
        Write-Host "Choose the KKeq interface language / Seleccione idioma / Выберите язык / 选择语言:"
        Write-Host "  [1] Español"
        Write-Host "  [2] English"
        Write-Host "  [3] Русский"
        Write-Host "  [4] 中文"
        do {
            $selection = Read-Host "Choose 1-4 / Elige 1-4 / Выберите 1-4 / 选择 1-4"
        } while ($selection -notin @("1", "2", "3", "4"))

        $languages = @{ "1" = "es"; "2" = "en"; "3" = "ru"; "4" = "zh" }
        $config.lang = $languages[$selection]
        Save-Config $config
    }

    $language = [string]$config.lang

    $messages = @{
        es = @{
            heading = "Faltan requisitos para ejecutar KKeq:"
            question = "Descargar e instalar los requisitos faltantes en lib? [Y/N]"
            declined = "No se instalaron los requisitos."
            complete = "Requisitos instalados correctamente."
            error = "No se pudo completar la instalacion:"
            sources = "Fuentes oficiales:"
            nodeSource = "Node.js"
            ytDlpSource = "yt-dlp"
            ffmpegSource = "FFmpeg"
            downloading = "Descargando"
            node = "Descargando Node.js LTS portable..."
            nodeVersionError = "No se pudo determinar la version LTS de Node.js."
            ffmpegPackageError = "El paquete descargado de FFmpeg no contiene ffmpeg.exe y ffplay.exe."
            npm = "Instalando dependencias del proyecto..."
            npmError = "Fallo la instalacion de dependencias npm."
            missingFfmpegFile = "No se encontro {0} en el paquete de FFmpeg."
        }
        en = @{
            heading = "Requirements missing to run KKeq:"
            question = "Download and install missing requirements into lib? [Y/N]"
            declined = "Requirements were not installed."
            complete = "Requirements installed successfully."
            error = "Installation failed:"
            sources = "Official sources:"
            nodeSource = "Node.js"
            ytDlpSource = "yt-dlp"
            ffmpegSource = "FFmpeg"
            downloading = "Downloading"
            node = "Downloading portable Node.js LTS..."
            nodeVersionError = "Could not determine the current Node.js LTS release."
            ffmpegPackageError = "The downloaded FFmpeg package does not contain ffmpeg.exe and ffplay.exe."
            npm = "Installing project dependencies..."
            npmError = "npm install failed."
            missingFfmpegFile = "Could not find {0} in the FFmpeg package."
        }
        ru = @{
            heading = "Для запуска KKeq не хватает компонентов:"
            question = "Загрузить и установить отсутствующие компоненты в lib? [Y/N]"
            declined = "Компоненты не установлены."
            complete = "Компоненты успешно установлены."
            error = "Не удалось завершить установку:"
            sources = "Официальные источники:"
            nodeSource = "Node.js"
            ytDlpSource = "yt-dlp"
            ffmpegSource = "FFmpeg"
            downloading = "Загрузка"
            node = "Загрузка портативной версии Node.js LTS..."
            nodeVersionError = "Не удалось определить текущую версию Node.js LTS."
            ffmpegPackageError = "В загруженном пакете FFmpeg отсутствуют ffmpeg.exe и ffplay.exe."
            npm = "Установка зависимостей проекта..."
            npmError = "Не удалось выполнить npm install."
            missingFfmpegFile = "В пакете FFmpeg не найден файл {0}."
        }
        zh = @{
            heading = "缺少运行 KKeq 所需的组件："
            question = "下载并将缺少的组件安装到 lib？[Y/N]"
            declined = "未安装所需组件。"
            complete = "组件已成功安装。"
            error = "安装失败："
            sources = "官方来源："
            nodeSource = "Node.js"
            ytDlpSource = "yt-dlp"
            ffmpegSource = "FFmpeg"
            downloading = "正在下载"
            node = "正在下载便携版 Node.js LTS..."
            nodeVersionError = "无法确定当前的 Node.js LTS 版本。"
            ffmpegPackageError = "下载的 FFmpeg 压缩包中缺少 ffmpeg.exe 和 ffplay.exe。"
            npm = "正在安装项目依赖..."
            npmError = "npm install 执行失败。"
            missingFfmpegFile = "在 FFmpeg 压缩包中找不到 {0}。"
        }
    }
    $text = $messages[$language]

    $nodeExe = Join-Path $lib "node\node.exe"
    $npmCmd = Join-Path $lib "node\npm.cmd"
    $systemNode = Get-Command node -ErrorAction SilentlyContinue
    $systemNpm = Get-Command npm -ErrorAction SilentlyContinue
    $needLocalNode = (-not $systemNode -or -not $systemNpm) -and (-not (Test-Path $nodeExe) -or -not (Test-Path $npmCmd))

    $missing = [System.Collections.Generic.List[string]]::new()
    if (-not (Test-Path (Join-Path $lib "yt-dlp.exe"))) { $missing.Add("yt-dlp") }
    foreach ($name in @("ffmpeg.exe", "ffplay.exe", "ffprobe.exe")) {
        if (-not (Test-Path (Join-Path $lib $name))) { $missing.Add($name) }
    }
    if ($needLocalNode) { $missing.Add("Node.js LTS and npm") }
    if (-not (Test-Path (Join-Path $root "node_modules\tsx\dist\cli.mjs"))) { $missing.Add("KKeq npm dependencies") }

    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host $text.heading
        foreach ($item in $missing) { Write-Host "  - $item" }
        Write-Host ""
        Write-Host $text.sources
        Write-Host "  $($text.nodeSource): https://nodejs.org/en/download/"
        Write-Host "  $($text.ytDlpSource):  https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
        Write-Host "  $($text.ffmpegSource):  https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
        $answer = Read-Host $text.question
        if ($answer -notmatch "^(?i:y|yes|s|si|да|是)$") {
            Write-Host $text.declined
            exit 2
        }
    }

    if ($needLocalNode) {
        Write-Host $text.node
        $releases = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json"
        $release = $releases | Where-Object { $_.lts } | Select-Object -First 1
        if (-not $release) { throw $text.nodeVersionError }

        $nodeZipName = "node-$($release.version)-win-x64.zip"
        $nodeZip = Join-Path $temp $nodeZipName
        Download-File "https://nodejs.org/dist/$($release.version)/$nodeZipName" $nodeZip
        $nodeExtract = Join-Path $temp "node"
        Expand-Archive -LiteralPath $nodeZip -DestinationPath $nodeExtract -Force
        $nodeSource = Join-Path $nodeExtract "node-$($release.version)-win-x64"
        $nodeTarget = Join-Path $lib "node"
        New-Item -ItemType Directory -Force -Path $nodeTarget | Out-Null
        Copy-Item -Path (Join-Path $nodeSource "*") -Destination $nodeTarget -Recurse -Force
        $env:PATH = "$nodeTarget;$env:PATH"
        $nodeExe = Join-Path $nodeTarget "node.exe"
        $npmCmd = Join-Path $nodeTarget "npm.cmd"
    }

    $ytDlp = Join-Path $lib "yt-dlp.exe"
    if (-not (Test-Path $ytDlp)) {
        Download-File "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" $ytDlp
    }

    $missingFfmpeg = @("ffmpeg.exe", "ffplay.exe", "ffprobe.exe") | Where-Object {
        -not (Test-Path (Join-Path $lib $_))
    }
    if ($missingFfmpeg.Count -gt 0) {
        $ffmpegZip = Join-Path $temp "ffmpeg-release-essentials.zip"
        $ffmpegExtract = Join-Path $temp "ffmpeg"
        Download-File "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" $ffmpegZip
        Expand-Archive -LiteralPath $ffmpegZip -DestinationPath $ffmpegExtract -Force
        $binFolder = Get-ChildItem -LiteralPath $ffmpegExtract -Directory -Recurse |
            Where-Object { (Test-Path (Join-Path $_.FullName "ffmpeg.exe")) -and (Test-Path (Join-Path $_.FullName "ffplay.exe")) } |
            Select-Object -First 1
        if (-not $binFolder) { throw $text.ffmpegPackageError }

        foreach ($name in @("ffmpeg.exe", "ffplay.exe", "ffprobe.exe")) {
            $source = Join-Path $binFolder.FullName $name
            if (-not (Test-Path (Join-Path $lib $name))) {
                if (-not (Test-Path $source)) { throw ($text.missingFfmpegFile -f $name) }
                Copy-Item -LiteralPath $source -Destination (Join-Path $lib $name) -Force
            }
        }
    }

    if (-not (Test-Path (Join-Path $root "node_modules\tsx\dist\cli.mjs"))) {
        Write-Host $text.npm
        $npm = Get-Command npm -ErrorAction SilentlyContinue
        if ($npm) {
            & npm install --no-audit --no-fund
        }
        else {
            & $npmCmd install --no-audit --no-fund
        }
        if ($LASTEXITCODE -ne 0) { throw "$($text.npmError) Exit code: $LASTEXITCODE." }
    }

    Write-Host $text.complete
}
catch {
    Write-Error "$($text.error) $($_.Exception.Message)"
    exit 1
}
finally {
    if (Test-Path $temp) {
        Remove-Item -LiteralPath $temp -Recurse -Force
    }
}
